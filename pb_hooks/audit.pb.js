// pb_hooks/audit.pb.js - Catatan aksi penting ke log_aktivitas (Plan §5.7, §6.10)

function logAktivitas(auth, aksi, target) {
  try {
    const dao = $app.dao();
    const col = dao.findCollectionByNameOrId("log_aktivitas");
    const rec = new Record(col);
    rec.set("aktor", auth ? auth.id : null);
    rec.set("aksi", aksi);
    rec.set("target", target);
    rec.set("waktu", new Date().toISOString());
    dao.saveRecord(rec);
  } catch (_) {}
}

// Perubahan status event
onRecordBeforeUpdateRequest((e) => {
  const dao = $app.dao();
  const old = dao.findRecordById("event", e.record.id);
  if (old.get("status") !== e.record.get("status")) {
    const auth = e.httpContext.get("authRecord");
    logAktivitas(auth, "ubah_status_event", e.record.id + ": " + old.get("status") + " -> " + e.record.get("status"));
  }
}, "event");

// Penunjukan/penggantian ketua pelaksana
onRecordBeforeUpdateRequest((e) => {
  const dao = $app.dao();
  const old = dao.findRecordById("event", e.record.id);
  if (old.get("ketua_pelaksana") !== e.record.get("ketua_pelaksana")) {
    const auth = e.httpContext.get("authRecord");
    logAktivitas(auth, "tunjuk_ketua_event", e.record.id + ": " + old.get("ketua_pelaksana") + " -> " + e.record.get("ketua_pelaksana"));
  }
}, "event");

// Keputusan pendaftaran
onRecordBeforeUpdateRequest((e) => {
  // pendaftaran status changes handled via route, but direct updates log too
  const auth = e.httpContext.get("authRecord");
  logAktivitas(auth, "ubah_pendaftaran", e.record.id);
}, "pendaftaran");
