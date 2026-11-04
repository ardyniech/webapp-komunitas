// pb_hooks/konfigurasi.pb.js - Catat perubahan konfigurasi (Plan §5.7, §6.9 F)

onRecordBeforeUpdateRequest((e) => {
  const auth = e.httpContext.get("authRecord");
  if (!auth) throw new BadRequestError("Wajib login.");

  const dao = $app.dao();
  const old = dao.findRecordById("konfigurasi", e.record.id);
  const oldVal = JSON.stringify(old.get("nilai"));
  const newVal = JSON.stringify(e.record.get("nilai"));
  if (oldVal !== newVal) {
    try {
      const logCol = dao.findCollectionByNameOrId("log_aktivitas");
      const logRec = new Record(logCol);
      logRec.set("aktor", auth.id);
      logRec.set("aksi", "ubah_konfigurasi");
      logRec.set("target", e.record.get("kunci") + ": " + oldVal + " -> " + newVal);
      logRec.set("waktu", new Date().toISOString());
      dao.saveRecord(logRec);
    } catch (_) {}
    e.record.set("diubah_oleh", auth.id);
    e.record.set("diubah_pada", new Date().toISOString());
  }
}, "konfigurasi");
