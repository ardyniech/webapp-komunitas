// pb_hooks/event_status.pb.js - Validasi Transisi Status Event & Integritas Panitia (Plan §6.8)

onRecordBeforeUpdateRequest((e) => {
  const dao = $app.dao();
  const currentRecord = dao.findRecordById("event", e.record.id);
  const oldStatus = currentRecord.get("status");
  const newStatus = e.record.get("status");

  if (oldStatus === newStatus) return;

  const validTransitions = {
    "usulan": ["disetujui", "dibatalkan"],
    "disetujui": ["persiapan", "dibatalkan"],
    "persiapan": ["berlangsung", "dibatalkan"],
    "berlangsung": ["selesai", "dibatalkan"],
    "selesai": ["lpj_diajukan"],
    "lpj_diajukan": ["ditutup", "selesai"],
    "ditutup": [],
    "dibatalkan": []
  };

  const allowed = validTransitions[oldStatus] || [];
  if (!allowed.includes(newStatus)) {
    throw new BadRequestError("Perubahan status event dari '" + oldStatus + "' ke '" + newStatus + "' tidak diizinkan sesuai alur standar.");
  }

  // Jika ditutup, cek syarat penutupan (Plan §6.8 E)
  if (newStatus === "ditutup") {
    // 1. Semua transaksi harus terverifikasi
    try {
      const unverified = dao.findRecordsByFilter("event_transaksi", "event = {:eventId} && verifikasi != 'terverifikasi'", "", 1, 0, { eventId: e.record.id });
      if (unverified && unverified.length > 0) {
        throw new BadRequestError("Event belum bisa ditutup: masih ada transaksi event yang belum diverifikasi atau masih ditolak.");
      }
    } catch (err) {
      if (err.message && err.message.includes("Event belum bisa ditutup")) throw err;
    }

    // 2. Minimal satu laporan berstatus disetujui
    try {
      const reports = dao.findRecordsByFilter("event_laporan", "event = {:eventId} && status = 'disetujui'", "", 1, 0, { eventId: e.record.id });
      if (!reports || reports.length === 0) {
        throw new BadRequestError("Event belum bisa ditutup: Laporan LPJ belum berstatus disetujui oleh pengurus.");
      }
    } catch (err) {
      if (err.message && err.message.includes("Event belum bisa ditutup")) throw err;
    }
  }
}, "event");

// Enforce: Ketua tidak boleh merangkap bendahara (Plan §6.8 B)
onRecordBeforeCreateRequest((e) => {
  const seksi = e.record.get("seksi");
  const anggota = e.record.get("anggota");
  const eventId = e.record.get("event");

  if (seksi === "bendahara" || seksi === "ketua_pelaksana") {
    const dao = $app.dao();
    try {
      const event = dao.findRecordById("event", eventId);
      if (event.get("ketua_pelaksana") === anggota && seksi === "bendahara") {
        throw new BadRequestError("Ketua pelaksana tidak boleh merangkap sebagai seksi bendahara demi transparansi.");
      }
    } catch (err) {
      if (err.message && err.message.includes("tidak boleh merangkap")) throw err;
    }
  }
}, "event_panitia");
