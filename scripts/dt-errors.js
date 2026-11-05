// scripts/dt-errors.js - Error terstruktur: grup pola error dari journal PocketBase
// Menulis laporan ke pb_public/devtools-errors.json (+salinan drg/).
// Mengelompokkan baris error by signature (teks error tanpa timestamp/pid)
// sehingga pola error berulang terlihat: "Error X muncul 12×".

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const projectRoot = "/home/ardy/projects/webapp-komunitas";
const reportPaths = [
  path.join(projectRoot, "pb_public/devtools-errors.json"),
  path.join(projectRoot, "pb_public/drg/devtools-errors.json"),
];

function runSafe(bin, args) {
  try {
    return execFileSync(bin, args, { encoding: "utf-8", maxBuffer: 512 * 1024 }).trim();
  } catch (_) {
    return "";
  }
}

// Ambil 500 baris terakhir service, filter yang mengandung "error"
const out = runSafe("journalctl", [
  "-u",
  "webapp-komunitas-pocketbase.service",
  "-n",
  "500",
  "--no-pager",
  "-p",
  "err..alert",
]);

const groups = new Map();
for (const rawLine of out.split("\n").filter(Boolean)) {
  // normalisasi: buang timestamp ISO + host:service + pid untuk signature
  const cleaned = rawLine
    .replace(/^\d{4}-\d\d-\d\dT\S+\s+/, "")
    .replace(/^[A-Z][a-z]{2}\s+\d{1,2}\s+\d\d:\d\d:\d\d\s+\S+\s+/, "")
    .replace(/^\S+ \S+:\s*/, "")
    .replace(/pocketbase\[\d+\]:\s*/, "")
    .replace(/systemd\[\d+\]:\s*/, "")
    .trim();
  if (!cleaned) continue;
  const sig = cleaned.slice(0, 160);
  if (!groups.has(sig)) groups.set(sig, { signature: sig, jumlah: 0, terakhir: rawLine.slice(0, 300) });
  const g = groups.get(sig);
  g.jumlah++;
  g.terakhir = rawLine.slice(0, 300);
}

const errors = [...groups.values()].sort((a, b) => b.jumlah - a.jumlah).slice(0, 30);

const report = {
  generated_at: new Date().toISOString(),
  total_error_events: errors.reduce((s, e) => s + e.jumlah, 0),
  pola_unik: errors.length,
  errors,
  catatan: "Error journal PocketBase (priority err..alert) dikelompokkan per signature. Kosong = tidak ada error tercatat.",
};

for (const p of reportPaths) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(report, null, 2));
}
console.log(`[dt-errors] ${report.total_error_events} event, ${errors.length} pola unik`);
