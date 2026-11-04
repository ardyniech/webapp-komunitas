// pb_hooks/sync_izin.pb.js - Backfill izin & tim untuk semua user (Plan §6.13 D)

routerAdd("POST", "/api/komunitas/sync-izin", (c) => {
  const auth = $apis.requestInfo(c).authRecord;
  if (!auth || auth.get("role") !== "admin") {
    return c.json(403, { error: "Hanya admin." });
  }
  const dao = $app.dao();
  let count = 0;
  try {
    const users = dao.findRecordsByFilter("users", "id != ''", "", 500, 0, {});
    (users || []).forEach(u => {
      // compute izin
      const role = u.get("role");
      const izinSet = {};
      let tim = [];
      try {
        const roleMaps = dao.findRecordsByFilter("pemetaan_izin", "pemegang_tipe = 'role' && pemegang_nilai = {:r} && aktif = true", "", 200, 0, { r: role });
        (roleMaps || []).forEach(m => { izinSet[m.get("izin")] = true; });
      } catch (_) {}
      try {
        const jabatanList = dao.findRecordsByFilter("jabatan", "anggota = {:u} && aktif = true", "", 200, 0, { u: u.id });
        (jabatanList || []).forEach(j => {
          let unit = null;
          try { unit = dao.findRecordById("unit", j.get("unit")); } catch (_) {}
          if (unit) {
            const jenis = unit.get("jenis");
            if (tim.indexOf(jenis) === -1) tim.push(jenis);
            try {
              const unitMaps = dao.findRecordsByFilter("pemetaan_izin", "pemegang_tipe = 'unit' && pemegang_nilai = {:v} && aktif = true", "", 200, 0, { v: jenis });
              (unitMaps || []).forEach(m => { izinSet[m.get("izin")] = true; });
            } catch (_) {}
          }
        });
      } catch (_) {}
      u.set("izin", Object.keys(izinSet));
      u.set("tim", tim);
      dao.saveRecord(u);
      count++;
    });
  } catch (err) {
    return c.json(500, { error: err.message });
  }
  return c.json(200, { success: true, synced: count });
});
