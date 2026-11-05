// scripts/dt-security.js - Audit keamanan repo: secret bocor, versi, paparan file publik
// Menulis laporan ke pb_public/devtools-security.json (+salinan drg/).
// Pola secret: token API key, password hardcoded, private key block.
// File publik statis (scan-report/devtools-*) dicatat sebagai paparan info.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const projectRoot = "/home/ardy/projects/webapp-komunitas";
const pubDir = path.join(projectRoot, "pb_public");
const reportPaths = [
  path.join(pubDir, "devtools-security.json"),
  path.join(pubDir, "drg/devtools-security.json"),
];

function run(bin, args) {
  try {
    return execFileSync(bin, args, { encoding: "utf-8", cwd: projectRoot, maxBuffer: 256 * 1024 }).trim();
  } catch (_) {
    return "";
  }
}

const findings = [];

// ── 1. Secret leak di file ter-commit (git tracked) ──
const trackedOut = run("git", ["ls-files", "-z"]);
const tracked = trackedOut ? trackedOut.split("\0").filter(Boolean) : [];
const secretReList = [
  { re: /sk-[A-Za-z0-9]{20,}/, label: "API key (sk-...)" },
  { re: /ghp_[A-Za-z0-9]{30,}/, label: "GitHub token (ghp_...)" },
  { re: /AKIA[0-9A-Z]{16}/, label: "AWS access key" },
  { re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/, label: "Private key block" },
  { re: /(password|secret|token)\s*[:=]\s*['"][^'"]{8,}['"]/i, label: "password/secret hardcoded" },
];
for (const rel of tracked) {
  if (!/\.(js|pb\.js|json|md|sh|py)$/.test(rel)) continue;
  if (rel.startsWith("pb_migrations")) continue; // berisi hash awal, bukan secret live
  if (rel === "pb_public/teks.js" || rel === "pb_public/hero.js") continue; // bundle teks UI, string label bukan secret
  let content = "";
  try {
    content = fs.readFileSync(path.join(projectRoot, rel), "utf-8");
  } catch (_) {
    continue;
  }
  for (const { re, label } of secretReList) {
    const m = content.match(re);
    if (m) {
      findings.push({
        type: "secret_leak",
        severity: "critical",
        file: rel,
        message: `Indikasi ${label} di file ter-commit.`,
        suggestion: "Hapus dari git history (filter-repo) dan rotasi kuncinya. Jangan commit secret.",
      });
      break;
    }
  }
}

// ── 2. Versi PocketBase terpasang ──
const pbVersion = run("./pocketbase", ["--version"]) || "unknown";

// ── 3. File publik statis yang bisa diakses tanpa login ──
const publicJson = [];
if (fs.existsSync(pubDir)) {
  for (const f of fs.readdirSync(pubDir)) {
    if (f.endsWith(".json") && fs.statSync(path.join(pubDir, f)).size > 0) publicJson.push(f);
  }
}

const report = {
  generated_at: new Date().toISOString(),
  pocketbase_version: pbVersion,
  tracked_files_checked: tracked.length,
  secret_findings: findings,
  secret_count: findings.length,
  public_json_files: publicJson,
  catatan_paparan:
    "File JSON dinamis di pb_public/ (scan-report, devtools-*) tersaji TANPA perlu login karena file statis PocketBase. " +
    "Isinya tidak memuat secret (sudah diredaksi), tetapi memuat struktur kode/file. " +
    "Jika ingin diproteksi: pindahkan ke route hook yang butuh login.",
};

for (const p of reportPaths) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(report, null, 2));
}
console.log(`[dt-security] tracked=${tracked.length} secret=${findings.length} pb=${pbVersion.split(" ")[0]} public_json=${publicJson.length}`);
