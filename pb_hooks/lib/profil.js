// pb_hooks/lib/profil.js - Helper bersama untuk handler profil & anggota (Plan §5.8, §5.9, §6.11, §6.12)
//
// PocketBase serialisasi setiap handler ke runtime terisolasi, jadi file-scope
// helper (function di luar handler) TIDAK tersedia di dalam handler.
// Setiap handler memanggil `const lib = require("${__hooks}/lib/profil.js")`
// di awal, lalu pakai hanya lib + objek global PocketBase ($app, $apis, $security, Record, BadRequestError, dll).

// ── Utilitas dasar ──────────────────────────────────────────────────────────

function json(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback
  if (typeof value === "string") {
    try { return JSON.parse(value) } catch (_) { return fallback }
  }
  return value
}

function aman(value) {
  if (value === null || value === undefined) return ""
  return String(value).trim()
}

function sama(a, b) {
  return JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b)
}

// ── Label role ──────────────────────────────────────────────────────────────

function labelRole(role) {
  const map = {
    superadmin: "Superadmin",
    admin: "Admin",
    pengurus: "Pengurus",
    bendahara: "Bendahara",
    anggota: "Anggota"
  }
  return map[role] || "Anggota"
}

// ── Peringkat keterlihatan (anggota = 2, pengurus = 1, pribadi = 0) ─────────

function peringkat(nilai) {
  if (nilai === "anggota" || nilai === "semua") return 2
  if (nilai === "pengurus") return 1
  return 0
}

function namaDariPeringkat(peringkat) {
  if (peringkat >= 2) return "anggota"
  if (peringkat === 1) return "pengurus"
  return "pribadi"
}

// ── Tanggal ─────────────────────────────────────────────────────────────────

function normalisasiTanggal(value) {
  const teks = aman(value)
  if (!teks) return ""
  if (!/^\d{4}-\d{2}-\d{2}/.test(teks)) {
    throw new BadRequestError("Format tanggal tidak valid. Gunakan format YYYY-MM-DD.")
  }
  return teks.slice(0, 10) + " 00:00:00.000Z"
}

// ── Bidang kustom & visibilitas ─────────────────────────────────────────────

const STANDAR_PRIVASI = ["whatsapp", "domisili", "bio", "foto"]

function bidangAktif(dao) {
  try {
    return dao.findRecordsByFilter("bidang_profil", "aktif = true", "urutan", 200, 0, {}) || []
  } catch (_) {
    return []
  }
}

function validasiNilaiBidang(def, value) {
  if (value === undefined) return undefined
  if (value === null) return ""

  const tipe = def.get("tipe")
  if (tipe === "angka") {
    if (value === "") return ""
    const angka = Number(value)
    if (isNaN(angka) || !isFinite(angka)) {
      throw new BadRequestError("Bidang '" + def.get("label") + "' harus berupa angka.")
    }
    return angka
  }

  if (tipe === "tanggal") return normalisasiTanggal(value)

  if (tipe === "ya_tidak") {
    if (value === "" || value === null) return ""
    return value === true || value === "true" || value === 1 || value === "1"
  }

  if (tipe === "pilihan") {
    if (value === "") return ""
    const opsi = json(def.get("opsi"), []) || []
    if (opsi.indexOf(value) === -1) {
      throw new BadRequestError("Pilihan untuk bidang '" + def.get("label") + "' tidak valid.")
    }
    return value
  }

  return aman(value).slice(0, 2000)
}

function sanitasiKustom(e, old, dao, isManager) {
  const defs = bidangAktif(dao)
  const defMap = {}
  for (let i = 0; i < defs.length; i++) defMap[defs[i].get("kunci")] = defs[i]

  const lama = json(old.get("kustom"), {}) || {}
  const masuk = json(e.record.get("kustom"), {}) || {}
  const bersih = {}

  // Data bidang yang sudah dinonaktifkan tetap disimpan, tidak dihapus diam-diam.
  for (const kunci in lama) {
    if (!defMap[kunci]) bersih[kunci] = lama[kunci]
  }

  for (const kunci in masuk) {
    const def = defMap[kunci]
    if (!def) continue

    const nilaiBaru = validasiNilaiBidang(def, masuk[kunci])
    const berubah = !sama(lama[kunci], nilaiBaru)

    if (!isManager && berubah && def.get("bisa_diubah_anggota") !== true) {
      throw new BadRequestError("Bidang '" + (def.get("label") || kunci) + "' hanya bisa diubah pengurus.")
    }

    bersih[kunci] = nilaiBaru
  }

  return bersih
}

function sanitasiVisibilitas(e, old, defs) {
  const lama = json(old.get("visibilitas"), {}) || {}
  const masuk = json(e.record.get("visibilitas"), {}) || {}
  const bersih = {}

  for (let i = 0; i < STANDAR_PRIVASI.length; i++) {
    const kunci = STANDAR_PRIVASI[i]
    if (masuk[kunci] === undefined) continue
    const nilai = masuk[kunci] === "semua" ? "anggota" : masuk[kunci]
    bersih[kunci] = namaDariPeringkat(Math.min(peringkat(nilai), 2))
  }

  for (let i = 0; i < defs.length; i++) {
    const def = defs[i]
    const kunci = def.get("kunci")
    if (!kunci) continue

    const batas = peringkat(def.get("terlihat_oleh"))
    let diminta = masuk[kunci]
    if (diminta === undefined) diminta = lama[kunci]
    const peringkatNilai = Math.min(peringkat(diminta), batas)
    bersih[kunci] = namaDariPeringkat(peringkatNilai)
  }

  return bersih
}

function jumlahAdminLain(dao, kecualiId) {
  try {
    const list = dao.findRecordsByFilter('users', '(role = "admin" || role = "superadmin") && status = "aktif"', "", 500, 0, {}) || []
    let jumlah = 0
    for (let i = 0; i < list.length; i++) {
      if (list[i].id !== kecualiId) jumlah++
    }
    return jumlah
  } catch (_) {
    return 0
  }
}

// ── Izin & manajemen anggota ────────────────────────────────────────────────

function bolehKelolaAnggota(auth) {
  if (!auth) return false
  const role = auth.get("role")
  if (role === "superadmin" || role === "admin") return true
  const izin = json(auth.get("izin"), []) || []
  return izin.indexOf("kelola_anggota") !== -1
}

function bolehSahkan(auth) {
  if (!auth) return false
  const role = auth.get("role")
  if (role === "superadmin" || role === "admin") return true
  const izin = json(auth.get("izin"), []) || []
  return izin.indexOf("sahkan_pendaftaran") !== -1
}

// ── Log aktivitas ───────────────────────────────────────────────────────────

function catatLog(auth, aksi, target) {
  try {
    const dao = $app.dao()
    const col = dao.findCollectionByNameOrId("log_aktivitas")
    const rec = new Record(col)
    rec.set("aktor", auth ? auth.id : null)
    rec.set("aksi", aksi)
    rec.set("target", target)
    rec.set("waktu", new Date().toISOString())
    dao.saveRecord(rec)
  } catch (_) {}
}

// ── Sinkron profil_publik ───────────────────────────────────────────────────

function ringkasJabatan(userId, dao) {
  const jabatanNames = []
  const unitNames = []

  try {
    const list = dao.findRecordsByFilter("jabatan", "anggota = {:u} && aktif = true", "created", 20, 0, { u: userId }) || []
    for (let i = 0; i < list.length; i++) {
      const nama = aman(list[i].get("jabatan"))
      if (nama && jabatanNames.indexOf(nama) === -1) jabatanNames.push(nama)

      let unit = null
      try { unit = dao.findRecordById("unit", list[i].get("unit")) } catch (_) {}
      if (unit) {
        const namaUnit = aman(unit.get("nama"))
        if (namaUnit && unitNames.indexOf(namaUnit) === -1) unitNames.push(namaUnit)
      }
    }
  } catch (_) {}

  return {
    jabatan: jabatanNames.join(", ").slice(0, 150),
    unit: unitNames.join(", ").slice(0, 150)
  }
}

function bidangTerlihat(user, dao) {
  const hasil = {}
  const visibilitas = json(user.get("visibilitas"), {}) || {}

  for (let i = 0; i < STANDAR_PRIVASI.length; i++) {
    const kunci = STANDAR_PRIVASI[i]
    if (visibilitas[kunci] !== "anggota" && visibilitas[kunci] !== "semua") continue
    const nilai = aman(user.get(kunci))
    if (nilai) hasil[kunci] = nilai
  }

  // Tanggal gabung bukan data sensitif dan membantu profil terasa hidup.
  const tanggalGabung = aman(user.get("tanggal_gabung"))
  if (tanggalGabung) hasil.tanggal_gabung = tanggalGabung

  // Bidang kustom: hanya yang batas keterlihatannya "anggota" dan dipilih anggota.
  const kustom = json(user.get("kustom"), {}) || {}
  try {
    const defs = bidangAktif(dao)
    for (let i = 0; i < defs.length; i++) {
      const def = defs[i]
      const kunci = def.get("kunci")
      if (!kunci) continue
      if (def.get("terlihat_oleh") !== "anggota") continue
      if (visibilitas[kunci] !== "anggota" && visibilitas[kunci] !== "semua") continue
      const nilai = kustom[kunci]
      if (nilai === undefined || nilai === null || nilai === "") continue
      hasil[kunci] = nilai
    }
  } catch (_) {}

  return hasil
}

function sinkron(userId, dao) {
  if (!userId) return
  try {
    let user = null
    try { user = dao.findRecordById("users", userId) } catch (_) { return }

    const publikCol = dao.findCollectionByNameOrId("profil_publik")
    let publik = null
    try { publik = dao.findFirstRecordByData("profil_publik", "user", userId) } catch (_) {}

    if (!publik) {
      publik = new Record(publikCol)
      publik.set("user", userId)
    }

    const nama = aman(user.get("nama")) || aman(user.get("name")) || aman(user.getUsername())
    const namaTampil = aman(user.get("nama_panggilan")) || nama || "Anggota"
    const ringkas = ringkasJabatan(userId, dao)

    publik.set("nama_tampil", namaTampil.slice(0, 200))
    publik.set("role_ringkas", labelRole(user.get("role")))
    publik.set("aktif", user.get("status") === "aktif")
    publik.set("jabatan_ringkas", ringkas.jabatan)
    publik.set("unit_ringkas", ringkas.unit)
    publik.set("bidang_terlihat", bidangTerlihat(user, dao))

    dao.saveRecord(publik)
  } catch (err) {
    // Sinkronisasi profil publik tidak boleh menggagalkan operasi utama.
  }
}

function sinkronSemua(dao) {
  try {
    const users = dao.findRecordsByFilter("users", "", "created", 500, 0, {}) || []
    for (let i = 0; i < users.length; i++) sinkron(users[i].id, dao)
  } catch (_) {}
}

function sinkronProfilMinimal(user, dao) {
  try {
    const col = dao.findCollectionByNameOrId("profil_publik")
    let publik = null
    try { publik = dao.findFirstRecordByData("profil_publik", "user", user.id) } catch (_) {}
    if (!publik) {
      publik = new Record(col)
      publik.set("user", user.id)
    }

    const nama = aman(user.get("nama")) || aman(user.get("name")) || aman(user.getUsername())
    const namaTampil = aman(user.get("nama_panggilan")) || nama || "Anggota"
    publik.set("nama_tampil", namaTampil.slice(0, 200))
    publik.set("role_ringkas", labelRole(user.get("role")))
    publik.set("aktif", user.get("status") === "aktif")
    publik.set("bidang_terlihat", { tanggal_gabung: aman(user.get("tanggal_gabung")) })
    dao.saveRecord(publik)
  } catch (_) {}
}

// ── Export untuk require() ──────────────────────────────────────────────────

module.exports = {
  json,
  aman,
  sama,
  labelRole,
  peringkat,
  namaDariPeringkat,
  normalisasiTanggal,
  STANDAR_PRIVASI,
  bidangAktif,
  validasiNilaiBidang,
  sanitasiKustom,
  sanitasiVisibilitas,
  jumlahAdminLain,
  bolehKelolaAnggota,
  bolehSahkan,
  catatLog,
  sinkron,
  sinkronSemua,
  sinkronProfilMinimal,
  ringkasJabatan,
  bidangTerlihat
}
