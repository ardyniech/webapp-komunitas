// pb_hooks/bug_penalties.pb.js - Route penalti bug untuk progres (dev tool, ATOMIK).
//
// SENGAJA file baru, tidak menyusup ke progres.pb.js.
// Frontend (js/progres-bug.js) memanggil route ini, lalu menggabungkan
// hasilnya dengan data progres dasar dari /api/komunitas/progres.

routerAdd("GET", "/api/komunitas/penalti-bug", (c) => {
  try {
    const lib = require(`${__hooks}/lib/bug_progres.js`);
    let report = null;
    try {
      report = require("/home/ardy/projects/webapp-komunitas/pb_public/scan-report.json");
    } catch (_) {
      report = null;
    }
    const hasil = lib.hitungPenalti(report);
    hasil.dihasilkan_pada = new Date().toISOString();
    return c.json(200, hasil);
  } catch (e) {
    return c.json(500, { error: e.message });
  }
});
