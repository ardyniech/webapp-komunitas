/// <reference path="../pb_data/types.d.ts" />

migrate((db) => {
  const dao = new Dao(db)

  // ── 1. KOMUNITAS ──────────────────────────────────────────────────────────
  const komunitas = new Collection({
    name: "komunitas",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: '@request.auth.role = "admin"',
    updateRule: '@request.auth.role = "admin"',
    deleteRule: null,
    schema: [
      new SchemaField({ name: "nama", type: "text", required: true, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "tagline", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({
        name: "logo", type: "file", required: false,
        options: { maxSelect: 1, maxSize: 512000, mimeTypes: ["image/jpeg", "image/png", "image/webp"], thumbs: [], protected: false }
      }),
      new SchemaField({ name: "warna_utama", type: "text", required: false, options: { min: null, max: 20, pattern: "" } }),
      new SchemaField({ name: "warna_aksen", type: "text", required: false, options: { min: null, max: 20, pattern: "" } }),
      new SchemaField({ name: "nama_hero", type: "text", required: false, options: { min: null, max: 100, pattern: "" } }),
      new SchemaField({ name: "sapaan", type: "text", required: false, options: { min: null, max: 50, pattern: "" } }),
      new SchemaField({ name: "tentang", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "visi_misi", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "kontak", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "iuran_default", type: "number", required: false, options: { min: 0, max: null, noDecimal: false } }),
    ]
  })
  dao.saveCollection(komunitas)

  // ── 2. UNIT ───────────────────────────────────────────────────────────────
  const unit = new Collection({
    name: "unit",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.role = "admin"',
    updateRule: '@request.auth.role = "admin"',
    deleteRule: null,
    schema: [
      new SchemaField({ name: "nama", type: "text", required: true, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({
        name: "jenis", type: "select", required: false,
        options: { maxSelect: 1, values: ["dewan_etik", "satgas", "pengurus_tetap", "pengurus_harian", "lainnya"] }
      }),
      new SchemaField({ name: "deskripsi", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "tugas", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "urutan", type: "number", required: false, options: { min: null, max: null, noDecimal: false } }),
    ]
  })
  dao.saveCollection(unit)

  // ── 3. JABATAN ────────────────────────────────────────────────────────────
  const jabatan = new Collection({
    name: "jabatan",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.role = "admin"',
    updateRule: '@request.auth.role = "admin"',
    deleteRule: null,
    schema: [
      new SchemaField({
        name: "unit", type: "relation", required: true,
        options: { collectionId: "unit", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({
        name: "anggota", type: "relation", required: true,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "jabatan", type: "text", required: true, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "periode_mulai", type: "date", required: false, options: { min: "", max: "" } }),
      new SchemaField({ name: "periode_selesai", type: "date", required: false, options: { min: "", max: "" } }),
      new SchemaField({ name: "aktif", type: "bool", required: false }),
    ]
  })
  dao.saveCollection(jabatan)

  // ── 4. PENGUMUMAN ─────────────────────────────────────────────────────────
  const pengumuman = new Collection({
    name: "pengumuman",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.role = "admin" || @request.auth.role = "pengurus"',
    updateRule: '@request.auth.role = "admin" || @request.auth.role = "pengurus"',
    deleteRule: null,
    schema: [
      new SchemaField({ name: "judul", type: "text", required: true, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "isi", type: "text", required: true, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "penting", type: "bool", required: false }),
      new SchemaField({ name: "disematkan", type: "bool", required: false }),
      new SchemaField({ name: "kadaluarsa", type: "date", required: false, options: { min: "", max: "" } }),
      new SchemaField({
        name: "penulis", type: "relation", required: false,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
    ]
  })
  dao.saveCollection(pengumuman)

}, (db) => {
  const dao = new Dao(db)
  for (const name of ["jabatan", "pengumuman", "unit", "komunitas"]) {
    try {
      const col = dao.findCollectionByNameOrId(name)
      dao.deleteCollection(col)
    } catch (_) {}
  }
})
