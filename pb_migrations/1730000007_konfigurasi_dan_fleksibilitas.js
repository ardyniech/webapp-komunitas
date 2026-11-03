/// <reference path="../pb_data/types.d.ts" />

migrate((db) => {
  const dao = new Dao(db)

  // ── 1. KONFIGURASI ─────────────────────────────────────────────────────────
  const konfigurasi = new Collection({
    name: "konfigurasi",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.role = "admin"',
    updateRule: '@request.auth.role = "admin"',
    deleteRule: null,
    schema: [
      new SchemaField({ name: "kunci", type: "text", required: true, options: { min: null, max: 150, pattern: "" } }),
      new SchemaField({ name: "nilai", type: "json", required: false }),
      new SchemaField({ name: "deskripsi", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({
        name: "wewenang", type: "select", required: true,
        options: { maxSelect: 1, values: ["admin", "pengurus", "dewan_etik"] }
      }),
      new SchemaField({
        name: "diubah_oleh", type: "relation", required: false,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "diubah_pada", type: "date", required: false, options: { min: "", max: "" } }),
    ],
    indexes: [
      "CREATE UNIQUE INDEX `idx_konfigurasi_kunci` ON `konfigurasi` (`kunci`)"
    ]
  })
  dao.saveCollection(konfigurasi)

  // ── 2. REFERENSI ───────────────────────────────────────────────────────────
  const referensi = new Collection({
    name: "referensi",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.role = "admin"',
    updateRule: '@request.auth.role = "admin"',
    deleteRule: '@request.auth.role = "admin"',
    schema: [
      new SchemaField({ name: "kelompok", type: "text", required: true, options: { min: null, max: 100, pattern: "" } }),
      new SchemaField({ name: "kode", type: "text", required: true, options: { min: null, max: 100, pattern: "" } }),
      new SchemaField({ name: "label", type: "text", required: true, options: { min: null, max: 200, pattern: "" } }),
      new SchemaField({ name: "urutan", type: "number", required: false, options: { min: null, max: null, noDecimal: false } }),
      new SchemaField({ name: "aktif", type: "bool", required: false }),
      new SchemaField({ name: "sistem", type: "bool", required: false }),
    ]
  })
  dao.saveCollection(referensi)

  // ── 3. BIDANG_PROFIL ───────────────────────────────────────────────────────
  const bidangProfil = new Collection({
    name: "bidang_profil",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.role = "admin"',
    updateRule: '@request.auth.role = "admin"',
    deleteRule: '@request.auth.role = "admin"',
    schema: [
      new SchemaField({ name: "kunci", type: "text", required: true, options: { min: null, max: 100, pattern: "" } }),
      new SchemaField({ name: "label", type: "text", required: true, options: { min: null, max: 200, pattern: "" } }),
      new SchemaField({
        name: "tipe", type: "select", required: true,
        options: { maxSelect: 1, values: ["teks", "angka", "tanggal", "pilihan", "ya_tidak"] }
      }),
      new SchemaField({ name: "opsi", type: "json", required: false }),
      new SchemaField({ name: "petunjuk", type: "text", required: false, options: { min: null, max: null, pattern: "" } }),
      new SchemaField({ name: "wajib", type: "bool", required: false }),
      new SchemaField({ name: "tampil_di_pendaftaran", type: "bool", required: false }),
      new SchemaField({ name: "bisa_diubah_anggota", type: "bool", required: false }),
      new SchemaField({
        name: "terlihat_oleh", type: "select", required: true,
        options: { maxSelect: 1, values: ["pribadi", "pengurus", "anggota"] }
      }),
      new SchemaField({ name: "urutan", type: "number", required: false, options: { min: null, max: null, noDecimal: false } }),
      new SchemaField({ name: "aktif", type: "bool", required: false }),
    ],
    indexes: [
      "CREATE UNIQUE INDEX `idx_bidang_profil_kunci` ON `bidang_profil` (`kunci`)"
    ]
  })
  dao.saveCollection(bidangProfil)

  // ── 4. PEMETAAN_IZIN ───────────────────────────────────────────────────────
  const pemetaanIzin = new Collection({
    name: "pemetaan_izin",
    type: "base",
    listRule: '@request.auth.role = "admin"',
    viewRule: '@request.auth.role = "admin"',
    createRule: '@request.auth.role = "admin"',
    updateRule: '@request.auth.role = "admin"',
    deleteRule: '@request.auth.role = "admin"',
    schema: [
      new SchemaField({ name: "izin", type: "text", required: true, options: { min: null, max: 100, pattern: "" } }),
      new SchemaField({
        name: "pemegang_tipe", type: "select", required: true,
        options: { maxSelect: 1, values: ["role", "unit"] }
      }),
      new SchemaField({ name: "pemegang_nilai", type: "text", required: true, options: { min: null, max: 100, pattern: "" } }),
      new SchemaField({ name: "aktif", type: "bool", required: false }),
    ]
  })
  dao.saveCollection(pemetaanIzin)

  // ── 5. UPDATE USERS SCHEMA ─────────────────────────────────────────────────
  const users = dao.findCollectionByNameOrId("users")

  const statusField = users.schema.getFieldByName("status")
  if (statusField) {
    statusField.options = { maxSelect: 1, values: ["menunggu", "aktif", "nonaktif", "ditolak"] }
  }

  users.schema.addField(new SchemaField({ name: "izin", type: "json", required: false }))
  users.schema.addField(new SchemaField({ name: "nama_panggilan", type: "text", required: false, options: { min: null, max: 100, pattern: "" } }))
  users.schema.addField(new SchemaField({ name: "whatsapp", type: "text", required: false, options: { min: null, max: 50, pattern: "" } }))
  users.schema.addField(new SchemaField({ name: "domisili", type: "text", required: false, options: { min: null, max: 200, pattern: "" } }))
  users.schema.addField(new SchemaField({ name: "tanggal_lahir", type: "date", required: false, options: { min: "", max: "" } }))
  users.schema.addField(new SchemaField({ name: "bio", type: "text", required: false, options: { min: null, max: 1000, pattern: "" } }))
  users.schema.addField(new SchemaField({ name: "kontak_darurat_nama", type: "text", required: false, options: { min: null, max: 150, pattern: "" } }))
  users.schema.addField(new SchemaField({ name: "kontak_darurat_telepon", type: "text", required: false, options: { min: null, max: 50, pattern: "" } }))
  users.schema.addField(new SchemaField({ name: "kustom", type: "json", required: false }))
  users.schema.addField(new SchemaField({ name: "visibilitas", type: "json", required: false }))
  users.schema.addField(new SchemaField({ name: "profil_dilengkapi_pada", type: "date", required: false, options: { min: "", max: "" } }))
  users.schema.addField(new SchemaField({ name: "setuju_privasi_pada", type: "date", required: false, options: { min: "", max: "" } }))

  dao.saveCollection(users)

  // ── 6. PROFIL_PUBLIK ───────────────────────────────────────────────────────
  const profilPublik = new Collection({
    name: "profil_publik",
    type: "base",
    listRule: '@request.auth.id != "" && @request.auth.status = "aktif"',
    viewRule: '@request.auth.id != "" && @request.auth.status = "aktif"',
    createRule: null,
    updateRule: null,
    deleteRule: null,
    schema: [
      new SchemaField({
        name: "user", type: "relation", required: true,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "nama_tampil", type: "text", required: true, options: { min: null, max: 200, pattern: "" } }),
      new SchemaField({
        name: "foto", type: "file", required: false,
        options: { maxSelect: 1, maxSize: 2097152, mimeTypes: ["image/jpeg", "image/png", "image/webp"], thumbs: [], protected: false }
      }),
      new SchemaField({ name: "jabatan_ringkas", type: "text", required: false, options: { min: null, max: 150, pattern: "" } }),
      new SchemaField({ name: "unit_ringkas", type: "text", required: false, options: { min: null, max: 150, pattern: "" } }),
      new SchemaField({ name: "bidang_terlihat", type: "json", required: false }),
    ],
    indexes: [
      "CREATE UNIQUE INDEX `idx_profil_publik_user` ON `profil_publik` (`user`)"
    ]
  })
  dao.saveCollection(profilPublik)

  // ── 7. PENDAFTARAN ─────────────────────────────────────────────────────────
  const pendaftaran = new Collection({
    name: "pendaftaran",
    type: "base",
    listRule: '@request.auth.role = "admin"',
    viewRule: '@request.auth.role = "admin"',
    createRule: null,
    updateRule: '@request.auth.role = "admin"',
    deleteRule: null,
    schema: [
      new SchemaField({
        name: "user", type: "relation", required: false,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "nama_lengkap", type: "text", required: true, options: { min: null, max: 200, pattern: "" } }),
      new SchemaField({ name: "whatsapp", type: "text", required: true, options: { min: null, max: 50, pattern: "" } }),
      new SchemaField({ name: "domisili", type: "text", required: false, options: { min: null, max: 200, pattern: "" } }),
      new SchemaField({ name: "alasan_bergabung", type: "text", required: false, options: { min: null, max: 1000, pattern: "" } }),
      new SchemaField({
        name: "diajak_oleh", type: "relation", required: false,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "kode_undangan", type: "text", required: false, options: { min: null, max: 50, pattern: "" } }),
      new SchemaField({ name: "jawaban_kustom", type: "json", required: false }),
      new SchemaField({ name: "setuju_aturan_versi", type: "text", required: false, options: { min: null, max: 50, pattern: "" } }),
      new SchemaField({ name: "setuju_privasi", type: "bool", required: true }),
      new SchemaField({
        name: "status", type: "select", required: true,
        options: { maxSelect: 1, values: ["menunggu", "perlu_data_tambahan", "disetujui", "ditolak", "dibatalkan"] }
      }),
      new SchemaField({
        name: "diproses_oleh", type: "relation", required: false,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
      }),
      new SchemaField({ name: "diproses_pada", type: "date", required: false, options: { min: "", max: "" } }),
      new SchemaField({ name: "catatan_admin", type: "text", required: false, options: { min: null, max: 1000, pattern: "" } }),
      new SchemaField({ name: "alasan_penolakan", type: "text", required: false, options: { min: null, max: 1000, pattern: "" } }),
      new SchemaField({ name: "kode_cek", type: "text", required: true, options: { min: null, max: 100, pattern: "" } }),
    ]
  })
  dao.saveCollection(pendaftaran)

}, (db) => {
  const dao = new Dao(db)

  // Revert collections
  for (const name of ["pendaftaran", "profil_publik", "pemetaan_izin", "bidang_profil", "referensi", "konfigurasi"]) {
    try {
      const col = dao.findCollectionByNameOrId(name)
      dao.deleteCollection(col)
    } catch (_) {}
  }

  // Revert users schema
  try {
    const users = dao.findCollectionByNameOrId("users")
    const fieldsToRemove = [
      "izin", "nama_panggilan", "whatsapp", "domisili", "tanggal_lahir",
      "bio", "kontak_darurat_nama", "kontak_darurat_telepon", "kustom",
      "visibilitas", "profil_dilengkapi_pada", "setuju_privasi_pada"
    ]
    for (const name of fieldsToRemove) {
      const field = users.schema.getFieldByName(name)
      if (field) {
        users.schema.removeField(field.id)
      }
    }
    const statusField = users.schema.getFieldByName("status")
    if (statusField) {
      statusField.options = { maxSelect: 1, values: ["aktif", "nonaktif"] }
    }
    dao.saveCollection(users)
  } catch (_) {}
})
