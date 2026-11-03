/// <reference path="../pb_data/types.d.ts" />

migrate((db) => {
  const dao = new Dao(db)

  // ── 1. FORUM_TOPIK ────────────────────────────────────────────────────────
  const forumTopik = new Collection({
    name: "forum_topik",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id = penulis || @request.auth.role = "admin" || @request.auth.role = "pengurus"',
    deleteRule: '@request.auth.id = penulis || @request.auth.role = "admin" || @request.auth.role = "pengurus"',
    schema: [
      new SchemaField({ name: "judul", type: "text", required: true, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "isi", type: "text", required: true, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({
        name: "kategori", type: "select", required: false,
        options: { maxSelect: 1, values: ["umum", "tanya_jawab", "saran", "info_orderan", "curhat", "lainnya"] }
      }),
      new SchemaField({
        name: "penulis", type: "relation", required: true,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "disematkan", type: "bool", required: false }),
      new SchemaField({ name: "dikunci", type: "bool", required: false }),
    ]
  })
  dao.saveCollection(forumTopik)

  // ── 2. FORUM_BALASAN ──────────────────────────────────────────────────────
  const forumBalasan = new Collection({
    name: "forum_balasan",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != "" && topik.dikunci = false',
    updateRule: '@request.auth.id = penulis || @request.auth.role = "admin" || @request.auth.role = "pengurus"',
    deleteRule: '@request.auth.id = penulis || @request.auth.role = "admin" || @request.auth.role = "pengurus"',
    schema: [
      new SchemaField({
        name: "topik", type: "relation", required: true,
        options: { collectionId: "forum_topik", cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "isi", type: "text", required: true, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({
        name: "penulis", type: "relation", required: true,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
    ]
  })
  dao.saveCollection(forumBalasan)

  // ── 3. PANDUAN ────────────────────────────────────────────────────────────
  const panduan = new Collection({
    name: "panduan",
    type: "base",
    listRule: '@request.auth.id != "" && diterbitkan = true',
    viewRule: '@request.auth.id != "" && diterbitkan = true',
    createRule: '@request.auth.role = "admin" || @request.auth.role = "pengurus"',
    updateRule: '@request.auth.role = "admin" || @request.auth.role = "pengurus"',
    deleteRule: null,
    schema: [
      new SchemaField({ name: "judul", type: "text", required: true, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "slug", type: "text", required: true, options: { min: null, max: 200, pattern: "" } }),
      new SchemaField({ name: "ringkasan", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "isi", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({
        name: "kategori", type: "select", required: false,
        options: { maxSelect: 1, values: ["masalah_umum", "aturan", "tutorial", "keselamatan", "keuangan", "lainnya"] }
      }),
      new SchemaField({ name: "tag", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({
        name: "sampul", type: "file", required: false,
        options: { maxSelect: 1, maxSize: 2097152, mimeTypes: ["image/jpeg", "image/png", "image/webp"], thumbs: [], protected: false }
      }),
      new SchemaField({ name: "diterbitkan", type: "bool", required: false }),
      new SchemaField({
        name: "penulis", type: "relation", required: false,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
    ]
  })
  dao.saveCollection(panduan)

}, (db) => {
  const dao = new Dao(db)
  for (const name of ["forum_balasan", "forum_topik", "panduan"]) {
    try {
      const col = dao.findCollectionByNameOrId(name)
      dao.deleteCollection(col)
    } catch (_) {}
  }
})
