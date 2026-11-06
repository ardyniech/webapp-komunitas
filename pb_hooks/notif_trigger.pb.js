// pb_hooks/notif_trigger.pb.js - Pemicu notifikasi in-app (atomik).
//
// File BARU, terpisah dari hook lama. Mengirim notifikasi saat:
// - pengumuman baru dibuat           -> keSemua (semua anggota aktif)
// - event baru dibuat/diterbitkan    -> keSemua
// - pengaduan baru / status berubah  -> keAdmin (Dewan Etik perlu tahu)
//
// Setiap handler memanggil lib/notif via require di awal (isolasi runtime).

// ── Pengumuman baru ────────────────────────────────────────────────────────
onRecordAfterCreateRequest((e) => {
  try {
    const notif = require(`${__hooks}/lib/notif.js`);
    const judul = notif.aman(e.record.get("judul")) || "Pengumuman baru";
    notif.keSemua($app.dao(), "pengumuman", "📢 " + judul,
      "Ada pengumuman baru dari pengurus basecamp.", "pengumuman");
  } catch (_) {}
}, "pengumuman");

// ── Event baru ─────────────────────────────────────────────────────────────
onRecordAfterCreateRequest((e) => {
  try {
    const notif = require(`${__hooks}/lib/notif.js`);
    const nama = notif.aman(e.record.get("nama")) || notif.aman(e.record.get("judul")) || "Event baru";
    notif.keSemua($app.dao(), "event", "🎉 " + nama,
      "Event/kegiatan baru di basecamp. Cek detail & panitia.", "event");
  } catch (_) {}
}, "event");

// ── Pengaduan baru → admin/Dewan Etik ──────────────────────────────────────
onRecordAfterCreateRequest((e) => {
  try {
    const notif = require(`${__hooks}/lib/notif.js`);
    notif.keAdmin($app.dao(), "pengaduan_baru", "🛡️ Pengaduan baru masuk",
      "Ada laporan pengaduan yang perlu ditinjau Dewan Etik.", "pengaduan");
  } catch (_) {}
}, "pengaduan");

// ── Pengaduan diselesaikan/ditolak → ke pelapor (bila tidak anonim) ─────────
onRecordAfterUpdateRequest((e) => {
  try {
    const notif = require(`${__hooks}/lib/notif.js`);
    const statusBaru = e.record.get("status") || "";
    const pelapor = e.record.get("pelapor");
    if (!pelapor) return;
    if (statusBaru === "selesai" || statusBaru === "ditolak") {
      notif.kirim($app.dao(), pelapor, "pengaduan_" + statusBaru, "Status pengaduan kamu: " + statusBaru,
        "Pengaduan kamu telah diproses Dewan Etik. Cek tab Pengaduan untuk detail.", "pengaduan");
    }
  } catch (_) {}
}, "pengaduan");
