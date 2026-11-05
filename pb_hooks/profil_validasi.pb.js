// pb_hooks/profil_validasi.pb.js - Validasi perubahan profil anggota (Plan §5.8, §5.9, §6.11)
//
// Prinsip:
// - Anggota hanya boleh mengubah dirinya sendiri.
// - Field sistem (role, tim, status, tanggal gabung, email, username, verified) hanya manajer.
// - Field izin selalu dihitung hook lain, tidak boleh diubah lewat API.
// - Bidang kustom divalidasi terhadap definisi bidang_profil.
// - Privasi dibatasi oleh terlihat_oleh milik tiap bidang.
//
// Setiap handler diisolasi runtime-nya, jadi helper diambil lewat require() dari
// pb_hooks/lib/profil.js di awal setiap handler.

// ── Hook: validasi sebelum update users ─────────────────────────────────────
onRecordBeforeUpdateRequest((e) => {
  const lib = require(`${__hooks}/lib/profil.js`)
  const SISTEM = ["username", "email", "role", "tim", "status", "tanggal_gabung", "verified"]
  try {
    const auth = e.httpContext.get("authRecord")
    if (!auth) throw new BadRequestError("Wajib login untuk mengubah profil.")

    const dao = $app.dao()
    const old = dao.findRecordById("users", e.record.id)
    const izin = lib.json(auth.get("izin"), []) || []
    const roleAuth = auth.get("role")

    const isSuperadmin = roleAuth === "superadmin"
    const isManager = isSuperadmin || roleAuth === "admin" || lib.bolehKelolaAnggota(auth)
    const isSelf = auth.id === e.record.id

    if (!isSelf && !isManager) {
      throw new BadRequestError("Tidak boleh mengubah profil anggota lain.")
    }

    // Izin & tokenKey selalu dikelola server/hook, bukan lewat PATCH biasa.
    if (!lib.sama(old.get("izin"), e.record.get("izin"))) {
      throw new BadRequestError("Izin anggota dihitung otomatis oleh sistem dan tidak bisa diubah langsung.")
    }
    if (!lib.sama(old.get("tokenKey"), e.record.get("tokenKey"))) {
      throw new BadRequestError("Gunakan tombol 'Keluar dari Semua Perangkat' untuk mencabut sesi.")
    }

    // Hanya superadmin yang boleh menyentuh akun superadmin lain.
    if (old.get("role") === "superadmin" && !isSuperadmin && !isSelf) {
      throw new BadRequestError("Akun superadmin hanya bisa diubah oleh superadmin.")
    }

    if (!isManager) {
      for (let i = 0; i < SISTEM.length; i++) {
        const field = SISTEM[i]
        if (!lib.sama(old.get(field), e.record.get(field))) {
          throw new BadRequestError("Field '" + field + "' hanya bisa diubah pengurus.")
        }
      }
      // Timestamp privat selalu diisi server.
      e.record.set("setuju_privasi_pada", old.get("setuju_privasi_pada"))
    } else {
      if (e.record.get("role") === "superadmin" && !isSuperadmin) {
        throw new BadRequestError("Hanya superadmin yang bisa memberikan role superadmin.")
      }
      if (!isSuperadmin && old.get("role") === "superadmin") {
        throw new BadRequestError("Hanya superadmin yang bisa mengubah role superadmin.")
      }
    }

    // Minimal satu admin aktif harus selalu tersisa.
    const roleLama = old.get("role")
    const statusLama = old.get("status")
    const roleBaru = e.record.get("role")
    const statusBaru = e.record.get("status")
    const adminLama = (roleLama === "admin" || roleLama === "superadmin") && statusLama === "aktif"
    const adminBaru = (roleBaru === "admin" || roleBaru === "superadmin") && statusBaru === "aktif"
    if (adminLama && !adminBaru && lib.jumlahAdminLain(dao, old.id) === 0) {
      throw new BadRequestError("Tidak bisa menurunkan admin terakhir. Angkat admin lain dulu ya bro.")
    }

    const defs = lib.bidangAktif(dao)
    e.record.set("kustom", lib.sanitasiKustom(e, old, dao, isManager))
    e.record.set("visibilitas", lib.sanitasiVisibilitas(e, old, defs))

    if (isSelf) {
      const nama = lib.aman(e.record.get("nama"))
      const wa = lib.aman(e.record.get("whatsapp")) || lib.aman(e.record.get("kontak"))
      if (nama && wa) e.record.set("profil_dilengkapi_pada", new Date().toISOString())
    }
  } catch (err) {
    if (err instanceof BadRequestError) throw err
    throw new BadRequestError("Gagal memvalidasi perubahan profil: " + err.message)
  }
}, "users")

// ── Route: keluar dari semua perangkat ─────────────────────────────────────
routerAdd("POST", "/api/komunitas/logout-all", (c) => {
  const lib = require(`${__hooks}/lib/profil.js`)
  try {
    const auth = $apis.requestInfo(c).authRecord
    if (!auth) return c.json(401, { error: "Wajib login." })

    const dao = $app.dao()
    const user = dao.findRecordById("users", auth.id)
    let tokenBaru = ""
    try { tokenBaru = $security.randomString(40) } catch (_) {}
    if (!tokenBaru) {
      tokenBaru = "tk_" + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
    }
    user.set("tokenKey", tokenBaru)
    dao.saveRecord(user)

    lib.catatLog(auth, "logout_all", "user:" + auth.id)

    return c.json(200, {
      success: true,
      message: "Semua sesi login di perangkat lain sudah dicabut."
    })
  } catch (err) {
    return c.json(500, { error: "Gagal mencabut sesi: " + err.message })
  }
})

// ── Route: ajukan penghapusan data pribadi (Plan §6.10 butir 2) ─────────────
routerAdd("POST", "/api/komunitas/permintaan-hapus-data", (c) => {
  const lib = require(`${__hooks}/lib/profil.js`)
  try {
    const auth = $apis.requestInfo(c).authRecord
    if (!auth) return c.json(401, { error: "Wajib login." })

    const data = $apis.requestInfo(c).data || {}
    const catatan = lib.aman(data.catatan).slice(0, 500)
    const dao = $app.dao()

    let masaTunggu = 30
    try {
      const konf = dao.findFirstRecordByData("konfigurasi", "kunci", "masa_tunggu_hapus_data_pribadi_hari")
      const nilai = Number(lib.json(konf.get("nilai"), 30))
      if (!isNaN(nilai) && nilai >= 0) masaTunggu = nilai
    } catch (_) {}

    try {
      const col = dao.findCollectionByNameOrId("log_aktivitas")
      const log = new Record(col)
      log.set("aktor", auth.id)
      log.set("aksi", "permintaan_hapus_data")
      log.set("target", auth.id + (catatan ? " | catatan: " + catatan : ""))
      log.set("waktu", new Date().toISOString())
      dao.saveRecord(log)
    } catch (_) {}

    return c.json(200, {
      success: true,
      masa_tunggu_hari: masaTunggu,
      message: "Permintaan penghapusan data dicatat. Pengurus akan menghubungi kamu dalam " + masaTunggu + " hari."
    })
  } catch (err) {
    return c.json(500, { error: "Gagal mencatat permintaan hapus data: " + err.message })
  }
})
