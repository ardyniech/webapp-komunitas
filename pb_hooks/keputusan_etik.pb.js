// pb_hooks/keputusan_etik.pb.js - Konflik kepentingan & hak keberatan (Plan §6.9 D)

onRecordBeforeCreateRequest((e) => {
  const auth = e.httpContext.get("authRecord");
  if (!auth) throw new BadRequestError("Wajib login.");

  const dao = $app.dao();
  const terlapor = e.record.get("anggota");
  const tidakIkut = e.record.get("tidak_ikut_memutus") || [];
  const penetap = e.record.get("ditetapkan_oleh") || [];

  // Terlapor tidak boleh ikut menetapkan
  if (Array.isArray(penetap) && penetap.indexOf(terlapor) !== -1) {
    throw new BadRequestError("Terlapor tidak boleh ikut menetapkan keputusan etik.");
  }
  // Yang tercatat tidak_ikut_memutus tidak boleh ikut menetapkan
  if (Array.isArray(tidakIkut)) {
    for (let i = 0; i < tidakIkut.length; i++) {
      if (Array.isArray(penetap) && penetap.indexOf(tidakIkut[i]) !== -1) {
        throw new BadRequestError("Pihak yang punya konflik kepentingan tidak boleh ikut menetapkan.");
      }
    }
  }

  if (!e.record.get("status")) e.record.set("status", "diputuskan");
}, "keputusan_etik");

onRecordBeforeUpdateRequest((e) => {
  const dao = $app.dao();
  const old = dao.findRecordById("keputusan_etik", e.record.id);
  // Yang tercantum tidak_ikut_memutus tidak boleh ditambahkan ke penetap
  const tidakIkut = e.record.get("tidak_ikut_memutus") || [];
  const penetap = e.record.get("ditetapkan_oleh") || [];
  if (Array.isArray(tidakIkut)) {
    for (let i = 0; i < tidakIkut.length; i++) {
      if (Array.isArray(penetap) && penetap.indexOf(tidakIkut[i]) !== -1) {
        throw new BadRequestError("Pihak konflik kepentingan tidak boleh ikut menetapkan.");
      }
    }
  }
  // Terlapor tidak boleh jadi penetap
  if (Array.isArray(penetap) && penetap.indexOf(old.get("anggota")) !== -1) {
    throw new BadRequestError("Terlapor tidak boleh ikut menetapkan.");
  }
}, "keputusan_etik");

// Keberatan: hanya terlapor yang membuat, ditinjau oleh yang tidak ikut memutus
onRecordBeforeCreateRequest((e) => {
  const auth = e.httpContext.get("authRecord");
  if (!auth) throw new BadRequestError("Wajib login.");
  const dao = $app.dao();
  const keputusan = dao.findRecordById("keputusan_etik", e.record.get("keputusan"));
  const terlapor = keputusan.get("anggota");
  if (auth.id !== terlapor) {
    throw new BadRequestError("Hanya terlapor yang boleh mengajukan keberatan.");
  }
  if (!e.record.get("status")) e.record.set("status", "diajukan");
}, "keberatan");
