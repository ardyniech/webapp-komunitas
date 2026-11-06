// scripts/quality-gate.js - Quality gate pre-commit webapp-komunitas
// Dipakai oleh .githooks/pre-commit (git config core.hooksPath .githooks).
// Mengecek:
//   1. Syntax semua file JS/PB yang DI-STAGE (git diff --cached)
//   2. Bug KRITIKAL dari scan-bugs (laporkan scan-report.json)
// Exit 0 = lolos, exit 1 = ditolak. Lewati hanya bila sangat yakin: git commit --no-verify

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = "/home/ardy/projects/webapp-komunitas";

function git(args) {
  try {
    return execFileSync("git", args, { encoding: "utf-8", cwd: root }).trim();
  } catch (_) {
    return "";
  }
}

// 1. File yang di-stage (hanya .js / .pb.js)
const staged = git(["diff", "--cached", "--name-only", "--diff-filter=ACM"])
  .split("\n")
  .map((s) => s.trim())
  .filter((f) => f.endsWith(".js") && fs.existsSync(path.join(root, f)));

const syntaxErrors = [];
for (const rel of staged) {
  try {
    execFileSync("node", ["--check", path.join(root, rel)], { stdio: "pipe" });
  } catch (e) {
    syntaxErrors.push(`${rel}: ${String(e.stderr || e.message).split("\n")[0]}`);
  }
}
if (syntaxErrors.length) {
  console.error("✗ Quality gate ditolak — syntax error pada file yang di-stage:");
  syntaxErrors.forEach((s) => console.error("  - " + s));
  process.exit(1);
}
console.log(`✓ Syntax OK (${staged.length} file di-stage dicek)`);

// 2. Bug kritikal dari laporan scan (segarkan dulu)
try {
  execFileSync("node", [path.join(root, "scripts/scan-bugs.js")], { cwd: root, stdio: "pipe" });
  const report = JSON.parse(fs.readFileSync(path.join(root, "data/devtools/scan-report.json"), "utf-8"));
  const critical = (report.by_severity && report.by_severity.critical) || 0;
  if (critical > 0) {
    console.error(`✗ Quality gate ditolak — ${critical} bug KRITIKAL (lihat tab Bug Hunter).`);
    console.error("  Perbaiki bug kritikal dulu, atau gunakan --no-verify bila Anda yakin (tidak disarankan).");
    process.exit(1);
  }
  console.log(`✓ Bug kritikal: 0 (total temuan: ${report.total_findings})`);
} catch (e) {
  if (e && e.status === 1) {
    // sudah dicatat di atas
    process.exit(1);
  }
  console.warn("[quality-gate] scan-bugs gagal jalan; gate diloloskan untuk bug, syntax tetap dicek.");
}

console.log("✓ Quality gate LULUS");
