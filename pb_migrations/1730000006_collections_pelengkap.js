/// <reference path="../pb_data/types.d.ts" />

migrate((db) => {
  const dao = new Dao(db)

  // ── 1. PENGADUAN ──────────────────────────────────────────────────────────
  const pengaduan = new Collection({
    name: "pengaduan",
    type: "base",
    listRule: '@request.auth.id != "" && (anonim = false && @request.auth.id = pelapor || @request.auth.role = "admin" || "dewan_etik":timlist ~ @request.auth.tim)',
    viewRule: '@request.auth.id != "" && (anonim = false && @request.auth.id = pelapor || @request.auth.role = "admin" || "dewan_etik":timlist ~ @request.auth.tim)',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.role = "admin" || "dewan_etik":timlist ~ @request.auth.tim',
    deleteRule: null,
    schema: [
      new SchemaField({ name: "kategori", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "isi", type: "text", required: true, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "anonim", type: "bool", required: false }),
      new SchemaField({
        name: "pelapor", type: "relation", required: false,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "kode_cek", type: "text", required: false, options: { min: null, max: 100, pattern: "" } }),
      new SchemaField({
        name: "status", type: "select", required: false,
        options: { maxSelect: 1, values: ["baru", "diproses", "selesai", "ditolak"] }
      }),
      new SchemaField({ name: "catatan_dewan", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
    ]
  })
  dao.saveCollection(pengaduan)

  // ── 2. POLLING ────────────────────────────────────────────────────────────
  const polling = new Collection({
    name: "polling",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.role = "admin" || @request.auth.role = "pengurus"',
    updateRule: null,
    deleteRule: null,
    schema: [
      new SchemaField({ name: "pertanyaan", type: "text", required: true, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "opsi", type: "json", required: true }),
      new SchemaField({ name: "anonim", type: "bool", required: false }),
      new SchemaField({ name: "batas_waktu", type: "date", required: false, options: { min: "", max: "" } }),
      new SchemaField({
        name: "dibuat_oleh", type: "relation", required: false,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
    ]
  })
  dao.saveCollection(polling)

  // ── 3. POLLING_SUARA ──────────────────────────────────────────────────────
  const pollingSuara = new Collection({
    name: "polling_suara",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: null,
    deleteRule: null,
    schema: [
      new SchemaField({
        name: "polling", type: "relation", required: true,
        options: { collectionId: "polling", cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({
        name: "anggota", type: "relation", required: true,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "pilihan", type: "json", required: true }),
    ]
  })
  dao.saveCollection(pollingSuara)

  // ── 4. NOTULEN ────────────────────────────────────────────────────────────
  const notulen = new Collection({
    name: "notulen",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.role = "admin" || @request.auth.role = "pengurus"',
    updateRule: '@request.auth.role = "admin" || @request.auth.role = "pengurus"',
    deleteRule: null,
    schema: [
      new SchemaField({
        name: "agenda", type: "relation", required: true,
        options: { collectionId: "agenda", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "isi", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "keputusan", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({
        name: "penulis", type: "relation", required: false,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
    ]
  })
  dao.saveCollection(notulen)

  // ── 5. KEHADIRAN ──────────────────────────────────────────────────────────
  const kehadiran = new Collection({
    name: "kehadiran",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.role = "admin" || @request.auth.role = "pengurus"',
    updateRule: '@request.auth.role = "admin" || @request.auth.role = "pengurus"',
    deleteRule: null,
    schema: [
      new SchemaField({
        name: "agenda", type: "relation", required: true,
        options: { collectionId: "agenda", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({
        name: "anggota", type: "relation", required: true,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({
        name: "status", type: "select", required: false,
        options: { maxSelect: 1, values: ["hadir", "izin", "tidak_hadir"] }
      }),
    ]
  })
  dao.saveCollection(kehadiran)

  // ── 6. DOKUMEN ────────────────────────────────────────────────────────────
  const dokumen = new Collection({
    name: "dokumen",
    type: "base",
    listRule: '@request.auth.id != "" && (hanya_pengurus = false || @request.auth.role = "admin" || @request.auth.role = "pengurus")',
    viewRule: '@request.auth.id != "" && (hanya_pengurus = false || @request.auth.role = "admin" || @request.auth.role = "pengurus")',
    createRule: '@request.auth.role = "admin" || @request.auth.role = "pengurus"',
    updateRule: '@request.auth.role = "admin" || @request.auth.role = "pengurus"',
    deleteRule: null,
    schema: [
      new SchemaField({ name: "judul", type: "text", required: true, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({
        name: "berkas", type: "file", required: false,
        options: {
          maxSelect: 1, maxSize: 10485760,
          mimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
          thumbs: [], protected: false
        }
      }),
      new SchemaField({ name: "kategori", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "hanya_pengurus", type: "bool", required: false }),
    ]
  })
  dao.saveCollection(dokumen)

  // ── 7. LOG_AKTIVITAS ──────────────────────────────────────────────────────
  const logAktivitas = new Collection({
    name: "log_aktivitas",
    type: "base",
    listRule: '@request.auth.role = "admin"',
    viewRule: '@request.auth.role = "admin"',
    createRule: null,
    updateRule: null,
    deleteRule: null,
    schema: [
      new SchemaField({
        name: "aktor", type: "relation", required: false,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "aksi", type: "text", required: true, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "target", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "waktu", type: "date", required: true, options: { min: "", max: "" } }),
    ]
  })
  dao.saveCollection(logAktivitas)

}, (db) => {
  const dao = new Dao(db)
  for (const name of ["polling_suara", "polling", "pengaduan", "notulen", "kehadiran", "dokumen", "log_aktivitas"]) {
    try {
      const col = dao.findCollectionByNameOrId(name)
      dao.deleteCollection(col)
    } catch (_) {}
  }
})
