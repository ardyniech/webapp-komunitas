// pb_hooks/profil_validasi.pb.js - Validasi perubahan profil anggota (Plan §5.8, §5.9, §6.11)

const SYSTEM_FIELDS = ["role", "tim", "izin", "status", "tanggal_gabung", "email", "verified"];

onRecordBeforeUpdateRequest((e) => {
  const auth = e.httpContext.get("authRecord");
  if (!auth) throw new BadRequestError("Wajib login.");

  const dao = $app.dao();
  const old = dao.findRecordById("users", e.record.id);
  const isAdmin = auth.get("role") === "admin" || (Array.isArray(auth.get("izin")) && auth.get("izin").indexOf("kelola_anggota") !== -1);
  const isSelf = auth.id === e.record.id;

  if (!isSelf && !isAdmin) {
    throw new BadRequestError("Tidak boleh mengubah profil anggota lain.");
  }

  // Anggota biasa tidak boleh mengubah field sistem
  if (!isAdmin) {
    for (let i = 0; i < SYSTEM_FIELDS.length; i++) {
      const f = SYSTEM_FIELDS[i];
      if (String(old.get(f)) !== String(e.record.get(f))) {
        throw new BadRequestError("Field '" + f + "' tidak boleh diubah oleh anggota.");
      }
    }

    // Validasi bidang kustom terhadap bidang_profil
    try {
      const bidangList = dao.findRecordsByFilter("bidang_profil", "aktif = true", "", 200, 0, {});
      const bidangMap = {};
      (bidangList || []).forEach(b => { bidangMap[b.get("kunci")] = b; });

      let kustom = e.record.get("kustom");
      if (typeof kustom === "string") { try { kustom = JSON.parse(kustom); } catch (_) { kustom = {}; } }
      kustom = kustom || {};
      for (const key in kustom) {
        const def = bidangMap[key];
        if (!def) continue;
        if (def.get("bisa_diubah_anggota") !== true) {
          // bandingkan dengan nilai lama; jika berubah, tolak
          let oldKustom = old.get("kustom");
          if (typeof oldKustom === "string") { try { oldKustom = JSON.parse(oldKustom); } catch (_) { oldKustom = {}; } }
          oldKustom = oldKustom || {};
          if (JSON.stringify(oldKustom[key]) !== JSON.stringify(kustom[key])) {
            throw new BadRequestError("Bidang '" + key + "' tidak bisa diubah oleh anggota.");
          }
        }
      }
    } catch (err) {
      if (err.message && err.message.includes("tidak bisa diubah")) throw err;
    }
  }
}, "users");
