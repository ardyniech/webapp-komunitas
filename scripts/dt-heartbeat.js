// scripts/dt-heartbeat.js - Host heartbeat: uptime, RAM, socket UDP, disk
// Menulis laporan ke data/devtools/devtools-heartbeat.json (+salinan drg/).
// Semua dibaca dari /proc & perintah L0 (tidak mengubah sistem).

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const projectRoot = "/home/ardy/projects/webapp-komunitas";
function readSafe(p) {
  try { return fs.readFileSync(p, "utf-8"); } catch (_) { return ""; }
}
function runSafe(bin, args) {
  try { return execFileSync(bin, args, { encoding: "utf-8" }).trim(); } catch (_) { return ""; }
}

// Uptime (detik sejak boot)
const uptimeSec = Math.floor(os.uptime());
const uptimeStr = `${Math.floor(uptimeSec / 3600)}j ${Math.floor((uptimeSec % 3600) / 60)}m ${uptimeSec % 60}d`;

// RAM
const totalMem = os.totalmem();
const freeMem = os.freemem();
const usedMem = totalMem - freeMem;
const memPct = totalMem ? Math.round((usedMem / totalMem) * 100) : 0;

// Socket UDP (deteksi kebocoran seperti kasus 9remote: normal puluhan)
let udpInuse = null;
const sockstat = readSafe("/proc/net/sockstat");
const m = sockstat.match(/UDP:\s*inuse\s+(\d+)/);
if (m) udpInuse = parseInt(m[1], 10);

// FD tertinggi per proses (top 3)
let topFds = [];
try {
  const pids = fs.readdirSync("/proc").filter((d) => /^\d+$/.test(d));
  const arr = [];
  for (const pid of pids) {
    try {
      const n = fs.readdirSync(`/proc/${pid}/fd`).length;
      let cmd = readSafe(`/proc/${pid}/comm`).trim().slice(0, 20);
      arr.push({ pid, cmd, fds: n });
    } catch (_) {}
  }
  topFds = arr.sort((a, b) => b.fds - a.fds).slice(0, 3);
} catch (_) {}

// Disk /
const dfOut = runSafe("df", ["-h", "/"]);
let diskLine = "";
try {
  const lines = dfOut.split("\n").filter(Boolean);
  diskLine = lines[lines.length - 1] || "";
} catch (_) {}
const diskParts = diskLine.split(/\s+/);
const diskUsed = diskParts[4] || "-";
const diskAvail = diskParts[3] || "-";

// Service pocketbase
const svcActive = runSafe("systemctl", ["is-active", "webapp-komunitas-pocketbase.service"]) || "unknown";

const report = {
  generated_at: new Date().toISOString(),
  uptime_sec: uptimeSec,
  uptime_str: uptimeStr,
  ram_total_mb: Math.round(totalMem / 1024 / 1024),
  ram_used_mb: Math.round(usedMem / 1024 / 1024),
  ram_free_mb: Math.round(freeMem / 1024 / 1024),
  ram_pct: memPct,
  udp_inuse: udpInuse,
  udp_waspada: udpInuse !== null && udpInuse > 5000,
  top_fds: topFds,
  disk_used_pct: diskUsed,
  disk_avail: diskAvail,
  pocketbase: svcActive,
  platform: os.platform(),
  node: process.version,
};

require("./dt-write").writeOutputs("devtools-heartbeat", report);
console.log(`[dt-heartbeat] uptime=${uptimeStr} ram=${memPct}% udp=${udpInuse} pb=${svcActive}`);
