
// pb_migrations/1730000013_notifikasi.js - Koleksi notifikasi in-app per pengguna.
// Ditulis oleh hook server (lib/notif.js), dibaca user pemilik + admin. Agar bell header
// bisa menampilkan inbox + unread count. Dipakai juga sebagai sinyal admin (pendaftaran menunggu).
migrate((db) => {
  const dao = new Dao(db)
  const collection = new Collection({
    name: "notifikasi",
    type: "base",
    listRule: "user = @request.auth.id || @request.auth.role = 'superadmin' || @request.auth.role = 'admin'",
    viewRule: "user = @request.auth.id || @request.auth.role = 'superadmin' || @request.auth.role = 'admin'",
    createRule: null,
    updateRule: "user = @request.auth.id",
    deleteRule: null,
  })
  collection.schema.addField(new SchemaField({
    name: "user", type: "relation", required: true,
    options: { collectionId: "_pb_users_auth_", cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] }
  }))
  collection.schema.addField(new SchemaField({
    name: "jenis", type: "text", required: true,
    options: { min: 1, max: 60, pattern: "" }
  }))
  collection.schema.addField(new SchemaField({
    name: "judul", type: "text", required: true,
    options: { min: 1, max: 200, pattern: "" }
  }))
  collection.schema.addField(new SchemaField({
    name: "isi", type: "text", required: false,
    options: { min: null, max: 2000, pattern: "" }
  }))
  collection.schema.addField(new SchemaField({
    name: "tab_tujuan", type: "text", required: false,
    options: { min: null, max: 60, pattern: "" }
  }))
  collection.schema.addField(new SchemaField({
    name: "dibaca", type: "bool", required: false,
    options: { }
  }))
  collection.schema.addField(new SchemaField({
    name: "waktu", type: "date", required: true,
    options: { min: "", max: "" }
  }))
  dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  let collection = null
  try { collection = dao.findCollectionByNameOrId("notifikasi") } catch (_) {}
  if (collection) dao.deleteCollection(collection)
})
