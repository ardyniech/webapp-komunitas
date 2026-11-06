// pb_hooks/flag_guard.pb.js - Penegakan feature flag di level API (atomik).
//
// Jika admin mematikan modul di Dev Tools (konfigurasi 'modul_aktif'),
// modul UI disembunyikan (js/modul-flag.js) — tapi itu hanya UI.
// Hook ini menegakkan di level API untuk koleksi modul utama:
//   kas->kas, iuran->iuran, forum_*->forum, event*->event, dokumen->dokumen.
//
// Registrasi dilakukan lewat loop top-level (bukan di dalam handler),
// dan handler mandiri membaca koleksi dari e.record.collection().name
// (menghindari bug isolasi runtime: tanpa konstanta file-scope).

const PETA_MODUL = [
  "kas:kas", "iuran:iuran",
  "forum_topik:forum", "forum_balasan:forum",
  "event:event", "event_panitia:event", "event_transaksi:event", "event_anggaran:event",
  "dokumen:dokumen",
];

for (let i = 0; i < PETA_MODUL.length; i++) {
  const parts = PETA_MODUL[i].split(":");
  const coleksi = parts[0];

  onRecordBeforeCreateRequest((e) => {
    try {
      const dao = $app.dao();
      const namaColeksi = e.record.collection().name;
      const modul = {
        kas: "kas", iuran: "iuran",
        forum_topik: "forum", forum_balasan: "forum",
        event: "event", event_panitia: "event", event_transaksi: "event", event_anggaran: "event",
        dokumen: "dokumen",
      }[namaColeksi];
      if (!modul) return;
      let aktif = [];
      try {
        const rec = dao.findFirstRecordByData("konfigurasi", "kunci", "modul_aktif");
        if (rec) {
          const v = rec.get("nilai");
          aktif = typeof v === "string" ? JSON.parse(v) : v || [];
        }
      } catch (_) {
        return; // gagal baca flag tidak boleh memblokir
      }
      if (Array.isArray(aktif) && aktif.indexOf(modul) === -1) {
        throw new BadRequestError(`Modul "${modul}" sedang dinonaktifkan oleh admin basecamp.`);
      }
    } catch (err) {
      if (err instanceof BadRequestError) throw err;
    }
  }, coleksi);

  onRecordBeforeUpdateRequest((e) => {
    try {
      const dao = $app.dao();
      const namaColeksi = e.record.collection().name;
      const modul = {
        kas: "kas", iuran: "iuran",
        forum_topik: "forum", forum_balasan: "forum",
        event: "event", event_panitia: "event", event_transaksi: "event", event_anggaran: "event",
        dokumen: "dokumen",
      }[namaColeksi];
      if (!modul) return;
      let aktif = [];
      try {
        const rec = dao.findFirstRecordByData("konfigurasi", "kunci", "modul_aktif");
        if (rec) {
          const v = rec.get("nilai");
          aktif = typeof v === "string" ? JSON.parse(v) : v || [];
        }
      } catch (_) {
        return;
      }
      if (Array.isArray(aktif) && aktif.indexOf(modul) === -1) {
        throw new BadRequestError(`Modul "${modul}" sedang dinonaktifkan oleh admin basecamp.`);
      }
    } catch (err) {
      if (err instanceof BadRequestError) throw err;
    }
  }, coleksi);
}
