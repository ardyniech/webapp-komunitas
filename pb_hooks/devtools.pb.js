// pb_hooks/devtools.pb.js - Route superadmin untuk snapshot devtools dari DB.
// NON-PUBLIK: hanya superadmin (seperti kas: hanya bendahara/admin yang bisa akses).
// Snapshot berisi detail internal (bug, host, git, versi, log) — tidak boleh ke publik/anggota.

routerAdd("GET", "/api/komunitas/devtools", (c) => {
  try {
    const auth = $apis.requestInfo(c).authRecord;
    if (!auth || auth.get("role") !== "superadmin") {
      return c.json(403, { error: "Khusus superadmin." });
    }
    const dao = $app.dao();
    const k = c.queryParam("k");
    if (k) {
      const recs = dao.findRecordsByFilter("devtools_snapshot", "kunci = {:k}", "", 1, 0, { k }) || [];
      if (recs.length === 0) return c.json(404, { error: "Snapshot belum ada." });
      return c.json(200, JSON.parse(recs[0].get("nilai")));
    }
    const recs = dao.findRecordsByFilter("devtools_snapshot", "kunci != ''", "kunci", 500, 0, {}) || [];
    const out = {};
    for (let i = 0; i < recs.length; i++) {
      try {
        out[recs[i].get("kunci")] = JSON.parse(recs[i].get("nilai"));
      } catch (_) {
        out[recs[i].get("kunci")] = null;
      }
    }
    return c.json(200, out);
  } catch (e) {
    return c.json(500, { error: "Gagal memuat devtools: " + e.message });
  }
});
