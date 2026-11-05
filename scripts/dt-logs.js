// scripts/dt-logs.js - Log viewer: tail journal PocketBase (terbatas, tanpa secret)
// Menulis laporan ke pb_public/devtools-logs.json (+salinan drg/).
// Hanya log service webapp-komunitas-pocketbase, maks 60 baris terakhir.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const projectRoot = "/home/ardy/projects/webapp-komunitas";
const reportPaths = [
  path.join(projectRoot, "pb_public/devtools-logs.json"),
  path.join(projectRoot, "pb_public/drg/devtools-logs.json"),
];

function runSafe(bin, args) {
  try {
    return execFileSync(bin, args, { encoding: "utf-8", maxBuffer: 256 * 1024 }).trim();
  } catch (_) {
    return "";
  }
}

const out = runSafe("journalctl", [
  "-u", "webapp-komunitas-pocketbase.service",
  "-n", "60",
  "--no-pager",
  "-o", "short-iso",
]);

// Redaksi token/secret sederhana (safety)
const lines = out
  .split("\n")
  .filter(Boolean)
  .map((l) => l.replace(/(Bearer\s+)[A-Za-z0-9._-]+/g, "$1<redacted>").slice(0, 300));

const report = {
  generated_at: new Date().toISOString(),
  service: "webapp-komunitas-pocketbase.service",
  lines_count: lines.length,
  lines,
  catatan: "Tail 60 baris terakhir. Token disamarkan otomatis.",
};

for (const p of reportPaths) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(report, null, 2));
}
console.log(`[dt-logs] lines=${lines.length} -> ${reportPaths[0]}`);
