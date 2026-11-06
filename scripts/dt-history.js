// scripts/dt-history.js - Riwayat tren: append snapshot ringkas ke history.ndjson
// Berbeda dengan snapshot lain yang DITIMPA tiap run, file ini APPEND.
// Menghasilkan dua keluaran:
//   1. data/devtools/devtools-history.json (+salinan drg/) — ringkasan untuk UI (sparkline terakhir)
//   2. data/devtools/devtools-history.ndjson (+salinan drg/) — riwayat append-only (maks 500 baris, dipangkas)

const fs = require("fs");
const path = require("path");

const projectRoot = "/home/ardy/projects/webapp-komunitas";
const dataDir = path.join(projectRoot, "data/devtools");
const ndPaths = [path.join(dataDir, "devtools-history.ndjson"), path.join(dataDir, "drg/devtools-history.ndjson")];
const jsonPaths = [path.join(dataDir, "devtools-history.json"), path.join(dataDir, "drg/devtools-history.json")];

function readSafe(p) {
  try {
    return fs.readFileSync(p, "utf-8");
  } catch (_) {
    return "";
  }
}

function readJson(p) {
  try {
    return JSON.parse(readSafe(p));
  } catch (_) {
    return {};
  }
}

// Ambil snapshot ringkas dari laporan yang sudah ada (scan + db + heartbeat)
const scan = readJson(path.join(dataDir, "scan-report.json"));
const db = readJson(path.join(dataDir, "devtools-db.json"));
const hb = readJson(path.join(dataDir, "devtools-heartbeat.json"));

const entry = {
  waktu: new Date().toISOString(),
  bug_kritikal: (scan.by_severity && scan.by_severity.critical) || 0,
  bug_tinggi: (scan.by_severity && scan.by_severity.high) || 0,
  bug_sedang: (scan.by_severity && scan.by_severity.medium) || 0,
  bug_total: scan.total_findings || 0,
  db_rows: db.total_rows || 0,
  ram_pct: hb.ram_pct || 0,
  udp: hb.udp_inuse || 0,
};

// Baca riwayat lama, tambahkan entry, pangkas ke 500 terakhir
let history = [];
try {
  history = readSafe(ndPaths[0])
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
} catch (_) {}
history.push(entry);
if (history.length > 500) history = history.slice(-500);

const ndContent = history.map((h) => JSON.stringify(h)).join("\n") + "\n";
for (const p of ndPaths) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, ndContent);
}

// Ringkasan untuk UI: 10 terakhir dengan delta vs sebelumnya
const recent = history.slice(-10);
const summary = {
  generated_at: new Date().toISOString(),
  titik: history.length,
  recent,
  delta_vs_sebelumnya: recent.length > 1
    ? recent[recent.length - 1].bug_total - recent[recent.length - 2].bug_total
    : 0,
  catatan: "Riwayat append-only di devtools-history.ndjson (maks 500 baris).",
};
for (const p of jsonPaths) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(summary, null, 2));
}
console.log(`[dt-history] titik=${history.length} bug_total=${entry.bug_total} -> ${jsonPaths[0]}`);
