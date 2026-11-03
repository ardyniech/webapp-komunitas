/// <reference path="../pb_data/types.d.ts" />

migrate((db) => {
  const dao = new Dao(db)

  // ── 1. ATURAN_VERSI ────────────────────────────────────────────────────────
  const aturanVersi = new Collection({
    name: "aturan_versi",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.role = "admin"',
    updateRule: '@request.auth.role = "admin"',
    deleteRule: null,
    schema: [
      new SchemaField({ name: "nomor", type: "text", required: true, options: { min: null, max: 100, pattern: "" } }),
      new SchemaField({ name: "judul", type: "text", required: true, options: { min: null, max: 200, pattern: "" } }),
      new SchemaField({ name: "ringkasan_perubahan", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({
        name: "status", type: "select", required: true,
        options: { maxSelect: 1, values: ["draf", "ditinjau", "disahkan", "berlaku", "diganti"] }
      }),
      new SchemaField({ name: "tanggal_efektif", type: "date", required: false, options: { min: "", max: "" } }),
      new SchemaField({
        name: "disusun_oleh", type: "relation", required: false,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({
        name: "mode_pengesahan", type: "select", required: true,
        options: { maxSelect: 1, values: ["unit", "unit_dan_anggota"] }
      }),
    ]
  })
  dao.saveCollection(aturanVersi)

  // ── 2. ATURAN_PASAL ────────────────────────────────────────────────────────
  const aturanPasal = new Collection({
    name: "aturan_pasal",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.role = "admin"',
    updateRule: '@request.auth.role = "admin"',
    deleteRule: null,
    schema: [
      new SchemaField({
        name: "versi", type: "relation", required: true,
        options: { collectionId: "aturan_versi", cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "bab", type: "text", required: false, options: { min: null, max: 100, pattern: "" } }),
      new SchemaField({ name: "nomor", type: "text", required: true, options: { min: null, max: 50, pattern: "" } }),
      new SchemaField({ name: "judul", type: "text", required: true, options: { min: null, max: 200, pattern: "" } }),
      new SchemaField({ name: "isi", type: "text", required: true, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({
        name: "kategori", type: "select", required: true,
        options: { maxSelect: 1, values: ["umum", "keanggotaan", "etika", "keuangan", "kegiatan", "forum", "sanksi"] }
      }),
      new SchemaField({ name: "urutan", type: "number", required: false, options: { min: null, max: null, noDecimal: false } }),
    ]
  })
  dao.saveCollection(aturanPasal)

  // ── 3. ATURAN_PENGESAHAN ───────────────────────────────────────────────────
  const aturanPengesahan = new Collection({
    name: "aturan_pengesahan",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: null,
    schema: [
      new SchemaField({
        name: "versi", type: "relation", required: true,
        options: { collectionId: "aturan_versi", cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({
        name: "pihak", type: "select", required: true,
        options: { maxSelect: 1, values: ["dewan_etik", "pengurus"] }
      }),
      new SchemaField({
        name: "anggota", type: "relation", required: true,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({
        name: "keputusan", type: "select", required: true,
        options: { maxSelect: 1, values: ["setuju", "tolak", "revisi"] }
      }),
      new SchemaField({ name: "catatan", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "waktu", type: "date", required: false, options: { min: "", max: "" } }),
    ]
  })
  dao.saveCollection(aturanPengesahan)

  // ── 4. ATURAN_PERSETUJUAN_ANGGOTA ──────────────────────────────────────────
  const aturanPersetujuanAnggota = new Collection({
    name: "aturan_persetujuan_anggota",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: null,
    deleteRule: null,
    schema: [
      new SchemaField({
        name: "versi", type: "relation", required: true,
        options: { collectionId: "aturan_versi", cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({
        name: "anggota", type: "relation", required: true,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "waktu", type: "date", required: false, options: { min: "", max: "" } }),
    ]
  })
  dao.saveCollection(aturanPersetujuanAnggota)

  // ── 5. ATURAN_SANKSI ───────────────────────────────────────────────────────
  const aturanSanksi = new Collection({
    name: "aturan_sanksi",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.role = "admin"',
    updateRule: '@request.auth.role = "admin"',
    deleteRule: null,
    schema: [
      new SchemaField({ name: "tingkat", type: "number", required: true, options: { min: 1, max: null, noDecimal: true } }),
      new SchemaField({ name: "nama", type: "text", required: true, options: { min: null, max: 200, pattern: "" } }),
      new SchemaField({ name: "deskripsi", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "syarat", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "perlu_persetujuan_pengurus", type: "bool", required: false }),
      new SchemaField({ name: "masa_berlaku_hari", type: "number", required: false, options: { min: 0, max: null, noDecimal: true } }),
    ]
  })
  dao.saveCollection(aturanSanksi)

  // ── 6. KEPUTUSAN_ETIK ──────────────────────────────────────────────────────
  const keputusanEtik = new Collection({
    name: "keputusan_etik",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.role = "admin" || "dewan_etik":timlist ~ @request.auth.tim',
    updateRule: '@request.auth.role = "admin" || "dewan_etik":timlist ~ @request.auth.tim',
    deleteRule: null,
    schema: [
      new SchemaField({
        name: "pengaduan", type: "relation", required: false,
        options: { collectionId: "pengaduan", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({
        name: "anggota", type: "relation", required: true,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({
        name: "pasal", type: "relation", required: false,
        options: { collectionId: "aturan_pasal", cascadeDelete: false, minSelect: null, maxSelect: 10, displayFields: [] }
      }),
      new SchemaField({ name: "ringkasan", type: "text", required: true, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({
        name: "tindakan", type: "relation", required: false,
        options: { collectionId: "aturan_sanksi", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({
        name: "ditetapkan_oleh", type: "relation", required: false,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 10, displayFields: [] }
      }),
      new SchemaField({ name: "tanggal", type: "date", required: false, options: { min: "", max: "" } }),
      new SchemaField({
        name: "tidak_ikut_memutus", type: "relation", required: false,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 10, displayFields: [] }
      }),
      new SchemaField({
        name: "status", type: "select", required: true,
        options: { maxSelect: 1, values: ["diputuskan", "keberatan_diajukan", "ditinjau_ulang", "final"] }
      }),
      new SchemaField({ name: "batas_keberatan", type: "date", required: false, options: { min: "", max: "" } }),
      new SchemaField({ name: "catatan", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
    ]
  })
  dao.saveCollection(keputusanEtik)

  // ── 7. KEBERATAN ───────────────────────────────────────────────────────────
  const keberatan = new Collection({
    name: "keberatan",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.role = "admin" || "dewan_etik":timlist ~ @request.auth.tim',
    deleteRule: null,
    schema: [
      new SchemaField({
        name: "keputusan", type: "relation", required: true,
        options: { collectionId: "keputusan_etik", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "alasan", type: "text", required: true, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({
        name: "status", type: "select", required: true,
        options: { maxSelect: 1, values: ["diajukan", "ditinjau", "diterima", "ditolak"] }
      }),
      new SchemaField({
        name: "ditinjau_oleh", type: "relation", required: false,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 10, displayFields: [] }
      }),
      new SchemaField({ name: "hasil", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
    ]
  })
  dao.saveCollection(keberatan)

  // ── 8. EVENT ───────────────────────────────────────────────────────────────
  const event = new Collection({
    name: "event",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.role = "admin" || @request.auth.role = "pengurus"',
    deleteRule: null,
    schema: [
      new SchemaField({ name: "judul", type: "text", required: true, options: { min: null, max: 200, pattern: "" } }),
      new SchemaField({
        name: "jenis", type: "select", required: true,
        options: { maxSelect: 1, values: ["kopdar", "bakti_sosial", "rapat_akbar", "pelatihan", "olahraga", "syukuran", "lainnya"] }
      }),
      new SchemaField({ name: "deskripsi", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "tujuan", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "lokasi", type: "text", required: false, options: { min: null, max: 200, pattern: "" } }),
      new SchemaField({ name: "tanggal_mulai", type: "date", required: false, options: { min: "", max: "" } }),
      new SchemaField({ name: "tanggal_selesai", type: "date", required: false, options: { min: "", max: "" } }),
      new SchemaField({ name: "target_peserta", type: "number", required: false, options: { min: 0, max: null, noDecimal: true } }),
      new SchemaField({
        name: "sampul", type: "file", required: false,
        options: { maxSelect: 1, maxSize: 2097152, mimeTypes: ["image/jpeg", "image/png", "image/webp"], thumbs: [], protected: false }
      }),
      new SchemaField({
        name: "status", type: "select", required: true,
        options: { maxSelect: 1, values: ["usulan", "disetujui", "persiapan", "berlangsung", "selesai", "lpj_diajukan", "ditutup", "dibatalkan"] }
      }),
      new SchemaField({
        name: "ketua_pelaksana", type: "relation", required: false,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({
        name: "ditunjuk_oleh", type: "relation", required: false,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({
        name: "disetujui_oleh", type: "relation", required: false,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "tanggal_persetujuan", type: "date", required: false, options: { min: "", max: "" } }),
      new SchemaField({ name: "catatan_persetujuan", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
    ]
  })
  dao.saveCollection(event)

  // ── 9. EVENT_PANITIA ───────────────────────────────────────────────────────
  const eventPanitia = new Collection({
    name: "event_panitia",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.role = "admin" || @request.auth.role = "pengurus"',
    updateRule: '@request.auth.role = "admin" || @request.auth.role = "pengurus"',
    deleteRule: null,
    schema: [
      new SchemaField({
        name: "event", type: "relation", required: true,
        options: { collectionId: "event", cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({
        name: "anggota", type: "relation", required: true,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({
        name: "seksi", type: "select", required: true,
        options: { maxSelect: 1, values: ["ketua_pelaksana", "wakil", "sekretaris", "bendahara", "acara", "humas", "perlengkapan", "konsumsi", "dokumentasi", "keamanan", "lainnya"] }
      }),
      new SchemaField({ name: "tugas", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({
        name: "ditunjuk_oleh", type: "relation", required: false,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "aktif", type: "bool", required: false }),
    ]
  })
  dao.saveCollection(eventPanitia)

  // ── 10. EVENT_TUGAS ────────────────────────────────────────────────────────
  const eventTugas = new Collection({
    name: "event_tugas",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: null,
    schema: [
      new SchemaField({
        name: "event", type: "relation", required: true,
        options: { collectionId: "event", cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "judul", type: "text", required: true, options: { min: null, max: 200, pattern: "" } }),
      new SchemaField({
        name: "penanggung_jawab", type: "relation", required: false,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "tenggat", type: "date", required: false, options: { min: "", max: "" } }),
      new SchemaField({
        name: "status", type: "select", required: true,
        options: { maxSelect: 1, values: ["belum", "berjalan", "selesai"] }
      }),
      new SchemaField({ name: "catatan", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
    ]
  })
  dao.saveCollection(eventTugas)

  // ── 11. EVENT_ANGGARAN ─────────────────────────────────────────────────────
  const eventAnggaran = new Collection({
    name: "event_anggaran",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.role = "admin" || @request.auth.role = "pengurus"',
    updateRule: '@request.auth.role = "admin" || @request.auth.role = "pengurus"',
    deleteRule: null,
    schema: [
      new SchemaField({
        name: "event", type: "relation", required: true,
        options: { collectionId: "event", cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "pos", type: "text", required: true, options: { min: null, max: 100, pattern: "" } }),
      new SchemaField({ name: "uraian", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "volume", type: "number", required: false, options: { min: 0, max: null, noDecimal: false } }),
      new SchemaField({ name: "satuan", type: "text", required: false, options: { min: null, max: 50, pattern: "" } }),
      new SchemaField({ name: "harga_satuan", type: "number", required: false, options: { min: 0, max: null, noDecimal: false } }),
      new SchemaField({ name: "total_rencana", type: "number", required: false, options: { min: 0, max: null, noDecimal: false } }),
    ]
  })
  dao.saveCollection(eventAnggaran)

  // ── 12. EVENT_DANA ─────────────────────────────────────────────────────────
  const eventDana = new Collection({
    name: "event_dana",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.role = "admin" || @request.auth.role = "pengurus"',
    updateRule: '@request.auth.role = "admin" || @request.auth.role = "pengurus"',
    deleteRule: null,
    schema: [
      new SchemaField({
        name: "event", type: "relation", required: true,
        options: { collectionId: "event", cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({
        name: "jenis", type: "select", required: true,
        options: { maxSelect: 1, values: ["kas_komunitas", "sponsor", "donasi", "iuran_peserta", "lainnya"] }
      }),
      new SchemaField({ name: "nama_sumber", type: "text", required: true, options: { min: null, max: 200, pattern: "" } }),
      new SchemaField({ name: "rencana_nominal", type: "number", required: false, options: { min: 0, max: null, noDecimal: false } }),
      new SchemaField({ name: "nominal_diterima", type: "number", required: false, options: { min: 0, max: null, noDecimal: false } }),
      new SchemaField({ name: "keterangan", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
    ]
  })
  dao.saveCollection(eventDana)

  // ── 13. EVENT_TRANSAKSI ────────────────────────────────────────────────────
  const eventTransaksi = new Collection({
    name: "event_transaksi",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.role = "admin" || @request.auth.role = "bendahara"',
    deleteRule: null,
    schema: [
      new SchemaField({
        name: "event", type: "relation", required: true,
        options: { collectionId: "event", cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "tanggal", type: "date", required: true, options: { min: "", max: "" } }),
      new SchemaField({
        name: "jenis", type: "select", required: true,
        options: { maxSelect: 1, values: ["masuk", "keluar"] }
      }),
      new SchemaField({ name: "nominal", type: "number", required: true, options: { min: 0.01, max: null, noDecimal: false } }),
      new SchemaField({ name: "keterangan", type: "text", required: true, options: { min: null, max: 500, pattern: "" } }),
      new SchemaField({
        name: "sumber_dana", type: "relation", required: false,
        options: { collectionId: "event_dana", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({
        name: "pos_anggaran", type: "relation", required: false,
        options: { collectionId: "event_anggaran", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({
        name: "bukti", type: "file", required: false,
        options: { maxSelect: 1, maxSize: 2097152, mimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"], thumbs: [], protected: false }
      }),
      new SchemaField({
        name: "dicatat_oleh", type: "relation", required: true,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({
        name: "mengoreksi", type: "relation", required: false,
        options: { collectionId: "", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({
        name: "verifikasi", type: "select", required: true,
        options: { maxSelect: 1, values: ["belum", "terverifikasi", "ditolak"] }
      }),
      new SchemaField({
        name: "diverifikasi_oleh", type: "relation", required: false,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "catatan_verifikasi", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
    ]
  })
  dao.saveCollection(eventTransaksi)

  // Patch self-referential "mengoreksi" in event_transaksi
  const savedEventTransaksi = dao.findCollectionByNameOrId("event_transaksi")
  const mengoreksiField = savedEventTransaksi.schema.getFieldByName("mengoreksi")
  if (mengoreksiField) {
    mengoreksiField.options = {
      collectionId: savedEventTransaksi.id,
      cascadeDelete: false,
      minSelect: null,
      maxSelect: 1,
      displayFields: []
    }
  }
  dao.saveCollection(savedEventTransaksi)

  // ── 14. EVENT_PESERTA ──────────────────────────────────────────────────────
  const eventPeserta = new Collection({
    name: "event_peserta",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: null,
    schema: [
      new SchemaField({
        name: "event", type: "relation", required: true,
        options: { collectionId: "event", cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({
        name: "anggota", type: "relation", required: true,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({
        name: "status", type: "select", required: true,
        options: { maxSelect: 1, values: ["daftar", "hadir", "tidak_hadir", "izin"] }
      }),
    ]
  })
  dao.saveCollection(eventPeserta)

  // ── 15. EVENT_LAPORAN ──────────────────────────────────────────────────────
  const eventLaporan = new Collection({
    name: "event_laporan",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: null,
    schema: [
      new SchemaField({
        name: "event", type: "relation", required: true,
        options: { collectionId: "event", cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({
        name: "jenis", type: "select", required: true,
        options: { maxSelect: 1, values: ["proposal", "laporan_kegiatan", "lpj_keuangan", "evaluasi"] }
      }),
      new SchemaField({ name: "isi", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({
        name: "lampiran", type: "file", required: false,
        options: { maxSelect: 5, maxSize: 5242880, mimeTypes: [], thumbs: [], protected: false }
      }),
      new SchemaField({
        name: "status", type: "select", required: true,
        options: { maxSelect: 1, values: ["draf", "diajukan", "direvisi", "disetujui"] }
      }),
      new SchemaField({
        name: "ditulis_oleh", type: "relation", required: true,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({
        name: "ditinjau_oleh", type: "relation", required: false,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "catatan_tinjauan", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
    ]
  })
  dao.saveCollection(eventLaporan)

  // ── 16. EVENT_DOKUMENTASI ──────────────────────────────────────────────────
  const eventDokumentasi = new Collection({
    name: "event_dokumentasi",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: null,
    schema: [
      new SchemaField({
        name: "event", type: "relation", required: true,
        options: { collectionId: "event", cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({
        name: "foto", type: "file", required: false,
        options: { maxSelect: 1, maxSize: 2097152, mimeTypes: ["image/jpeg", "image/png", "image/webp"], thumbs: [], protected: false }
      }),
      new SchemaField({ name: "keterangan", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({
        name: "diunggah_oleh", type: "relation", required: true,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
    ]
  })
  dao.saveCollection(eventDokumentasi)

  // ── 17. UPDATE KAS ─────────────────────────────────────────────────────────
  const kas = dao.findCollectionByNameOrId("kas")
  const kategoriField = kas.schema.getFieldByName("kategori")
  if (kategoriField) {
    kategoriField.options = {
      maxSelect: 1,
      values: ["iuran", "donasi", "operasional", "sosial", "dana_event", "sisa_dana_event", "lainnya"]
    }
  }
  kas.schema.addField(new SchemaField({
    name: "event",
    type: "relation",
    required: false,
    options: { collectionId: "event", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
  }))
  dao.saveCollection(kas)

}, (db) => {
  const dao = new Dao(db)

  // Revert kas changes
  try {
    const kas = dao.findCollectionByNameOrId("kas")
    const eventField = kas.schema.getFieldByName("event")
    if (eventField) {
      kas.schema.removeField(eventField.id)
    }
    const kategoriField = kas.schema.getFieldByName("kategori")
    if (kategoriField) {
      kategoriField.options = {
        maxSelect: 1,
        values: ["iuran", "donasi", "operasional", "sosial", "lainnya"]
      }
    }
    dao.saveCollection(kas)
  } catch (_) {}

  // Delete collections in reverse order
  const collectionsToDelete = [
    "event_dokumentasi",
    "event_laporan",
    "event_peserta",
    "event_transaksi",
    "event_dana",
    "event_anggaran",
    "event_tugas",
    "event_panitia",
    "event",
    "keberatan",
    "keputusan_etik",
    "aturan_sanksi",
    "aturan_persetujuan_anggota",
    "aturan_pengesahan",
    "aturan_pasal",
    "aturan_versi"
  ]
  for (const name of collectionsToDelete) {
    try {
      const col = dao.findCollectionByNameOrId(name)
      dao.deleteCollection(col)
    } catch (_) {}
  }
})
