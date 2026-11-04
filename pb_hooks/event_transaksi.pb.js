// pb_hooks/event_transaksi.pb.js - Integritas Transaksi Event (Plan §5.5, §6.8 C)

function hasRole(auth, roles) {
  return auth && roles.indexOf(auth.get("role")) !== -1;
}

function isPanitiaBendahara(eventId, userId, dao) {
  try {
    const recs = dao.findRecordsByFilter("event_panitia", "event = {:e} && anggota = {:u} && seksi = 'bendahara' && aktif = true", "", 1, 0, { e: eventId, u: userId });
    return recs && recs.length > 0;
  } catch (_) {
    return false;
  }
}

// --- CREATE: wajib bukti/sumber/pos, status event yang tepat, dan pencatat yang berwenang ---
onRecordBeforeCreateRequest((e) => {
  const auth = e.httpContext.get("authRecord");
  if (!auth) throw new BadRequestError("Wajib login.");

  const eventId = e.record.get("event");
  const dao = $app.dao();

  let event = null;
  try { event = dao.findRecordById("event", eventId); } catch (_) {}
  if (!event) throw new BadRequestError("Event tidak ditemukan.");

  const status = event.get("status");
  const allowedStatus = ["persiapan", "berlangsung", "selesai"];
  if (allowedStatus.indexOf(status) === -1) {
    throw new BadRequestError("Transaksi event hanya bisa dicatat saat status persiapan, berlangsung, atau selesai.");
  }

  // Pencatat harus bendahara panitia (atau admin/pengurus)
  const dicatatOleh = e.record.get("dicatat_oleh");
  if (dicatatOleh !== auth.id) {
    throw new BadRequestError("Pencatat transaksi harus akun yang sedang login.");
  }
  if (!hasRole(auth, ["admin", "pengurus"]) && !isPanitiaBendahara(eventId, auth.id, dao)) {
    throw new BadRequestError("Hanya bendahara panitia (atau pengurus/admin) yang boleh mencatat transaksi event.");
  }

  const jenis = e.record.get("jenis");
  if (jenis === "masuk") {
    if (!e.record.get("sumber_dana")) {
      throw new BadRequestError("Transaksi masuk wajib menunjuk sumber dana.");
    }
  } else if (jenis === "keluar") {
    if (!e.record.get("pos_anggaran")) {
      throw new BadRequestError("Transaksi keluar wajib menunjuk pos anggaran.");
    }
    if (!e.record.get("bukti")) {
      throw new BadRequestError("Transaksi keluar wajib melampirkan bukti (foto/struk).");
    }
  } else {
    throw new BadRequestError("Jenis transaksi tidak valid.");
  }

  // Default verifikasi
  if (!e.record.get("verifikasi")) {
    e.record.set("verifikasi", "belum");
  }
}, "event_transaksi");

// --- UPDATE: hanya verifikasi boleh berubah, dan tidak oleh pencatatnya sendiri ---
onRecordBeforeUpdateRequest((e) => {
  const auth = e.httpContext.get("authRecord");
  if (!auth) throw new BadRequestError("Wajib login.");

  const dao = $app.dao();
  const old = dao.findRecordById("event_transaksi", e.record.id);

  const protectedFields = ["event", "tanggal", "jenis", "nominal", "keterangan", "sumber_dana", "pos_anggaran", "bukti", "dicatat_oleh", "mengoreksi"];
  for (let i = 0; i < protectedFields.length; i++) {
    const f = protectedFields[i];
    const oldVal = old.get(f);
    const newVal = e.record.get(f);
    if (String(oldVal) !== String(newVal)) {
      throw new BadRequestError("Field transaksi '" + f + "' tidak boleh diubah. Buat transaksi koreksi baru.");
    }
  }

  // Hanya admin/bendahara komunitas yang boleh memverifikasi
  if (!hasRole(auth, ["admin", "bendahara"])) {
    throw new BadRequestError("Hanya bendahara komunitas atau admin yang boleh memverifikasi transaksi.");
  }

  const oldVer = old.get("verifikasi");
  const newVer = e.record.get("verifikasi");
  if (newVer !== oldVer) {
    if (auth.id === old.get("dicatat_oleh")) {
      throw new BadRequestError("Pencatat transaksi tidak boleh memverifikasi transaksinya sendiri.");
    }
    if (newVer === "terverifikasi" || newVer === "ditolak") {
      e.record.set("diverifikasi_oleh", auth.id);
    }
  }
}, "event_transaksi");

// --- DELETE: dikunci ---
onRecordBeforeDeleteRequest((e) => {
  throw new BadRequestError("Transaksi event tidak boleh dihapus. Buat transaksi koreksi untuk memperbaiki kesalahan.");
}, "event_transaksi");
