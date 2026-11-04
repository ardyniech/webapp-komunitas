// pb_hooks/pengaduan.pb.js - Privasi Pengaduan Anonim (Plan §5.3, §6.6)

onRecordBeforeCreateRequest((e) => {
  const auth = e.httpContext.get("authRecord");
  if (!auth) throw new BadRequestError("Wajib login.");

  const anonim = e.record.get("anonim");
  if (anonim) {
    // Identitas pelapor tidak boleh tersimpan untuk laporan anonim
    e.record.set("pelapor", null);
  } else {
    if (!e.record.get("pelapor")) {
      e.record.set("pelapor", auth.id);
    }
    if (e.record.get("pelapor") !== auth.id) {
      throw new BadRequestError("Pelapor harus akun yang sedang login.");
    }
  }

  if (!e.record.get("kode_cek")) {
    e.record.set("kode_cek", "RPT-" + Math.random().toString(36).substring(2, 8).toUpperCase());
  }
  if (!e.record.get("status")) {
    e.record.set("status", "baru");
  }
}, "pengaduan");

// Status hanya boleh diubah dewan_etik/admin, dan identitas anonim tidak boleh ditambahkan
onRecordBeforeUpdateRequest((e) => {
  const auth = e.httpContext.get("authRecord");
  if (!auth) throw new BadRequestError("Wajib login.");
  const role = auth.get("role");
  const tim = auth.get("tim") || [];
  const isDewan = Array.isArray(tim) && tim.indexOf("dewan_etik") !== -1;
  if (role !== "admin" && !isDewan) {
    throw new BadRequestError("Hanya Dewan Etik atau admin yang boleh memproses pengaduan.");
  }
  const old = $app.dao().findRecordById("pengaduan", e.record.id);
  if (old.get("anonim") === true) {
    // Pastikan pelapor tetap kosong
    e.record.set("pelapor", null);
  }
}, "pengaduan");
