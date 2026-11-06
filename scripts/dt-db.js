// scripts/dt-db.js - Kesegaran data per koleksi: row count + max(updated)
// Menulis laporan ke data/devtools/devtools-db.json (+salinan drg/).
// Dibaca dari SQLite via sqlite3 (L0 read-only). Koleksi tanpa kolom updated dilewati.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const projectRoot = "/home/ardy/projects/webapp-komunitas";
const dbPath = path.join(projectRoot, "pb_data/data.db");
function sqlite(sql) {
  try {
    return execFileSync("sqlite3", [dbPath, sql], { encoding: "utf-8" }).trim();
  } catch (_) {
    return "";
  }
}

const tablesOut = sqlite("SELECT name FROM _collections WHERE type='base' ORDER BY name;");
const collections = tablesOut ? tablesOut.split("\n").filter(Boolean) : [];

const freshness = collections.map((name) => {
  const cols = sqlite(`PRAGMA table_info("${name}");`)
    .split("\n")
    .map((l) => (l.split("|")[1] || "").toLowerCase())
    .filter(Boolean);
  const count = parseInt(sqlite(`SELECT COUNT(*) FROM "${name}";`) || "0", 10);
  let terbaru = null;
  if (cols.includes("updated")) {
    terbaru = sqlite(`SELECT MAX(updated) FROM "${name}";`) || null;
  } else if (cols.includes("created")) {
    terbaru = sqlite(`SELECT MAX(created) FROM "${name}";`) || null;
  }
  // umur dalam jam (untuk badge kesegaran)
  let umurJam = null;
  if (terbaru) {
    const iso = terbaru.endsWith("Z") ? terbaru.replace(" ", "T") : terbaru.replace(" ", "T") + "Z";
    const t = new Date(iso).getTime();
    if (!isNaN(t)) umurJam = Math.round(((Date.now() - t) / 3600000) * 10) / 10;
  }
  return { koleksi: name, rows: count, terbaru, umur_jam: umurJam };
});

// Urut: paling basi dulu (paling menarik perhatian)
freshness.sort((a, b) => (b.umur_jam ?? -1) - (a.umur_jam ?? -1));

const report = {
  generated_at: new Date().toISOString(),
  collections_count: collections.length,
  total_rows: freshness.reduce((s, c) => s + c.rows, 0),
  freshness,
  catatan: "Koleksi paling basi = kandidat tidak terpakai / sync macet. Kosong = belum pernah ada data.",
};

require("./dt-write").writeOutputs("devtools-db", report);
const basi = freshness.filter((f) => f.umur_jam !== null && f.umur_jam >  72);
console.log(`[dt-db] ${collections.length} koleksi, ${report.total_rows} baris, >72 jam basi: ${basi.length}`);
