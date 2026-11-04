// pb_hooks/izin.pb.js - Sinkronisasi izin & tim dari jabatan + pemetaan_izin (Plan §5.9, §6.3, §6.13 D)

function computeIzin(userId, dao) {
  const izinSet = {};
  let tim = [];

  // Role dasar user
  let user = null;
  try { user = dao.findRecordById("users", userId); } catch (_) { return { izin: [], tim: [] }; }
  const role = user.get("role");

  // Pemetaan berbasis role
  try {
    const roleMaps = dao.findRecordsByFilter("pemetaan_izin", "pemegang_tipe = 'role' && pemegang_nilai = {:r} && aktif = true", "", 200, 0, { r: role });
    (roleMaps || []).forEach(m => { izinSet[m.get("izin")] = true; });
  } catch (_) {}

  // Jabatan aktif user
  try {
    const jabatanList = dao.findRecordsByFilter("jabatan", "anggota = {:u} && aktif = true", "", 200, 0, { u: userId });
    (jabatanList || []).forEach(j => {
      let unit = null;
      try { unit = dao.findRecordById("unit", j.get("unit")); } catch (_) {}
      if (unit) {
        const jenis = unit.get("jenis");
        if (tim.indexOf(jenis) === -1) tim.push(jenis);
        // Pemetaan berbasis unit (jenis unit)
        try {
          const unitMaps = dao.findRecordsByFilter("pemetaan_izin", "pemegang_tipe = 'unit' && pemegang_nilai = {:v} && aktif = true", "", 200, 0, { v: jenis });
          (unitMaps || []).forEach(m => { izinSet[m.get("izin")] = true; });
        } catch (_) {}
      }
    });
  } catch (_) {}

  return { izin: Object.keys(izinSet), tim: tim };
}

function syncUser(userId, dao) {
  try {
    const user = dao.findRecordById("users", userId);
    const res = computeIzin(userId, dao);
    user.set("izin", res.izin);
    user.set("tim", res.tim);
    dao.saveRecord(user);
  } catch (_) {}
}

function syncAllUsers(dao) {
  try {
    const users = dao.findRecordsByFilter("users", "", "", 500, 0, {});
    (users || []).forEach(u => syncUser(u.id, dao));
  } catch (_) {}
}

// Sync saat jabatan berubah
onRecordAfterCreateRequest((e) => {
  syncUser(e.record.get("anggota"), $app.dao());
}, "jabatan");

onRecordAfterUpdateRequest((e) => {
  syncUser(e.record.get("anggota"), $app.dao());
}, "jabatan");

onRecordAfterDeleteRequest((e) => {
  // e.record may still have anggota
  try { syncUser(e.record.get("anggota"), $app.dao()); } catch (_) {}
}, "jabatan");

// Sync saat pemetaan izin berubah (semua user)
onRecordAfterCreateRequest((e) => { syncAllUsers($app.dao()); }, "pemetaan_izin");
onRecordAfterUpdateRequest((e) => { syncAllUsers($app.dao()); }, "pemetaan_izin");
onRecordAfterDeleteRequest((e) => { syncAllUsers($app.dao()); }, "pemetaan_izin");

// Sync saat user dibuat (izin awal dari role)
onRecordAfterCreateRequest((e) => {
  syncUser(e.record.id, $app.dao());
}, "users");
