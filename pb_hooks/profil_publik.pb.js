// pb_hooks/profil_publik.pb.js - Sinkronisasi Profil Publik Aman (Plan §5.8)

onRecordAfterCreateRequest((e) => {
  try {
    const dao = $app.dao();
    const userRecord = e.record;
    const pubCol = dao.findCollectionByNameOrId("profil_publik");
    let pubRec = null;
    try {
      pubRec = dao.findFirstRecordByData("profil_publik", "user", userRecord.id);
    } catch (_) {}

    if (!pubRec) {
      pubRec = new Record(pubCol);
      pubRec.set("user", userRecord.id);
    }

    const namaPanggilan = userRecord.get("nama_panggilan");
    const nama = userRecord.get("nama");
    const username = userRecord.getUsername();
    pubRec.set("nama_tampil", namaPanggilan || nama || username);
    pubRec.set("foto", userRecord.get("foto") || "");

    let visibilitas = userRecord.get("visibilitas");
    if (typeof visibilitas === "string") {
      try { visibilitas = JSON.parse(visibilitas); } catch (_) { visibilitas = {}; }
    }
    visibilitas = visibilitas || {};

    const bidangTerlihat = {};
    if (visibilitas.whatsapp === "semua" || visibilitas.whatsapp === "anggota") {
      bidangTerlihat.whatsapp = userRecord.get("whatsapp");
    }
    if (visibilitas.domisili === "semua" || visibilitas.domisili === "anggota") {
      bidangTerlihat.domisili = userRecord.get("domisili");
    }
    if (visibilitas.bio === "semua" || visibilitas.bio === "anggota") {
      bidangTerlihat.bio = userRecord.get("bio");
    }

    pubRec.set("bidang_terlihat", bidangTerlihat);
    dao.saveRecord(pubRec);
  } catch (err) {
    // Sinkronisasi profil publik jangan membatalkan operasi
  }
}, "users");

onRecordAfterUpdateRequest((e) => {
  try {
    const dao = $app.dao();
    const userRecord = e.record;
    const pubCol = dao.findCollectionByNameOrId("profil_publik");
    let pubRec = null;
    try {
      pubRec = dao.findFirstRecordByData("profil_publik", "user", userRecord.id);
    } catch (_) {}

    if (!pubRec) {
      pubRec = new Record(pubCol);
      pubRec.set("user", userRecord.id);
    }

    const namaPanggilan = userRecord.get("nama_panggilan");
    const nama = userRecord.get("nama");
    const username = userRecord.getUsername();
    pubRec.set("nama_tampil", namaPanggilan || nama || username);
    pubRec.set("foto", userRecord.get("foto") || "");

    let visibilitas = userRecord.get("visibilitas");
    if (typeof visibilitas === "string") {
      try { visibilitas = JSON.parse(visibilitas); } catch (_) { visibilitas = {}; }
    }
    visibilitas = visibilitas || {};

    const bidangTerlihat = {};
    if (visibilitas.whatsapp === "semua" || visibilitas.whatsapp === "anggota") {
      bidangTerlihat.whatsapp = userRecord.get("whatsapp");
    }
    if (visibilitas.domisili === "semua" || visibilitas.domisili === "anggota") {
      bidangTerlihat.domisili = userRecord.get("domisili");
    }
    if (visibilitas.bio === "semua" || visibilitas.bio === "anggota") {
      bidangTerlihat.bio = userRecord.get("bio");
    }

    pubRec.set("bidang_terlihat", bidangTerlihat);
    dao.saveRecord(pubRec);
  } catch (err) {
    // Sinkronisasi profil publik jangan membatalkan operasi
  }
}, "users");
