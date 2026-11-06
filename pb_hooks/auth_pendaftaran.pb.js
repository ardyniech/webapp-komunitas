// pb_hooks/auth_pendaftaran.pb.js - Pendaftaran Anggota Baru & Cek Status (Plan §6.12)

// ── Hook: Blokir login untuk user yang statusnya bukan 'aktif' (Section 5 & 6.12)
onRecordAuthRequest((e) => {
  const status = e.record.get("status")
  if (status !== "aktif") {
    throw new BadRequestError("Maaf bro, akun kamu saat ini berstatus '" + status + "' dan belum dapat masuk. Hubungi admin basecamp ya!")
  }
}, "users")

// ── Route: pendaftaran anggota baru ────────────────────────────────────────
routerAdd("POST", "/api/komunitas/daftar", (c) => {
  const lib = require(`${__hooks}/lib/profil.js`)
  try {
    const data = $apis.requestInfo(c).data

    // Honeypot bot protection
    if (data.website || data.url || data.fax) {
      return c.json(400, { error: "Spam detected." })
    }

    const dao = $app.dao()

    // Hormati saklar pendaftaran di konfigurasi.
    try {
      const buka = dao.findFirstRecordByData("konfigurasi", "kunci", "pendaftaran_dibuka")
      if (lib.json(buka.get("nilai"), true) === false) {
        return c.json(403, { error: "Pendaftaran anggota sedang ditutup. Hubungi pengurus basecamp ya bro." })
      }
      const mode = dao.findFirstRecordByData("konfigurasi", "kunci", "mode_pendaftaran")
      if (lib.aman(lib.json(mode.get("nilai"), "")) === "tertutup") {
        return c.json(403, { error: "Pendaftaran mandiri sedang ditutup. Akun dibuat oleh admin basecamp." })
      }
    } catch (_) {}

    const nama = lib.aman(data.nama_lengkap)
    const whatsapp = lib.aman(data.whatsapp).replace(/[^0-9]/g, "")
    const domisili = lib.aman(data.domisili)
    const password = lib.aman(data.password)
    const alasan = lib.aman(data.alasan_bergabung)
    const email = lib.aman(data.email).toLowerCase()
    const setuju = data.setuju_privasi === true || data.setuju_aturan === true

    if (!nama || !whatsapp || !password || !email) {
      return c.json(400, { error: "Nama lengkap, nomor WhatsApp, email, dan password wajib diisi!" })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json(400, { error: "Format email tidak valid. Gunakan email aktif yang bisa kamu buka." })
    }
    if (whatsapp.length < 9) {
      return c.json(400, { error: "Nomor WhatsApp kelihatannya belum lengkap." })
    }
    if (password.length < 8) {
      return c.json(400, { error: "Password minimal 8 karakter demi keamanan!" })
    }
    if (!setuju) {
      return c.json(400, { error: "Persetujuan aturan basecamp & privasi wajib dicentang!" })
    }

    // Cek duplikat nomor WhatsApp & email (email = identitas login).
    try {
      const existingUser = dao.findFirstRecordByData("users", "whatsapp", whatsapp)
      if (existingUser) {
        return c.json(400, { error: "Nomor WhatsApp ini sudah terdaftar sebagai anggota!" })
      }
    } catch (_) {}
    try {
      const existingEmail = dao.findFirstRecordByData("users", "email", email)
      if (existingEmail) {
        return c.json(400, { error: "Email ini sudah terdaftar. Gunakan email lain atau masuk dengan email tersebut." })
      }
    } catch (_) {}

    if (!data.kode_undangan) {
      // mode dengan undangan belum dipaksakan di sini; admin tetap mengesahkan.
    }

    // Username diturunkan dari bagian lokal email (mudah diingat), bukan dari WA.
    const localpart = email.split("@")[0].replace(/[^a-z0-9]/gi, "").toLowerCase();
    let cleanUsername = (localpart || "usr").slice(0, 20);
    for (let i = 0; i < 3; i++) {
      try {
        const cek = dao.findFirstRecordByData("users", "username", cleanUsername)
        if (!cek) break
        cleanUsername = (localpart || "usr").slice(0, 12) + "_" + Math.floor(Math.random() * 10000)
      } catch (_) { break }
    }

    const kodeCek = "REG-" + Math.random().toString(36).substring(2, 8).toUpperCase()
    const sekarang = new Date().toISOString()

    const usersCol = dao.findCollectionByNameOrId("users")
    const user = new Record(usersCol)
    user.setUsername(cleanUsername)
    user.setEmail(email)
    user.setPassword(password)
    user.set("nama", nama)
    user.set("kontak", whatsapp)
    user.set("whatsapp", whatsapp)
    user.set("domisili", domisili)
    user.set("role", "anggota")
    user.set("status", "menunggu")
    user.set("setuju_privasi_pada", sekarang)
    dao.saveRecord(user)
    lib.sinkronProfilMinimal(user, dao)

  try {
      const notif = require(`${__hooks}/lib/notif.js`);
      notif.keAdmin(dao, "pendaftaran_baru", "Pendaftaran baru menunggu verifikasi",
        "Ada pendaftaran anggota baru (" + nama + ") yang menunggu persetujuan kamu.", "anggota");
    } catch (_) {}
    try {
      const pendaftaranCol = dao.findCollectionByNameOrId("pendaftaran")
      const pendaftaran = new Record(pendaftaranCol)
      pendaftaran.set("user", user.id)
      pendaftaran.set("nama_lengkap", nama)
      pendaftaran.set("whatsapp", whatsapp)
      pendaftaran.set("domisili", domisili)
      pendaftaran.set("alasan_bergabung", alasan)
      pendaftaran.set("setuju_privasi", true)
      pendaftaran.set("status", "menunggu")
      pendaftaran.set("kode_cek", kodeCek)
      if (data.jawaban_kustom) pendaftaran.set("jawaban_kustom", data.jawaban_kustom)
      dao.saveRecord(pendaftaran)
    } catch (err) {
      return c.json(500, { error: "Akun dibuat, tetapi catatan pendaftaran gagal disimpan: " + err.message })
    }

    return c.json(200, {
      success: true,
      username: cleanUsername,
      email: email,
      kode_cek: kodeCek,
      message: "Pendaftaran berhasil diajukan! Simpan kode cek untuk memantau persetujuan admin. Setelah disetujui admin, masuk dengan EMAIL kamu (bukan username) + password yang dibuat."
    })
  } catch (err) {
    return c.json(500, { error: "Gagal memproses pendaftaran: " + err.message })
  }
})

routerAdd("GET", "/api/komunitas/status/:kode", (c) => {
  const lib = require(`${__hooks}/lib/profil.js`)
  try {
    const kodeBersih = lib.aman(c.pathParam("kode")).toUpperCase()
    if (!kodeBersih) return c.json(400, { error: "Kode pendaftaran wajib diisi." })

    const dao = $app.dao()
    let pendaftaran = null
    try {
      pendaftaran = dao.findFirstRecordByData("pendaftaran", "kode_cek", kodeBersih)
    } catch (e) {
      return c.json(404, { error: "Kode pendaftaran tidak ditemukan. Cek kembali kode kamu ya bro!" })
    }

    let username = ""
    try {
      const user = dao.findRecordById("users", pendaftaran.get("user"))
      username = user.get("username") || user.getUsername()
    } catch (_) {}

    return c.json(200, {
      status: pendaftaran.get("status"),
      nama_lengkap: pendaftaran.get("nama_lengkap"),
      whatsapp: pendaftaran.get("whatsapp"),
      username: username,
      catatan_admin: pendaftaran.get("catatan_admin") || "",
      alasan_penolakan: pendaftaran.get("alasan_penolakan") || "",
      diproses_pada: pendaftaran.get("diproses_pada") || ""
    })
  } catch (err) {
    return c.json(500, { error: "Terjadi kesalahan sistem: " + err.message })
  }
})

// Alias lama agar tautan yang sudah beredar tetap hidup.
routerAdd("GET", "/api/komunitas/cek-status", (c) => {
  const lib = require(`${__hooks}/lib/profil.js`)
  try {
    const kodeBersih = lib.aman(c.queryParam("kode")).toUpperCase()
    if (!kodeBersih) return c.json(400, { error: "Kode pendaftaran wajib diisi." })

    const dao = $app.dao()
    let pendaftaran = null
    try {
      pendaftaran = dao.findFirstRecordByData("pendaftaran", "kode_cek", kodeBersih)
    } catch (e) {
      return c.json(404, { error: "Kode pendaftaran tidak ditemukan. Cek kembali kode kamu ya bro!" })
    }

    let username = ""
    try {
      const user = dao.findRecordById("users", pendaftaran.get("user"))
      username = user.get("username") || user.getUsername()
    } catch (_) {}

    return c.json(200, {
      status: pendaftaran.get("status"),
      nama_lengkap: pendaftaran.get("nama_lengkap"),
      whatsapp: pendaftaran.get("whatsapp"),
      username: username,
      catatan_admin: pendaftaran.get("catatan_admin") || "",
      alasan_penolakan: pendaftaran.get("alasan_penolakan") || "",
      diproses_pada: pendaftaran.get("diproses_pada") || ""
    })
  } catch (err) {
    return c.json(500, { error: "Terjadi kesalahan sistem: " + err.message })
  }
})

// ── Route: admin/pemegang izin proses verifikasi pendaftaran ───────────────
routerAdd("POST", "/api/komunitas/pendaftaran/:id/proses", (c) => {
  const lib = require(`${__hooks}/lib/profil.js`)
  try {
    const info = $apis.requestInfo(c)
    const adminUser = info.authRecord
    if (!lib.bolehSahkan(adminUser)) {
      return c.json(403, { error: "Hanya admin atau pemegang izin sahkan_pendaftaran yang berhak memproses pendaftaran!" })
    }

    const id = c.pathParam("id")
    const data = info.data
    const aksi = lib.aman(data.aksi)
    const catatan = lib.aman(data.catatan)

    const dao = $app.dao()
    const pendaftaran = dao.findRecordById("pendaftaran", id)
    const userId = pendaftaran.get("user")
    const user = dao.findRecordById("users", userId)
    const statusLama = pendaftaran.get("status")

    if (statusLama === "disetujui" || statusLama === "ditolak") {
      return c.json(400, { error: "Pendaftaran ini sudah diproses sebelumnya." })
    }

    const sekarang = new Date().toISOString()

    if (aksi === "setujui") {
      user.set("status", "aktif")
      const roleSekarang = user.get("role")
      if (!roleSekarang || roleSekarang === "anggota") user.set("role", "anggota")
      if (!user.get("tanggal_gabung")) user.set("tanggal_gabung", sekarang)
      dao.saveRecord(user)

      pendaftaran.set("status", "disetujui")
      pendaftaran.set("diproses_oleh", adminUser.id)
      pendaftaran.set("diproses_pada", sekarang)
      pendaftaran.set("catatan_admin", catatan)
      dao.saveRecord(pendaftaran)

      lib.sinkronProfilMinimal(user, dao)
      try {
        const notif = require(`${__hooks}/lib/notif.js`);
        notif.kirim($app.dao(), userId, "pendaftaran_disetujui", "Pendaftaran kamu disetujui. Selamat gabung!",
          "Akun kamu sudah aktif. Kamu bisa masuk memakai email + password yang dibuat saat mendaftar.", "profil");
      } catch (_) {}
      lib.catatLog(adminUser.id, "setujui_pendaftaran", pendaftaran.id + " | user: " + userId)
      return c.json(200, { success: true, message: "Pendaftaran disetujui, akun anggota telah aktif!" })
    }

    if (aksi === "tolak") {
      if (!catatan) return c.json(400, { error: "Alasan penolakan wajib diisi." })

      user.set("status", "ditolak")
      dao.saveRecord(user)

      pendaftaran.set("status", "ditolak")
      pendaftaran.set("diproses_oleh", adminUser.id)
      pendaftaran.set("diproses_pada", sekarang)
      pendaftaran.set("alasan_penolakan", catatan)
      dao.saveRecord(pendaftaran)

      lib.catatLog(adminUser.id, "tolak_pendaftaran", pendaftaran.id + " | user: " + userId)
      return c.json(200, { success: true, message: "Pendaftaran telah ditolak." })
    }

    if (aksi === "minta_data") {
      if (!catatan) return c.json(400, { error: "Tuliskan data tambahan yang dibutuhkan." })

      pendaftaran.set("status", "perlu_data_tambahan")
      pendaftaran.set("catatan_admin", catatan)
      pendaftaran.set("diproses_oleh", adminUser.id)
      pendaftaran.set("diproses_pada", sekarang)
      dao.saveRecord(pendaftaran)

      lib.catatLog(adminUser.id, "minta_data_pendaftaran", pendaftaran.id + " | user: " + userId)
      return c.json(200, { success: true, message: "Permintaan data tambahan sudah dicatat." })
    }

    return c.json(400, { error: "Aksi tidak valid (gunakan 'setujui', 'tolak', atau 'minta_data')." })
  } catch (err) {
    return c.json(500, { error: "Gagal memproses pendaftaran: " + err.message })
  }
})
