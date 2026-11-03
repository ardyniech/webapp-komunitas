// pb_hooks/auth_pendaftaran.pb.js - Pendaftaran Anggota Baru & Cek Status

// Hook: Blokir login untuk user yang statusnya bukan 'aktif' (Section 5 & 6.12)
onRecordAuthRequest((e) => {
  const status = e.record.get("status");
  if (status !== "aktif") {
    throw new BadRequestError("Maaf bro, akun kamu saat ini berstatus '" + status + "' dan belum dapat masuk. Hubungi admin basecamp ya!");
  }
}, "users");

routerAdd("POST", "/api/komunitas/daftar", (c) => {
  try {
    const data = $apis.requestInfo(c).data;

    // Honeypot bot protection
    if (data.website || data.url || data.fax) {
      return c.json(400, { error: "Spam detected." });
    }

    const nama = (data.nama_lengkap || "").trim();
    const whatsapp = (data.whatsapp || "").trim().replace(/[^0-9]/g, "");
    const domisili = (data.domisili || "").trim();
    const password = (data.password || "").trim();
    const alasan = (data.alasan_bergabung || "").trim();

    if (!nama || !whatsapp || !password) {
      return c.json(400, { error: "Nama lengkap, nomor WhatsApp, dan password wajib diisi!" });
    }

    if (password.length < 8) {
      return c.json(400, { error: "Password minimal 8 karakter demi keamanan!" });
    }

    if (!data.setuju_privasi) {
      return c.json(400, { error: "Persetujuan aturan basecamp & privasi wajib dicentang!" });
    }

    const dao = $app.dao();

    // Check duplicate whatsapp in pendaftaran or users
    try {
      const existingUser = dao.findFirstRecordByData("users", "whatsapp", whatsapp);
      if (existingUser) {
        return c.json(400, { error: "Nomor WhatsApp ini sudah terdaftar sebagai anggota!" });
      }
    } catch (e) {
      // not found is good
    }

    // Generate clean username & unique random kode_cek
    const cleanUsername = "usr_" + whatsapp.slice(-6) + "_" + Math.floor(Math.random() * 1000);
    const kodeCek = "REG-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create user with status 'menunggu'
    const usersCol = dao.findCollectionByNameOrId("users");
    const user = new Record(usersCol);
    user.setUsername(cleanUsername);
    user.setEmail(whatsapp + "@komunitas.local");
    user.setPassword(password);
    user.set("nama", nama);
    user.set("kontak", whatsapp);
    user.set("whatsapp", whatsapp);
    user.set("domisili", domisili);
    user.set("role", "anggota");
    user.set("status", "menunggu");
    user.set("setuju_privasi_pada", new Date().toISOString());

    dao.saveRecord(user);

    // Create pendaftaran record if collection exists
    try {
      const pendaftaranCol = dao.findCollectionByNameOrId("pendaftaran");
      const pendaftaran = new Record(pendaftaranCol);
      pendaftaran.set("user", user.id);
      pendaftaran.set("nama_lengkap", nama);
      pendaftaran.set("whatsapp", whatsapp);
      pendaftaran.set("domisili", domisili);
      pendaftaran.set("alasan_bergabung", alasan);
      pendaftaran.set("setuju_privasi", true);
      pendaftaran.set("status", "menunggu");
      pendaftaran.set("kode_cek", kodeCek);
      dao.saveRecord(pendaftaran);
    } catch (err) {
      // fallback
    }

    return c.json(200, {
      success: true,
      kode_cek: kodeCek,
      message: "Pendaftaran berhasil diajukan! Simpan kode cek untuk memantau persetujuan admin."
    });
  } catch (err) {
    return c.json(500, { error: "Gagal memproses pendaftaran: " + err.message });
  }
});

routerAdd("GET", "/api/komunitas/status/:kode", (c) => {
  try {
    const kode = c.pathParam("kode").trim().toUpperCase();
    const dao = $app.dao();

    let pendaftaran = null;
    try {
      pendaftaran = dao.findFirstRecordByData("pendaftaran", "kode_cek", kode);
    } catch (e) {
      return c.json(404, { error: "Kode pendaftaran tidak ditemukan. Cek kembali kode kamu ya bro!" });
    }

    return c.json(200, {
      status: pendaftaran.get("status"),
      nama_lengkap: pendaftaran.get("nama_lengkap"),
      catatan_admin: pendaftaran.get("catatan_admin") || "",
      alasan_penolakan: pendaftaran.get("alasan_penolakan") || "",
      diproses_pada: pendaftaran.get("diproses_pada") || ""
    });
  } catch (err) {
    return c.json(500, { error: "Terjadi kesalahan sistem: " + err.message });
  }
});

// Admin: Proses verifikasi pendaftaran (Setujui / Tolak)
routerAdd("POST", "/api/komunitas/pendaftaran/:id/proses", (c) => {
  try {
    const adminUser = $apis.requestInfo(c).authRecord;
    if (!adminUser || adminUser.get("role") !== "admin") {
      return c.json(403, { error: "Hanya admin basecamp yang berhak memproses pendaftaran!" });
    }

    const id = c.pathParam("id");
    const data = $apis.requestInfo(c).data;
    const aksi = data.aksi; // 'setujui' | 'tolak'
    const catatan = data.catatan || "";

    const dao = $app.dao();
    const pendaftaran = dao.findRecordById("pendaftaran", id);
    const userId = pendaftaran.get("user");
    const user = dao.findRecordById("users", userId);

    if (aksi === "setujui") {
      user.set("status", "aktif");
      dao.saveRecord(user);

      pendaftaran.set("status", "disetujui");
      pendaftaran.set("diproses_oleh", adminUser.id);
      pendaftaran.set("diproses_pada", new Date().toISOString());
      pendaftaran.set("catatan_admin", catatan);
      dao.saveRecord(pendaftaran);

      return c.json(200, { success: true, message: "Pendaftaran disetujui, akun anggota telah aktif!" });
    } else if (aksi === "tolak") {
      user.set("status", "ditolak");
      user.set("alasan_penolakan", catatan);
      dao.saveRecord(user);

      pendaftaran.set("status", "ditolak");
      pendaftaran.set("diproses_oleh", adminUser.id);
      pendaftaran.set("diproses_pada", new Date().toISOString());
      pendaftaran.set("alasan_penolakan", catatan);
      dao.saveRecord(pendaftaran);

      return c.json(200, { success: true, message: "Pendaftaran telah ditolak." });
    } else {
      return c.json(400, { error: "Aksi tidak valid (gunakan 'setujui' atau 'tolak')." });
    }
  } catch (err) {
    return c.json(500, { error: "Gagal memproses pendaftaran: " + err.message });
  }
});

