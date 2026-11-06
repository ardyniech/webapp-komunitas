// pb_migrations/1730000015_komunitas_pondasi.js - Pondasi multi-komunitas yang clear.
// 1. Tambah 'aktif' (bool) di koleksi komunitas — status hidup/mati per komunitas.
// 2. Tambah relasi 'komunitas' di koleksi users (min 0, max 1) — ikat user ke komunitas.
// 3. Backfill: semua user existing -> komunitas pertama (record existing); aktif=true.
// Rollback: hapus kedua field (data relasi ikut hilang; komunitas & user tidak dihapus).
migrate((db) => {
  const dao = new Dao(db)

  // ── 1. komunitas.aktif ────────────────────────────────────────────────
  const komunitas = dao.findCollectionByNameOrId("komunitas")
  komunitas.schema.addField(new SchemaField({
    name: "aktif", type: "bool", required: false, options: {}
  }))
  dao.saveCollection(komunitas)

  // ── 2. users.komunitas (relasi) ──────────────────────────────────────
  const users = dao.findCollectionByNameOrId("users")
  users.schema.addField(new SchemaField({
    name: "komunitas", type: "relation", required: false,
    options: { collectionId: komunitas.id, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
  }))
  dao.saveCollection(users)

  // ── 3. Backfill ──────────────────────────────────────────────────────
  const firstKomunitas = dao.findRecordsByFilter("komunitas", "id != ''", "-created", 1, 0, {})[0] || null
  if (firstKomunitas) {
    // komunitas aktif = true utk yg belum punya nilai
    firstKomunitas.set("aktif", true)
    dao.saveRecord(firstKomunitas)

    for (const user of dao.findRecordsByFilter("users", "id != ''", "", 1000, 0, {})) {
      user.set("komunitas", firstKomunitas.id)
      dao.saveRecord(user)
    }
  }
}, (db) => {
  const dao = new Dao(db)
  const users = dao.findCollectionByNameOrId("users")
  const fieldsUser = users.schema.fields().filter((f) => f.name !== "komunitas")
  users.schema = new SchemaFieldList(fieldsUser)
  dao.saveCollection(users)

  const komunitas = dao.findCollectionByNameOrId("komunitas")
  const fieldsKomunitas = komunitas.schema.fields().filter((f) => f.name !== "aktif")
  komunitas.schema = new SchemaFieldList(fieldsKomunitas)
  dao.saveCollection(komunitas)
})
