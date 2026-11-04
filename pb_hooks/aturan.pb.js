// pb_hooks/aturan.pb.js - Integritas Aturan Komunitas (Plan §5.7, §6.9)

// Versi yang sudah disahkan/berlaku/diganti dikunci (tidak bisa diedit)
onRecordBeforeUpdateRequest((e) => {
  const dao = $app.dao();
  const old = dao.findRecordById("aturan_versi", e.record.id);
  const oldStatus = old.get("status");
  const newStatus = e.record.get("status");

  const lockedStatuses = ["disahkan", "berlaku", "diganti"];
  if (lockedStatuses.indexOf(oldStatus) !== -1 && oldStatus !== newStatus) {
    // Hanya boleh pindah berlaku->diganti otomatis, tidak edit manual
    throw new BadRequestError("Versi aturan yang sudah disahkan/berlaku tidak bisa diubah. Buat versi baru.");
  }

  if (oldStatus === newStatus) return;

  const validTransitions = {
    "draf": ["ditinjau"],
    "ditinjau": ["disahkan", "draf"],
    "disahkan": ["berlaku"],
    "berlaku": ["diganti"],
    "diganti": [],
  };
  const allowed = validTransitions[oldStatus] || [];
  if (allowed.indexOf(newStatus) === -1) {
    throw new BadRequestError("Perubahan status aturan dari '" + oldStatus + "' ke '" + newStatus + "' tidak diizinkan.");
  }

  // Saat versi baru berlaku, versi lama otomatis diganti
  if (newStatus === "berlaku") {
    try {
      const current = dao.findRecordsByFilter("aturan_versi", "status = 'berlaku' && id != {:id}", "", 100, 0, { id: e.record.id });
      for (let i = 0; i < (current || []).length; i++) {
        current[i].set("status", "diganti");
        dao.saveRecord(current[i]);
      }
    } catch (_) {}
  }
}, "aturan_versi");

// Pasal hanya bisa diedit jika versinya draf/ditinjau
onRecordBeforeUpdateRequest((e) => {
  const dao = $app.dao();
  try {
    const versi = dao.findRecordById("aturan_versi", e.record.get("versi"));
    const st = versi.get("status");
    if (st !== "draf" && st !== "ditinjau") {
      throw new BadRequestError("Pasal pada versi yang sudah disahkan/berlaku tidak bisa diubah.");
    }
  } catch (err) {
    if (err.message && err.message.includes("tidak bisa diubah")) throw err;
  }
}, "aturan_pasal");

onRecordBeforeCreateRequest((e) => {
  const dao = $app.dao();
  try {
    const versi = dao.findRecordById("aturan_versi", e.record.get("versi"));
    const st = versi.get("status");
    if (st !== "draf" && st !== "ditinjau") {
      throw new BadRequestError("Pasal hanya bisa ditambah ke versi draf/ditinjau.");
    }
  } catch (err) {
    if (err.message && err.message.includes("tidak bisa")) throw err;
  }
}, "aturan_pasal");

// Pengesahan: hanya dewan_etik/pengurus, satu suara per orang
onRecordBeforeCreateRequest((e) => {
  const auth = e.httpContext.get("authRecord");
  if (!auth) throw new BadRequestError("Wajib login.");
  const tim = auth.get("tim") || [];
  const role = auth.get("role");
  if (role !== "admin" && role !== "pengurus" && !(Array.isArray(tim) && tim.indexOf("dewan_etik") !== -1)) {
    throw new BadRequestError("Hanya Dewan Etik atau pengurus yang boleh mengesahkan aturan.");
  }
  e.record.set("anggota", auth.id);
  const dao = $app.dao();
  try {
    const existing = dao.findRecordsByFilter("aturan_pengesahan", "versi = {:v} && anggota = {:a}", "", 1, 0, { v: e.record.get("versi"), a: auth.id });
    if (existing && existing.length > 0) {
      throw new BadRequestError("Anda sudah memberikan suara untuk versi ini.");
    }
  } catch (err) {
    if (err.message && err.message.includes("sudah memberikan")) throw err;
  }
}, "aturan_pengesahan");
