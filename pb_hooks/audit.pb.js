// pb_hooks/audit.pb.js - Catatan aksi penting ke log_aktivitas (Plan §5.7, §6.10)

function logSama(a, b) {
  return JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b)
}

// Perubahan status event
onRecordBeforeUpdateRequest((e) => {
  const lib = require(`${__hooks}/lib/profil.js`)
  const dao = $app.dao();
  const old = dao.findRecordById("event", e.record.id);
  if (old.get("status") !== e.record.get("status")) {
    const auth = e.httpContext.get("authRecord");
    lib.catatLog(auth, "ubah_status_event", e.record.id + ": " + old.get("status") + " -> " + e.record.get("status"));
  }
}, "event");

// Penunjukan/penggantian ketua pelaksana
onRecordBeforeUpdateRequest((e) => {
  const lib = require(`${__hooks}/lib/profil.js`)
  const dao = $app.dao();
  const old = dao.findRecordById("event", e.record.id);
  if (old.get("ketua_pelaksana") !== e.record.get("ketua_pelaksana")) {
    const auth = e.httpContext.get("authRecord");
    lib.catatLog(auth, "tunjuk_ketua_event", e.record.id + ": " + old.get("ketua_pelaksana") + " -> " + e.record.get("ketua_pelaksana"));
  }
}, "event");

// Keputusan pendaftaran
onRecordBeforeUpdateRequest((e) => {
  const lib = require(`${__hooks}/lib/profil.js`)
  // pendaftaran status changes handled via route, but direct updates log too
  const auth = e.httpContext.get("authRecord");
  lib.catatLog(auth, "ubah_pendaftaran", e.record.id);
}, "pendaftaran");

// Perubahan data anggota oleh pihak lain. Catat NAMA FIELD saja, bukan nilainya.
onRecordBeforeUpdateRequest((e) => {
  const lib = require(`${__hooks}/lib/profil.js`)
  const auth = e.httpContext.get("authRecord");
  if (!auth || auth.id === e.record.id) return;

  const dao = $app.dao();
  let old = null;
  try { old = dao.findRecordById("users", e.record.id); } catch (_) { return; }

  const dipantau = [
    "nama", "nama_panggilan", "whatsapp", "domisili", "tanggal_lahir", "bio",
    "kontak_darurat_nama", "kontak_darurat_telepon", "kustom", "visibilitas",
    "role", "status", "tim", "tanggal_gabung", "email", "username", "foto"
  ];

  const berubah = [];
  for (let i = 0; i < dipantau.length; i++) {
    const field = dipantau[i];
    if (!lib.sama(old.get(field), e.record.get(field))) berubah.push(field);
  }

  if (berubah.length === 0) return;

  lib.catatLog(auth, "ubah_data_anggota", e.record.id + ": " + berubah.join(", "));

  if (!lib.sama(old.get("role"), e.record.get("role"))) {
    lib.catatLog(auth, "ubah_role_anggota", e.record.id + ": role");
  }
  if (!lib.sama(old.get("status"), e.record.get("status"))) {
    lib.catatLog(auth, "ubah_status_anggota", e.record.id + ": status");
  }
}, "users");
