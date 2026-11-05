/// <reference path="../pb_data/types.d.ts" />

// 1730000010_profil_anggota_manajemen.js
// Plan §5.8, §5.9, §6.11, §6.12, §6.13 C
// - Kunci daftar user: self + pengurus/manajer saja (anggota lain lewat profil_publik)
// - Tambah ringkasan role & status aktif di profil_publik
// - Tambah role superadmin & tim "lainnya" agar data produksi valid
// - Rapikan izin kelola bidang profil & pengesahan pendaftaran

migrate((db) => {
  const dao = new Dao(db)

  // ── 1. USERS: role superadmin + tim lainnya + aturan baca ─────────────────
  const users = dao.findCollectionByNameOrId("users")

  const roleField = users.schema.getFieldByName("role")
  if (roleField) {
    const values = (roleField.options && roleField.options.values) || []
    if (values.indexOf("superadmin") === -1) values.unshift("superadmin")
    roleField.options = {
      maxSelect: 1,
      values: values
    }
  }

  const timField = users.schema.getFieldByName("tim")
  if (timField) {
    const values = (timField.options && timField.options.values) || []
    if (values.indexOf("lainnya") === -1) values.push("lainnya")
    timField.options = {
      maxSelect: 10,
      values: values
    }
  }

  const bolehLihatSemua = 'id = @request.auth.id || @request.auth.role = "superadmin" || @request.auth.role = "admin" || @request.auth.role = "pengurus" || @request.auth.role = "bendahara" || @request.auth.izin ?~ "kelola_anggota"'
  const bolehKelola = '@request.auth.role = "superadmin" || @request.auth.role = "admin" || @request.auth.izin ?~ "kelola_anggota"'

  users.listRule = bolehLihatSemua
  users.viewRule = bolehLihatSemua
  users.updateRule = 'id = @request.auth.id || ' + bolehKelola
  users.createRule = bolehKelola
  users.deleteRule = null

  dao.saveCollection(users)

  // ── 2. PROFIL_PUBLIK: ringkasan role + status aktif ───────────────────────
  const profilPublik = dao.findCollectionByNameOrId("profil_publik")

  if (!profilPublik.schema.getFieldByName("role_ringkas")) {
    profilPublik.schema.addField(new SchemaField({
      name: "role_ringkas",
      type: "text",
      required: false,
      options: { min: null, max: 50, pattern: "" }
    }))
  }

  if (!profilPublik.schema.getFieldByName("aktif")) {
    profilPublik.schema.addField(new SchemaField({
      name: "aktif",
      type: "bool",
      required: false
    }))
  }

  profilPublik.listRule = '@request.auth.id != "" && @request.auth.status = "aktif" && aktif = true'
  profilPublik.viewRule = '@request.auth.id != "" && @request.auth.status = "aktif" && aktif = true'
  profilPublik.createRule = null
  profilPublik.updateRule = null
  profilPublik.deleteRule = null

  dao.saveCollection(profilPublik)

  // ── 3. BIDANG_PROFIL: tulis hanya pemegang kelola_pengaturan ──────────────
  try {
    const bidang = dao.findCollectionByNameOrId("bidang_profil")
    const bolehAtur = '@request.auth.role = "superadmin" || @request.auth.role = "admin" || @request.auth.izin ?~ "kelola_pengaturan"'
    bidang.createRule = bolehAtur
    bidang.updateRule = bolehAtur
    bidang.deleteRule = bolehAtur
    dao.saveCollection(bidang)
  } catch (_) {}

  // ── 4. PENDAFTARAN: baca/proses hanya penyetuju pendaftaran ───────────────
  try {
    const pendaftaran = dao.findCollectionByNameOrId("pendaftaran")
    const bolehSahkan = '@request.auth.role = "superadmin" || @request.auth.role = "admin" || @request.auth.izin ?~ "sahkan_pendaftaran"'
    pendaftaran.listRule = bolehSahkan
    pendaftaran.viewRule = bolehSahkan
    pendaftaran.updateRule = bolehSahkan
    pendaftaran.createRule = null
    pendaftaran.deleteRule = null
    dao.saveCollection(pendaftaran)
  } catch (_) {}

}, (db) => {
  const dao = new Dao(db)

  // Kembalikan aturan users ke kondisi sebelum migrasi ini.
  try {
    const users = dao.findCollectionByNameOrId("users")
    users.listRule = '@request.auth.id != ""'
    users.viewRule = '@request.auth.id != ""'
    users.updateRule = '@request.auth.id = id || @request.auth.role = "admin"'
    users.createRule = null
    users.deleteRule = null
    dao.saveCollection(users)
  } catch (_) {}

  try {
    const profilPublik = dao.findCollectionByNameOrId("profil_publik")
    const roleField = profilPublik.schema.getFieldByName("role_ringkas")
    if (roleField) profilPublik.schema.removeField(roleField.id)
    const aktifField = profilPublik.schema.getFieldByName("aktif")
    if (aktifField) profilPublik.schema.removeField(aktifField.id)
    profilPublik.listRule = '@request.auth.id != "" && @request.auth.status = "aktif"'
    profilPublik.viewRule = '@request.auth.id != "" && @request.auth.status = "aktif"'
    dao.saveCollection(profilPublik)
  } catch (_) {}

  try {
    const bidang = dao.findCollectionByNameOrId("bidang_profil")
    bidang.createRule = '@request.auth.role = "admin"'
    bidang.updateRule = '@request.auth.role = "admin"'
    bidang.deleteRule = '@request.auth.role = "admin"'
    dao.saveCollection(bidang)
  } catch (_) {}

  try {
    const pendaftaran = dao.findCollectionByNameOrId("pendaftaran")
    pendaftaran.listRule = '@request.auth.role = "admin"'
    pendaftaran.viewRule = '@request.auth.role = "admin"'
    pendaftaran.updateRule = '@request.auth.role = "admin"'
    dao.saveCollection(pendaftaran)
  } catch (_) {}
})
