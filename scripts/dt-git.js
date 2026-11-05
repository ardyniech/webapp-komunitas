// scripts/dt-git.js - Git watcher: status kotor + commit terakhir per direktori
// Menulis laporan ke pb_public/devtools-git.json (dipakai halaman Dev Tools).
//
// Cara pakai: node scripts/dt-git.js
// Otomatis: dijalankan oleh devtools-snapshot.service bersama scanner lain.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const projectRoot = "/home/ardy/projects/webapp-komunitas";
const reportPaths = [
  path.join(projectRoot, "pb_public/devtools-git.json"),
  path.join(projectRoot, "pb_public/drg/devtools-git.json"),
];

function run(args) {
  try {
    return execFileSync("git", args, { encoding: "utf-8", cwd: projectRoot }).trim();
  } catch (_) {
    return "";
  }
}

// ── git status --short ──
const statusOut = run(["status", "--porcelain"]);
const dirty = statusOut
  ? statusOut.split("\n").filter(Boolean).map((line) => ({
      code: line.slice(0, 2).trim(),
      file: line.slice(3).trim().replace(/^"|"$/g, ""),
    }))
  : [];

// ── commit terakhir per direktori kunci ──
const dirs = ["pb_hooks", "pb_public/js", "pb_public", "progres", "scripts", "pb_migrations"];
const lastCommitPerDir = dirs.map((d) => {
  const hash = run(["log", "-1", "--format=%h", "--", d]);
  const msg = run(["log", "-1", "--format=%s", "--", d]);
  const date = run(["log", "-1", "--format=%cs", "--", d]);
  return { dir: d, hash: hash || "-", subject: msg || "-", date: date || "-" };
});

// ── lima commit terakhir ──
const recent = run(["log", "-5", "--format=%h|%cs|%s"])
  .split("\n")
  .filter(Boolean)
  .map((l) => {
    const [hash, date, subject] = l.split("|");
    return { hash, date, subject };
  });

const branch = run(["branch", "--show-current"]) || "-";

const report = {
  generated_at: new Date().toISOString(),
  branch,
  dirty_count: dirty.length,
  dirty,
  last_commit_per_dir: lastCommitPerDir,
  recent,
};

for (const p of reportPaths) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(report, null, 2));
}
console.log(`[dt-git] branch=${branch} dirty=${dirty.length} -> ${reportPaths[0]}`);
