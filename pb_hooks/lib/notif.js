// pb_hooks/lib/notif.js - Helper notifikasi in-app (atomik, dipakai hook).
//
// Membuat catatan notifikasi di koleksi `notifikasi` untuk:
// - user tertentu (mis. pendaftar disetujui)
// - semua admin/superadmin (mis. pendaftaran menunggu)
// - semua pengguna aktif (mis. pengumuman, event)
//
// Setiap handler memanggil: const notif = require(`${__hooks}/lib/notif.js`)

function json(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch (_) { return fallback; }
  }
  return value;
}

function aman(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

// Cari semua id admin/superadmin aktif
function daftarAdminIds(dao) {
  const ids = [];
  try {
    const list = dao.findRecordsByFilter("users", `(role = 'admin' || role = 'superadmin') && status = 'aktif'`, "", 100, 0, {}) || [];
    for (let i = 0; i < list.length; i++) ids.push(list[i].id);
  } catch (_) {}
  return ids;
}

// Cari semua id pengguna aktif
function daftarSemuaAktifIds(dao) {
  const ids = [];
  try {
    const list = dao.findRecordsByFilter("users", "status = 'aktif'", "", 500, 0, {}) || [];
    for (let i = 0; i < list.length; i++) ids.push(list[i].id);
  } catch (_) {}
  return ids;
}

function kirim(dao, userId, jenis, judul, isi, tabTujuan) {
  if (!userId) return;
  try {
    const col = dao.findCollectionByNameOrId("notifikasi");
    const rec = new Record(col);
    rec.set("user", userId);
    rec.set("jenis", String(jenis).slice(0, 60));
    rec.set("judul", String(judul).slice(0, 200));
    rec.set("isi", String(isi || "").slice(0, 2000));
    rec.set("tab_tujuan", String(tabTujuan || "").slice(0, 60));
    rec.set("dibaca", false);
    rec.set("waktu", new Date().toISOString());
    dao.saveRecord(rec);
  } catch (_) {}
}

function keAdmin(dao, jenis, judul, isi, tabTujuan) {
  daftarAdminIds(dao).forEach((id) => kirim(dao, id, jenis, judul, isi, tabTujuan));
}

function keSemua(dao, jenis, judul, isi, tabTujuan) {
  daftarSemuaAktifIds(dao).forEach((id) => kirim(dao, id, jenis, judul, isi, tabTujuan));
}

module.exports = { json, aman, kirim, keAdmin, keSemua, daftarAdminIds, daftarSemuaAktifIds };
