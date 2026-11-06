// scripts/dt-write.js - Penulis snapshot devtools (atomik).
// Menulis ke 2 tempat NON-PUBLIK:
//   1. tabel DB devtools_snapshot (dibaca hook /api/komunitas/devtools, superadmin-only)
//   2. data/devtools/<name>.json (untuk AI dev membaca via filesystem)

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const projectRoot = "/home/ardy/projects/webapp-komunitas";
const dbPath = path.join(projectRoot, "pb_data/data.db");
const dirData = path.join(projectRoot, "data/devtools");

function sqlEsc(s) {
  return String(s == null ? "" : s).replace(/'/g, "''");
}

function writeOutputs(name, data) {
  const json = JSON.stringify(data, null, 2);
  fs.mkdirSync(dirData, { recursive: true });
  fs.writeFileSync(path.join(dirData, name + ".json"), json);
  const sql =
    `INSERT OR REPLACE INTO devtools_snapshot (kunci, nilai, updated) ` +
    `VALUES ('${sqlEsc(name)}', '${sqlEsc(json)}', strftime('%Y-%m-%d %H:%M:%fZ','now'));`;
  try {
    execFileSync("sqlite3", [dbPath, sql], { encoding: "utf-8" });
  } catch (e) {
    console.warn(`[dt-write] gagal tulis DB untuk ${name}: ${e.message}`);
  }
}

module.exports = { writeOutputs };
