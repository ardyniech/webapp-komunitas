/// <reference path="../pb_data/types.d.ts" />

migrate((db) => {
  const dao = new Dao(db)

  // ── 1. PROGRES_FASE ────────────────────────────────────────────────────────
  const progresFase = new Collection({
    name: "progres_fase",
    type: "base",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    schema: [
      new SchemaField({ name: "kode", type: "text", required: true, options: { min: null, max: 100, pattern: "" } }),
      new SchemaField({ name: "nama", type: "text", required: true, options: { min: null, max: 200, pattern: "" } }),
      new SchemaField({ name: "deskripsi", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "urutan", type: "number", required: false, options: { min: null, max: null, noDecimal: false } }),
      new SchemaField({
        name: "status", type: "select", required: true,
        options: { maxSelect: 1, values: ["belum_mulai", "berjalan", "selesai", "bermasalah"] }
      }),
      new SchemaField({ name: "persen", type: "number", required: false, options: { min: 0, max: 100, noDecimal: false } }),
      new SchemaField({ name: "jumlah_fitur", type: "number", required: false, options: { min: 0, max: null, noDecimal: true } }),
      new SchemaField({ name: "jumlah_berfungsi", type: "number", required: false, options: { min: 0, max: null, noDecimal: true } }),
      new SchemaField({ name: "diperbarui", type: "date", required: false, options: { min: "", max: "" } }),
    ],
    indexes: [
      "CREATE UNIQUE INDEX `idx_progres_fase_kode` ON `progres_fase` (`kode`)"
    ]
  })
  dao.saveCollection(progresFase)

  // ── 2. PROGRES_FITUR ───────────────────────────────────────────────────────
  const progresFitur = new Collection({
    name: "progres_fitur",
    type: "base",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    schema: [
      new SchemaField({ name: "kode", type: "text", required: true, options: { min: null, max: 100, pattern: "" } }),
      new SchemaField({
        name: "fase", type: "relation", required: true,
        options: { collectionId: "progres_fase", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "nama", type: "text", required: true, options: { min: null, max: 200, pattern: "" } }),
      new SchemaField({ name: "deskripsi", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({
        name: "status", type: "select", required: true,
        options: { maxSelect: 1, values: ["belum_dibuat", "dalam_pengerjaan", "berfungsi", "bermasalah"] }
      }),
      new SchemaField({ name: "jumlah_uji", type: "number", required: false, options: { min: 0, max: null, noDecimal: true } }),
      new SchemaField({ name: "uji_lulus", type: "number", required: false, options: { min: 0, max: null, noDecimal: true } }),
      new SchemaField({ name: "catatan_publik", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "terakhir_berfungsi", type: "date", required: false, options: { min: "", max: "" } }),
      new SchemaField({ name: "diperbarui", type: "date", required: false, options: { min: "", max: "" } }),
    ],
    indexes: [
      "CREATE UNIQUE INDEX `idx_progres_fitur_kode` ON `progres_fitur` (`kode`)"
    ]
  })
  dao.saveCollection(progresFitur)

  // ── 3. PROGRES_UJI ─────────────────────────────────────────────────────────
  const progresUji = new Collection({
    name: "progres_uji",
    type: "base",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    schema: [
      new SchemaField({ name: "kode", type: "text", required: true, options: { min: null, max: 100, pattern: "" } }),
      new SchemaField({
        name: "fitur", type: "relation", required: true,
        options: { collectionId: "progres_fitur", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "nama", type: "text", required: true, options: { min: null, max: 200, pattern: "" } }),
      new SchemaField({
        name: "jenis", type: "select", required: true,
        options: { maxSelect: 1, values: ["ada_koleksi", "ada_route", "uji_api", "uji_statis", "uji_ui_ringan", "uji_manual"] }
      }),
      new SchemaField({
        name: "hasil", type: "select", required: true,
        options: { maxSelect: 1, values: ["lulus", "gagal", "dilewati"] }
      }),
      new SchemaField({ name: "sensitif", type: "bool", required: false }),
      new SchemaField({ name: "pesan_internal", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "waktu", type: "date", required: false, options: { min: "", max: "" } }),
    ]
  })
  dao.saveCollection(progresUji)

  // ── 4. PROGRES_RILIS ───────────────────────────────────────────────────────
  const progresRilis = new Collection({
    name: "progres_rilis",
    type: "base",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    schema: [
      new SchemaField({ name: "waktu", type: "date", required: false, options: { min: "", max: "" } }),
      new SchemaField({ name: "versi", type: "text", required: true, options: { min: null, max: 100, pattern: "" } }),
      new SchemaField({
        name: "pemicu", type: "select", required: true,
        options: { maxSelect: 1, values: ["deploy", "terjadwal"] }
      }),
      new SchemaField({ name: "total_uji", type: "number", required: false, options: { min: 0, max: null, noDecimal: true } }),
      new SchemaField({ name: "lulus", type: "number", required: false, options: { min: 0, max: null, noDecimal: true } }),
      new SchemaField({ name: "gagal", type: "number", required: false, options: { min: 0, max: null, noDecimal: true } }),
      new SchemaField({ name: "dilewati", type: "number", required: false, options: { min: 0, max: null, noDecimal: true } }),
      new SchemaField({ name: "durasi_detik", type: "number", required: false, options: { min: 0, max: null, noDecimal: false } }),
      new SchemaField({ name: "catatan_perubahan", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
    ]
  })
  dao.saveCollection(progresRilis)

  // ── 5. PROGRES_KONFIRMASI ──────────────────────────────────────────────────
  const progresKonfirmasi = new Collection({
    name: "progres_konfirmasi",
    type: "base",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    schema: [
      new SchemaField({
        name: "uji", type: "relation", required: true,
        options: { collectionId: "progres_uji", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "versi", type: "text", required: true, options: { min: null, max: 100, pattern: "" } }),
      new SchemaField({
        name: "dikonfirmasi_oleh", type: "relation", required: true,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "waktu", type: "date", required: false, options: { min: "", max: "" } }),
    ]
  })
  dao.saveCollection(progresKonfirmasi)

}, (db) => {
  const dao = new Dao(db)
  for (const name of ["progres_konfirmasi", "progres_rilis", "progres_uji", "progres_fitur", "progres_fase"]) {
    try {
      const col = dao.findCollectionByNameOrId(name)
      dao.deleteCollection(col)
    } catch (_) {}
  }
})
