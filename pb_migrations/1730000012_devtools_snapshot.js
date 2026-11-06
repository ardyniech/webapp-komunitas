
// pb_migrations/1730000012_devtools_snapshot.js - Collection devtools_snapshot (superadmin-only)
migrate((db) => {
  const dao = new Dao(db)
  const collection = new Collection({
    name: "devtools_snapshot",
    type: "base",
    listRule: "@request.auth.role = 'superadmin'",
    viewRule: "@request.auth.role = 'superadmin'",
    createRule: null,
    updateRule: null,
    deleteRule: null,
  })
  collection.schema.addField(new SchemaField({
    name: "kunci", type: "text", required: true,
    options: { min: 1, max: 100, pattern: "" }
  }))
  collection.schema.addField(new SchemaField({
    name: "nilai", type: "text", required: true,
    options: { min: null, max: null, pattern: "" }
  }))
  collection.indexes = ["CREATE UNIQUE INDEX idx_devtools_snapshot_kunci ON devtools_snapshot (kunci)"]
  dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  let collection = null
  try { collection = dao.findCollectionByNameOrId("devtools_snapshot") } catch (_) {}
  if (collection) dao.deleteCollection(collection)
})
