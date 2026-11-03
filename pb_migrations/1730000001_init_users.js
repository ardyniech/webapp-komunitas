/// <reference path="../pb_data/types.d.ts" />

migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("users")

  // Update rules
  collection.listRule = '@request.auth.id != ""'
  collection.viewRule = '@request.auth.id != ""'
  collection.createRule = null
  collection.updateRule = '@request.auth.id = id || @request.auth.role = "admin"'
  collection.deleteRule = null

  // Add field: nama
  collection.schema.addField(new SchemaField({
    name: "nama",
    type: "text",
    required: true,
    options: { min: null, max: 200, pattern: "" }
  }))

  // Add field: kontak
  collection.schema.addField(new SchemaField({
    name: "kontak",
    type: "text",
    required: false,
    options: { min: null, max: 200, pattern: "" }
  }))

  // Add field: role
  collection.schema.addField(new SchemaField({
    name: "role",
    type: "select",
    required: true,
    options: { maxSelect: 1, values: ["admin", "pengurus", "bendahara", "anggota"] }
  }))

  // Add field: tim
  collection.schema.addField(new SchemaField({
    name: "tim",
    type: "select",
    required: false,
    options: { maxSelect: 10, values: ["dewan_etik", "satgas", "pengurus_tetap", "pengurus_harian"] }
  }))

  // Add field: foto
  collection.schema.addField(new SchemaField({
    name: "foto",
    type: "file",
    required: false,
    options: { maxSelect: 1, maxSize: 2097152, mimeTypes: ["image/jpeg", "image/png", "image/webp"], thumbs: [], protected: false }
  }))

  // Add field: status
  collection.schema.addField(new SchemaField({
    name: "status",
    type: "select",
    required: true,
    options: { maxSelect: 1, values: ["aktif", "nonaktif"] }
  }))

  // Add field: tanggal_gabung
  collection.schema.addField(new SchemaField({
    name: "tanggal_gabung",
    type: "date",
    required: false,
    options: { min: "", max: "" }
  }))

  dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("users")

  const fieldNames = ["nama", "kontak", "role", "tim", "foto", "status", "tanggal_gabung"]
  for (const name of fieldNames) {
    const field = collection.schema.getFieldByName(name)
    if (field) {
      collection.schema.removeField(field.id)
    }
  }

  // Reset rules to defaults
  collection.listRule = "id = @request.auth.id"
  collection.viewRule = "id = @request.auth.id"
  collection.createRule = null
  collection.updateRule = "id = @request.auth.id"
  collection.deleteRule = "id = @request.auth.id"

  dao.saveCollection(collection)
})
