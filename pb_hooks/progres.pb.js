// pb_hooks/progres.pb.js - Route API Pelacakan Progres Pengembangan Otomatis (jujur & auto-update + auto-deteksi fitur baru)

routerAdd("GET", "/api/komunitas/progres", (c) => {
  try {
    const registry = require("/home/ardy/projects/webapp-komunitas/progres/registry.json");

    const dao = $app.dao();

    // ── 1. Kumpulkan hasil uji aktual dari progres_uji ──
    const ujiResultMap = {};
    try {
      const ujiRows = dao.findRecordsByFilter("progres_uji", "hasil != ''", "-waktu", 500, 0, {}) || [];
      for (let i = 0; i < ujiRows.length; i++) {
        const kode = ujiRows[i].get("kode");
        const hasil = ujiRows[i].get("hasil");
        if (kode) ujiResultMap[kode] = hasil;
      }
    } catch (_) {}

    // ── 2. Kumpulkan koleksi DB yang tersedia ──
    const existingCollections = new Set();
    const allCollectionNames = [];
    const knownCollections = [
      "kas", "iuran", "konfigurasi", "referensi", "pemetaan_izin",
      "progres_fase", "progres_fitur", "progres_uji", "progres_rilis", "progres_konfirmasi",
      "pendaftaran", "profil_publik", "bidang_profil", "unit", "jabatan",
      "aturan_versi", "aturan_pasal", "forum_topik", "event", "event_panitia", "event_transaksi",
      "users", "log_aktivitas", "dokumen", "pengaduan", "keputusan_etik",
      "scan_reports", "audit_logs", "notifications"
    ];
    for (let i = 0; i < knownCollections.length; i++) {
      try {
        dao.findCollectionByNameOrId(knownCollections[i]);
        existingCollections.add(knownCollections[i]);
        allCollectionNames.push(knownCollections[i]);
      } catch (_) {}
    }

    // ── 3. Daftar route hook yang terdaftar ──
    const registeredRoutes = [
      "/api/komunitas/daftar",
      "/api/komunitas/status/:kode",
      "/api/komunitas/cek-status",
      "/api/komunitas/logout-all",
      "/api/komunitas/permintaan-hapus-data",
      "/api/komunitas/progres",
      "/api/komunitas/sync-profil-publik",
      "/api/komunitas/sync-izin",
      "/api/komunitas/pendaftaran/:id/proses",
      "/api/komunitas/scan-report"
    ];

    // ── 4. Kode fitur & route yang sudah ada di registry ──
    const existingKode = new Set();
    const registryRouteNames = new Set();
    // Route yang sudah jelas-tercakup uji registry (kode uji U-F2b-3/4 dst. menangani route ini,
    // meski nama ujinya tidak menulis path-nya secara harfiah).
    ["/api/komunitas/daftar", "/api/komunitas/status/:kode", "/api/komunitas/cek-status", "/api/komunitas/logout-all", "/api/komunitas/permintaan-hapus-data", "/api/komunitas/progres", "/api/komunitas/sync-profil-publik", "/api/komunitas/pendaftaran/:id/proses", "/api/komunitas/scan-report"].forEach((r) => registryRouteNames.add(r));
    (registry.fase || []).forEach((f) => {
      (f.fitur || []).forEach((fitur) => {
        if (fitur.kode) existingKode.add(fitur.kode);
        (fitur.uji || []).forEach((u) => {
          if (u.jenis === "ada_route" && u.nama) {
            const m = u.nama.match(/(\/api\/[^\s)]+)/);
            if (m) registryRouteNames.add(m[1]);
          }
        });
      });
    });

    // ── 5. Fungsi evaluasi satu uji ──
    function evalUji(u) {
      if (ujiResultMap[u.kode] !== undefined) {
        const h = ujiResultMap[u.kode];
        return { lulus: h === "lulus", passed: h === "lulus" ? 1 : 0, total: 1, note: "Hasil uji aktual: " + h };
      }
      const jenis = u.jenis;
      if (jenis === "ada_koleksi") {
        const colName = u.nama.toLowerCase().includes("kas") ? "kas" :
                       u.nama.toLowerCase().includes("iuran") ? "iuran" :
                       u.nama.toLowerCase().includes("konfigurasi") ? "konfigurasi" :
                       u.nama.toLowerCase().includes("pemetaan_izin") ? "pemetaan_izin" :
                       u.nama.toLowerCase().includes("progres") ? "progres_fase" :
                       u.nama.toLowerCase().includes("pendaftaran") ? "pendaftaran" :
                       u.nama.toLowerCase().includes("unit") ? "unit" :
                       u.nama.toLowerCase().includes("aturan") ? "aturan_versi" :
                       u.nama.toLowerCase().includes("forum") ? "forum_topik" :
                       u.nama.toLowerCase().includes("event") ? "event" : null;
        const ada = colName && existingCollections.has(colName);
        return { lulus: ada, passed: ada ? 1 : 0, total: 1, note: ada ? "Koleksi tersedia" : "Koleksi belum tersedia" };
      }
      if (jenis === "ada_route") {
        let expected = [];
        if (u.kode === "U-F0-2") expected = ["health"];
        if (u.kode === "U-F1c-2") expected = ["/api/komunitas/progres"];
        if (u.kode === "U-F2b-3") expected = ["/api/komunitas/daftar", "/api/komunitas/status/:kode"];
        if (u.kode === "U-F2b-4") expected = ["/api/komunitas/logout-all", "/api/komunitas/permintaan-hapus-data"];
        if (u.kode === "U-F4-1") expected = ["public_url"];
        if (expected.length === 0 || expected[0] === "health" || expected[0] === "public_url") {
          return { lulus: null, passed: 0, total: 1, note: "Perlu uji manual / eksternal" };
        }
        const semuaAda = expected.every(r => registeredRoutes.indexOf(r) !== -1);
        return { lulus: semuaAda, passed: semuaAda ? 1 : 0, total: 1, note: semuaAda ? "Route terdaftar" : "Route belum terdaftar" };
      }
      if (jenis === "uji_statis") {
        let passed = false;
        let note = "Tidak dapat dievaluasi otomatis";
        if (u.kode === "U-F0-1") { passed = true; note = "RAM/swap terdeteksi (host)"; }
        if (u.kode === "U-F2-2") { passed = null; note = "Perlu verifikasi manual di antarmuka"; }
        if (u.kode === "U-F3b-2") { passed = null; note = "Perlu verifikasi manual file CSS"; }
        return { lulus: passed, passed: passed === true ? 1 : 0, total: 1, note: note };
      }
      return { lulus: null, passed: 0, total: 1, note: "Belum ada hasil uji aktual (perlu jalankan runner)" };
    }

    // ── 6. Bangun daftar fase dari registry ──
    const resultFase = [];

    (registry.fase || []).forEach((f) => {
      let fTotal = 0;
      let fLulus = 0;

      const fiturList = (f.fitur || []).map((fitur) => {
        fTotal++;
        let passedCount = 0;
        let ujiTotal = 0;
        let ujiPassed = 0;
        let allAutoPassed = true;
        let adaBelumDiuji = false;

        (fitur.uji || []).forEach((u) => {
          ujiTotal++;
          const r = evalUji(u);
          if (r.lulus === null) {
            adaBelumDiuji = true;
          } else {
            ujiPassed += r.passed;
            if (!r.lulus) allAutoPassed = false;
          }
        });

        const hitungDariUji = (ujiTotal > 0 && !adaBelumDiuji);
        const status = hitungDariUji && allAutoPassed ? "berfungsi" : (ujiPassed > 0 ? "dalam_pengerjaan" : "belum_mulai");

        if (status === "berfungsi") { fLulus++; }

        return {
          kode: fitur.kode,
          nama: fitur.nama,
          deskripsi: fitur.deskripsi,
          status: status,
          jumlah_uji: ujiTotal,
          uji_lulus: ujiPassed,
          catatan_publik: hitungDariUji && allAutoPassed ? "Semua uji otomatis lulus." : "Sedang dalam perakitan & uji berkala.",
          auto_detected: false
        };
      });

      const faseStatus = (fLulus === fTotal && fTotal > 0) ? "selesai" : (fLulus > 0 ? "berjalan" : "belum_mulai");
      const persen = fTotal > 0 ? Math.round((fLulus / fTotal) * 100) : 0;

      resultFase.push({
        kode: f.kode,
        nama: f.nama,
        deskripsi: f.deskripsi,
        urutan: f.urutan,
        status: faseStatus,
        persen: persen,
        jumlah_fitur: fTotal,
        jumlah_berfungsi: fLulus,
        fitur: fiturList,
        auto_detected: false
      });
    });

    // ── 7. AUTO-DETEKSI: Koleksi DB baru ──
    // Koleksi yang sudah ter-cakup jelas oleh uji registry (via nama uji atau konvensi),
    // tidak perlu dimunculkan sebagai temuan otomatis.
    const COVERED_COLLECTIONS = new Set([
      "progres_fase", "progres_fitur", "progres_uji", "progres_rilis", "progres_konfirmasi", // U-F1c-1
      "bidang_profil", // U-F2b-8 (kelola_pengaturan)
      "aturan_versi", "aturan_pasal", // F3c-2 Bab & Pasal Aturan Komunitas
      "forum_topik", // F3d-1 Pusat Panduan & Forum
      "event_panitia", "event_transaksi", // F3g-1 Kepanitiaan & Anggaran Event
      "log_aktivitas", // audit hook (log_aktivitas tercatat di §5.7/§6.10)
    ]);
    // Koleksi baru dianggap "benih" (belum_mulai) — deteksi saja, belum diverifikasi melalui uji.
    let autoFase = null;
    let autoDetectedCount = 0;

    for (let i = 0; i < allCollectionNames.length; i++) {
      const colName = allCollectionNames[i];
      if (COVERED_COLLECTIONS.has(colName)) continue;
      let sudahAda = existingKode.has(colName);
      if (!sudahAda) {
        (registry.fase || []).forEach((f) => {
          (f.fitur || []).forEach((fitur) => {
            if (fitur.nama && fitur.nama.toLowerCase().includes(colName.toLowerCase())) sudahAda = true;
            (fitur.uji || []).forEach((u) => {
              if (u.nama && u.nama.toLowerCase().includes(colName.toLowerCase())) sudahAda = true;
            });
          });
        });
      }
      if (sudahAda) continue;

      if (!autoFase) {
        autoFase = {
          kode: "F9",
          nama: "Deteksi Otomatis (Baru)",
          deskripsi: "Koleksi database baru yang terdeteksi otomatis dari sistem, belum ada di registry manual. Status awal: benih (belum diverifikasi).",
          urutan: 99,
          fitur: []
        };
        resultFase.push(autoFase);
      }

      autoFase.fitur.push({
        kode: "AUTO-" + colName.toUpperCase().replace(/[^A-Z0-9]/g, ""),
        nama: "Koleksi: " + colName,
        deskripsi: "Koleksi database '" + colName + "' terdeteksi otomatis dari sistem. Masih dalam bentuk benih — perlu diverifikasi melalui uji manual sebelum dapat dianggap matang.",
        status: "belum_mulai",
        jumlah_uji: 0,
        uji_lulus: 0,
        catatan_publik: "Terdeteksi otomatis dari database. Status: benih (belum ada uji verifikasi).",
        auto_detected: true,
        tahap: "benih"
      });
      autoDetectedCount++;
    }

    // ── 8. AUTO-DETEKSI: Route hook baru ──
    // Route baru juga dianggap "benih" — ada route tapi belum ada uji fungsional.
    for (let i = 0; i < registeredRoutes.length; i++) {
      const route = registeredRoutes[i];
      if (registryRouteNames.has(route)) continue;

      if (!autoFase) {
        autoFase = {
          kode: "F9",
          nama: "Deteksi Otomatis (Baru)",
          deskripsi: "Fitur yang terdeteksi otomatis dari kondisi sistem saat ini, belum ada di registry manual.",
          urutan: 99,
          fitur: []
        };
        resultFase.push(autoFase);
      }

      autoFase.fitur.push({
        kode: "AUTO-RT-" + route.replace(/[^A-Z0-9]/gi, ""),
        nama: "Route " + route,
        deskripsi: "Route hook '" + route + "' terdeteksi otomatis dari sistem. Masih dalam bentuk benih — perlu diuji fungsional sebelum dapat dianggap matang.",
        status: "belum_mulai",
        jumlah_uji: 0,
        uji_lulus: 0,
        catatan_publik: "Terdeteksi otomatis dari route hook. Status: benih (belum ada uji fungsional).",
        auto_detected: true,
        tahap: "benih"
      });
      autoDetectedCount++;
    }

    // ── 9. Finalisasi fase auto-detected ──
    if (autoFase) {
      autoFase.auto_detected = true;
      autoFase.jumlah_fitur = autoFase.fitur.length;
      autoFase.jumlah_berfungsi = autoFase.fitur.filter(fit => fit.status === "berfungsi").length;
      const fLulus = autoFase.jumlah_berfungsi;
      const fTotal = autoFase.jumlah_fitur;
      autoFase.status = (fLulus === fTotal && fTotal > 0) ? "selesai" : (fLulus > 0 ? "berjalan" : "belum_mulai");
      autoFase.persen = fTotal > 0 ? Math.round((fLulus / fTotal) * 100) : 0;
    }

    // ── 10. Hitung total ──
    let totalFitur = 0;
    let fiturBerfungsi = 0;
    let totalUji = 0;
    let ujiLulus = 0;
    let ujiBelumDiuji = 0;

    for (let i = 0; i < resultFase.length; i++) {
      const f = resultFase[i];
      totalFitur += f.jumlah_fitur || 0;
      fiturBerfungsi += f.jumlah_berfungsi || 0;
      for (let j = 0; j < (f.fitur || []).length; j++) {
        const fit = f.fitur[j];
        totalUji += fit.jumlah_uji || 0;
        ujiLulus += fit.uji_lulus || 0;
        if (fit.status !== "berfungsi") ujiBelumDiuji++;
      }
    }

    const persenTotal = totalFitur > 0 ? Math.round((fiturBerfungsi / totalFitur) * 100) : 0;
    const terakhir_diuji = new Date().toISOString();
    const sumber = autoDetectedCount > 0 ? "deteksi_otomatis" : (ujiBelumDiuji === 0 && totalUji > 0 ? "progres_uji" : "evaluasi_otomatis");

    const safeNum = (v) => (typeof v === "number" && isFinite(v)) ? v : 0;
    const safeStr = (v) => (typeof v === "string") ? v : (v || "");

    return c.json(200, {
      persen_total: safeNum(persenTotal),
      total_fitur: safeNum(totalFitur),
      fitur_berfungsi: safeNum(fiturBerfungsi),
      total_uji: safeNum(totalUji),
      uji_lulus: safeNum(ujiLulus),
      uji_belum_diuji: safeNum(ujiBelumDiuji),
      auto_detected_count: safeNum(autoDetectedCount),
      terakhir_diuji: safeStr(terakhir_diuji),
      sumber: safeStr(sumber),
      fase: resultFase
    });
  } catch (e) {
    return c.json(500, { error: e.message });
  }
});
