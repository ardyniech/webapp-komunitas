/// <reference path="../pb_data/types.d.ts" />

migrate((db) => {
  const dao = new Dao(db)

  // ── 1. KAS ────────────────────────────────────────────────────────────────
  const kas = new Collection({
    name: "kas",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.role = "admin" || @request.auth.role = "bendahara"',
    updateRule: null,
    deleteRule: null,
    schema: [
      new SchemaField({
        name: "tanggal",
        type: "date",
        required: true,
        options: { min: "", max: "" }
      }),
      new SchemaField({
        name: "jenis",
        type: "select",
        required: true,
        options: { maxSelect: 1, values: ["masuk", "keluar"] }
      }),
      new SchemaField({
        name: "nominal",
        type: "number",
        required: true,
        options: { min: 0.01, max: null, noDecimal: false }
      }),
      new SchemaField({
        name: "kategori",
        type: "select",
        required: true,
        options: { maxSelect: 1, values: ["iuran", "donasi", "operasional", "sosial", "lainnya"] }
      }),
      new SchemaField({
        name: "keterangan",
        type: "text",
        required: true,
        options: { min: null, max: 500, pattern: "" }
      }),
      new SchemaField({
        name: "bukti",
        type: "file",
        required: false,
        options: { maxSelect: 1, maxSize: 2097152, mimeTypes: ["image/jpeg", "image/png", "image/webp"], thumbs: [], protected: false }
      }),
      new SchemaField({
        name: "dicatat_oleh",
        type: "relation",
        required: true,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({
        name: "mengoreksi",
        type: "relation",
        required: false,
        // Self-referential: collection not yet saved; using empty string — will be patched after save
        options: { collectionId: "", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
    ]
  })
  dao.saveCollection(kas)

  // Patch self-referential "mengoreksi" field with actual collection id
  const savedKas = dao.findCollectionByNameOrId("kas")
  const mengoreksiField = savedKas.schema.getFieldByName("mengoreksi")
  if (mengoreksiField) {
    mengoreksiField.options = {
      collectionId: savedKas.id,
      cascadeDelete: false,
      minSelect: null,
      maxSelect: 1,
      displayFields: []
    }
  }
  dao.saveCollection(savedKas)

  // ── 2. IURAN ──────────────────────────────────────────────────────────────
  const iuran = new Collection({
    name: "iuran",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.role = "admin" || @request.auth.role = "bendahara"',
    updateRule: '@request.auth.role = "admin" || @request.auth.role = "bendahara"',
    deleteRule: null,
    schema: [
      new SchemaField({
        name: "anggota",
        type: "relation",
        required: true,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({
        name: "periode",
        type: "text",
        required: true,
        options: { min: null, max: 7, pattern: "" }
      }),
      new SchemaField({
        name: "nominal",
        type: "number",
        required: true,
        options: { min: 0, max: null, noDecimal: false }
      }),
      new SchemaField({
        name: "status",
        type: "select",
        required: true,
        options: { maxSelect: 1, values: ["lunas", "belum"] }
      }),
      new SchemaField({
        name: "kas",
        type: "relation",
        required: false,
        options: { collectionId: "kas", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
    ]
  })
  dao.saveCollection(iuran)

  // ── 3. AGENDA ─────────────────────────────────────────────────────────────
  const agenda = new Collection({
    name: "agenda",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.role = "admin"',
    updateRule: '@request.auth.role = "admin"',
    deleteRule: null,
    schema: [
      new SchemaField({
        name: "judul",
        type: "text",
        required: true,
        options: { min: null, max: null, pattern: "" }
      }),
      new SchemaField({
        name: "tanggal",
        type: "date",
        required: true,
        options: { min: "", max: "" }
      }),
      new SchemaField({
        name: "lokasi",
        type: "text",
        required: false,
        options: { min: null, max: null, pattern: "" }
      }),
      new SchemaField({
        name: "catatan",
        type: "text",
        required: false,
        options: { min: null, max: null, pattern: "" }
      }),
    ]
  })
  dao.saveCollection(agenda)

}, (db) => {
  const dao = new Dao(db)
  for (const name of ["iuran", "kas", "agenda"]) {
    try {
      const col = dao.findCollectionByNameOrId(name)
      dao.deleteCollection(col)
    } catch (_) {}
  }
})
