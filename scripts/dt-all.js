// scripts/dt-all.js - Runner semua snapshot dev tools (dijalankan oleh timer systemd)
// Menjalankan berurutan: scan-bugs, dt-git, dt-heartbeat, dt-drift, dt-inventory,
// dt-releases, dt-logs, dt-diagnose. Tiap langkah gagal independen (tidak blokir lainnya).

const { execFileSync } = require("child_process");
const path = require("path");

const root = "/home/ardy/projects/webapp-komunitas";
const steps = [
  "scan-bugs.js",
  "dt-git.js",
  "dt-heartbeat.js",
  "dt-drift.js",
  "dt-inventory.js",
  "dt-releases.js",
  "dt-logs.js",
  "dt-links.js",
  "dt-diagnose.js", // harus terakhir: membaca scan-report.json dari scan-bugs
];

let ok = 0;
for (const s of steps) {
  try {
    execFileSync("node", [path.join(root, "scripts", s)], {
      encoding: "utf-8",
      cwd: root,
    });
    ok++;
  } catch (e) {
    console.warn(`[dt-all] GAGAL: ${s} :: ${String(e.message).slice(0, 160)}`);
  }
}
console.log(`[dt-all] Selesai: ${ok}/${steps.length} langkah sukses`);
