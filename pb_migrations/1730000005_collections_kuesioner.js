/// <reference path="../pb_data/types.d.ts" />

migrate((db) => {
  const dao = new Dao(db)

  // ── 1. KUESIONER ──────────────────────────────────────────────────────────
  const kuesioner = new Collection({
    name: "kuesioner",
    type: "base",
    listRule: '@request.auth.id != "" && aktif = true',
    viewRule: '@request.auth.id != "" && aktif = true',
    createRule: '@request.auth.role = "admin" || @request.auth.role = "pengurus"',
    updateRule: '@request.auth.role = "admin" || @request.auth.role = "pengurus"',
    deleteRule: null,
    schema: [
      new SchemaField({ name: "judul", type: "text", required: true, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "deskripsi", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({
        name: "jenis", type: "select", required: true,
        options: { maxSelect: 1, values: ["uji_pengetahuan", "evaluasi", "survei"] }
      }),
      new SchemaField({ name: "nilai_lulus", type: "number", required: false, options: { min: 0, max: 100, noDecimal: false } }),
      new SchemaField({ name: "acak_soal", type: "bool", required: false }),
      new SchemaField({ name: "batas_waktu_menit", type: "number", required: false, options: { min: 0, max: null, noDecimal: true } }),
      new SchemaField({ name: "aktif", type: "bool", required: false }),
      new SchemaField({
        name: "dibuat_oleh", type: "relation", required: false,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
    ]
  })
  dao.saveCollection(kuesioner)

  // ── 2. PERTANYAAN ─────────────────────────────────────────────────────────
  const pertanyaan = new Collection({
    name: "pertanyaan",
    type: "base",
    listRule: '@request.auth.id != "" && kuesioner.aktif = true',
    viewRule: '@request.auth.id != "" && kuesioner.aktif = true',
    createRule: '@request.auth.role = "admin" || @request.auth.role = "pengurus"',
    updateRule: '@request.auth.role = "admin" || @request.auth.role = "pengurus"',
    deleteRule: null,
    schema: [
      new SchemaField({
        name: "kuesioner", type: "relation", required: true,
        options: { collectionId: "kuesioner", cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "urutan", type: "number", required: true, options: { min: null, max: null, noDecimal: true } }),
      new SchemaField({ name: "teks", type: "text", required: true, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({
        name: "tipe", type: "select", required: true,
        options: { maxSelect: 1, values: ["pilihan_ganda", "benar_salah", "esai_singkat", "skala"] }
      }),
      new SchemaField({ name: "opsi", type: "json", required: false }),
      new SchemaField({ name: "bobot", type: "number", required: false, options: { min: 0, max: null, noDecimal: false } }),
      new SchemaField({ name: "penjelasan", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
    ]
  })
  dao.saveCollection(pertanyaan)

  // ── 3. KUNCI_JAWABAN ──────────────────────────────────────────────────────
  const kunciJawaban = new Collection({
    name: "kunci_jawaban",
    type: "base",
    listRule: null,
    viewRule: null,
    createRule: '@request.auth.role = "admin" || @request.auth.role = "pengurus"',
    updateRule: '@request.auth.role = "admin" || @request.auth.role = "pengurus"',
    deleteRule: null,
    schema: [
      new SchemaField({
        name: "pertanyaan", type: "relation", required: true,
        options: { collectionId: "pertanyaan", cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "jawaban", type: "json", required: true }),
    ]
  })
  dao.saveCollection(kunciJawaban)

  // ── 4. SIKLUS_PENYARINGAN ─────────────────────────────────────────────────
  const siklusPenyaringan = new Collection({
    name: "siklus_penyaringan",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.role = "admin" || @request.auth.role = "pengurus"',
    updateRule: '@request.auth.role = "admin" || @request.auth.role = "pengurus"',
    deleteRule: null,
    schema: [
      new SchemaField({
        name: "kuesioner", type: "relation", required: true,
        options: { collectionId: "kuesioner", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "label", type: "text", required: true, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "mulai", type: "date", required: true, options: { min: "", max: "" } }),
      new SchemaField({ name: "selesai", type: "date", required: true, options: { min: "", max: "" } }),
      new SchemaField({ name: "wajib_semua", type: "bool", required: false }),
    ]
  })
  dao.saveCollection(siklusPenyaringan)

  // ── 5. HASIL ──────────────────────────────────────────────────────────────
  const hasil = new Collection({
    name: "hasil",
    type: "base",
    listRule: '@request.auth.id = anggota || @request.auth.role = "pengurus" || @request.auth.role = "admin"',
    viewRule: '@request.auth.id = anggota || @request.auth.role = "pengurus" || @request.auth.role = "admin"',
    createRule: '@request.auth.id != ""',
    updateRule: null,
    deleteRule: null,
    schema: [
      new SchemaField({
        name: "kuesioner", type: "relation", required: true,
        options: { collectionId: "kuesioner", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({
        name: "siklus", type: "relation", required: false,
        options: { collectionId: "siklus_penyaringan", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({
        name: "anggota", type: "relation", required: true,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "jawaban", type: "json", required: true }),
      new SchemaField({ name: "nilai", type: "number", required: false, options: { min: null, max: null, noDecimal: false } }),
      new SchemaField({ name: "lulus", type: "bool", required: false }),
      new SchemaField({ name: "mulai", type: "date", required: false, options: { min: "", max: "" } }),
      new SchemaField({ name: "selesai", type: "date", required: false, options: { min: "", max: "" } }),
    ]
  })
  dao.saveCollection(hasil)

  // ── 6. PEMBINAAN ──────────────────────────────────────────────────────────
  const pembinaan = new Collection({
    name: "pembinaan",
    type: "base",
    listRule: '@request.auth.role = "admin" || "dewan_etik":timlist ~ @request.auth.tim',
    viewRule: '@request.auth.role = "admin" || "dewan_etik":timlist ~ @request.auth.tim',
    createRule: '@request.auth.role = "admin" || "dewan_etik":timlist ~ @request.auth.tim',
    updateRule: '@request.auth.role = "admin" || "dewan_etik":timlist ~ @request.auth.tim',
    deleteRule: null,
    schema: [
      new SchemaField({
        name: "anggota", type: "relation", required: true,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({
        name: "hasil", type: "relation", required: true,
        options: { collectionId: "hasil", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "catatan", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "tindakan", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({
        name: "status", type: "select", required: false,
        options: { maxSelect: 1, values: ["perlu_dibina", "dalam_pembinaan", "selesai"] }
      }),
      new SchemaField({
        name: "ditangani_oleh", type: "relation", required: false,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
    ]
  })
  dao.saveCollection(pembinaan)

}, (db) => {
  const dao = new Dao(db)
  for (const name of ["pembinaan", "hasil", "siklus_penyaringan", "kunci_jawaban", "pertanyaan", "kuesioner"]) {
    try {
      const col = dao.findCollectionByNameOrId(name)
      dao.deleteCollection(col)
    } catch (_) {}
  }
})
