// pb_migrations/1730000014_komunitas_slug.js - tambah komunitas_id & slug ke koleksi komunitas.
// Dipakai panel admin "Panel Personalifikasi" (panel-admin.html) untuk memilih komunitas
// aktif + identitas unik per komunitas. Tanpa ubah aturan/skema lain.
// komunitas_id = record PK (identitas stabil & unik, tidak tergantung nama).
migrate((db) => {
  const dao = new Dao(db)
  const col = dao.findCollectionByNameOrId("komunitas")
  col.schema.addField(new SchemaField({
    name: "komunitas_id", type: "text", required: false,
    options: { min: null, max: 60, pattern: "" }
  }))
  col.schema.addField(new SchemaField({
    name: "slug", type: "text", required: false,
    options: { min: null, max: 80, pattern: "" }
  }))
  dao.saveCollection(col)

  // Backfill record existing: komunitas_id = PK recordnya sendiri; slug dari nama.
  // (findRecordsByFilter butuh filter non-kosong; 'id != ""' ambil semua.)
  for (const rec of dao.findRecordsByFilter("komunitas", "id != ''", "", 100, 0, {})) {
    rec.set("komunitas_id", rec.id)
    const nama = rec.get("nama") || "komunitas"
    const slug = nama.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80)
    if (slug) rec.set("slug", slug)
    dao.saveRecord(rec)
  }
}, (db) => {
  const dao = new Dao(db)
  const col = dao.findCollectionByNameOrId("komunitas")
  const fields = col.schema.fields().filter((f) => f.name !== "komunitas_id" && f.name !== "slug")
  col.schema = new SchemaFieldList(fields)
  dao.saveCollection(col)
})
