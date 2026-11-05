// pb_hooks/profil_publik.pb.js - Sinkronisasi Profil Publik Aman (Plan §5.8, §5.9, §6.11)
//
// Aturan penting:
// - Collection users TIDAK dibaca langsung oleh anggota lain.
// - Semua data yang boleh dilihat anggota lain disalin ke profil_publik.
// - Bidang hanya masuk bidang_terlihat jika anggota memilih "anggota" (atau legacy "semua")
//   DAN batas keterlihatan bidang mengizinkan "anggota".
//
// Setiap handler diisolasi runtime-nya, jadi helper diambil lewat require() dari
// pb_hooks/lib/profil.js di awal setiap handler.

// ── Hook users ─────────────────────────────────────────────────────────────
onRecordAfterCreateRequest((e) => {
  const lib = require(`${__hooks}/lib/profil.js`)
  lib.sinkron(e.record.id, $app.dao())
}, "users")

onRecordAfterUpdateRequest((e) => {
  const lib = require(`${__hooks}/lib/profil.js`)
  lib.sinkron(e.record.id, $app.dao())
}, "users")

// ── Hook jabatan: nama jabatan / unit berubah ──────────────────────────────
onRecordAfterCreateRequest((e) => {
  const lib = require(`${__hooks}/lib/profil.js`)
  lib.sinkron(e.record.get("anggota"), $app.dao())
}, "jabatan")

onRecordAfterUpdateRequest((e) => {
  const lib = require(`${__hooks}/lib/profil.js`)
  lib.sinkron(e.record.get("anggota"), $app.dao())
}, "jabatan")

onRecordAfterDeleteRequest((e) => {
  const lib = require(`${__hooks}/lib/profil.js`)
  try { lib.sinkron(e.record.get("anggota"), $app.dao()) } catch (_) {}
}, "jabatan")

// ── Hook bidang_profil: batas keterlihatan berubah -> hitung ulang semua ───
onRecordAfterCreateRequest((e) => {
  const lib = require(`${__hooks}/lib/profil.js`)
  lib.sinkronSemua($app.dao())
}, "bidang_profil")

onRecordAfterUpdateRequest((e) => {
  const lib = require(`${__hooks}/lib/profil.js`)
  lib.sinkronSemua($app.dao())
}, "bidang_profil")

onRecordAfterDeleteRequest((e) => {
  const lib = require(`${__hooks}/lib/profil.js`)
  lib.sinkronSemua($app.dao())
}, "bidang_profil")

// ── Backfill saat server start (aman untuk data lama) ──────────────────────
onAfterBootstrap((e) => {
  const lib = require(`${__hooks}/lib/profil.js`)
  try {
    lib.sinkronSemua($app.dao())
  } catch (err) {}
})

// ── Route bantu untuk admin: paksa sinkron ulang ───────────────────────────
routerAdd("POST", "/api/komunitas/sync-profil-publik", (c) => {
  const lib = require(`${__hooks}/lib/profil.js`)
  try {
    const auth = $apis.requestInfo(c).authRecord
    if (!auth) return c.json(401, { error: "Wajib login." })
    if (!lib.bolehKelolaAnggota(auth)) {
      return c.json(403, { error: "Hanya pengelola anggota yang boleh menyinkronkan profil publik." })
    }

    lib.sinkronSemua($app.dao())
    return c.json(200, { success: true, message: "Profil publik seluruh anggota sudah disinkronkan." })
  } catch (err) {
    return c.json(500, { error: "Gagal sinkron profil publik: " + err.message })
  }
})
