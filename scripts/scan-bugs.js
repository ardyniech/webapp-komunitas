// scripts/scan-bugs.js - Scan bug otomatis untuk webapp-komunitas
// Menulis hasil scan ke pb_public/scan-report.json (bisa difetch oleh frontend).
//
// Cara pakai: node scripts/scan-bugs.js
// Otomatis bisa dijalankan lewat timer atau manual oleh admin.

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const projectRoot = "/home/ardy/projects/webapp-komunitas";
const hooksDir = path.join(projectRoot, "pb_hooks");
const publicDir = path.join(projectRoot, "pb_public");
const jsDir = path.join(publicDir, "js");
const reportPath = path.join(publicDir, "scan-report.json");

const findings = [];

function readFileSafe(filePath) {
  try { return fs.readFileSync(filePath, "utf-8"); } catch (_) { return null; }
}

function addFinding(type, severity, file, line, message) {
  findings.push({ type, severity, file, line, message });
}

// ── 1. Isolated scope bug di hook files ──
const hookFiles = fs.readdirSync(hooksDir).filter(f => f.endsWith(".pb.js"));
for (const hf of hookFiles) {
  const content = readFileSafe(path.join(hooksDir, hf));
  if (!content) continue;

  const fileScopeFuncs = new Set();
  const funcDefRegex = /^function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
  let m;
  while ((m = funcDefRegex.exec(content)) !== null) {
    fileScopeFuncs.add(m[1]);
  }

  const lines = content.split("\n");
  let inHandler = false;
  let handlerDepth = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(onRecord|onBefore|onAfter|routerAdd)\s*\(/.test(line)) {
      inHandler = true;
      handlerDepth = (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
      continue;
    }
    if (inHandler) {
      handlerDepth += (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
      if (handlerDepth <= 0) { inHandler = false; continue; }

      for (const funcName of fileScopeFuncs) {
        const callRegex = new RegExp("(^|[^\\w$.])" + funcName + "\\s*\\(");
        if (callRegex.test(line) && !line.includes("lib.") && !line.includes("this.")) {
          addFinding(
            "isolated_scope", "high",
            "pb_hooks/" + hf, i + 1,
            "Fungsi file-scope '" + funcName + "' dipanggil di dalam handler terisolasi. PocketBase tidak menyediakan variabel luar handler. Gunakan require('${__hooks}/lib/profil.js') atau pindahkan logika ke dalam handler."
          );
        }
      }
    }
  }
}

// ── 2. Syntax error pada semua file JS ──
const jsFiles = [];
function collectJs(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) collectJs(full);
    else if (ent.name.endsWith(".js")) jsFiles.push(full);
  }
}
collectJs(jsDir);
collectJs(hooksDir);

for (const jf of jsFiles) {
  const rel = path.relative(projectRoot, jf);
  const content = readFileSafe(jf);
  if (!content) continue;
  try {
    new Function(content);
  } catch (err) {
    addFinding("syntax_error", "high", rel, -1, "Syntax error: " + err.message);
  }
}

// ── 3. Route hook yang diharapkan vs terdaftar ──
const expectedRoutes = [
  "/api/komunitas/daftar",
  "/api/komunitas/status/:kode",
  "/api/komunitas/cek-status",
  "/api/komunitas/logout-all",
  "/api/komunitas/permintaan-hapus-data",
  "/api/komunitas/progres",
  "/api/komunitas/sync-profil-publik",
  "/api/komunitas/sync-izin",
  "/api/komunitas/pendaftaran/:id/proses"
];
const allHookContent = hookFiles.map(hf => readFileSafe(path.join(hooksDir, hf))).filter(Boolean).join("\n");
for (const route of expectedRoutes) {
  const routePattern = route.replace(/:kode/g, "[^/]+").replace(/:id/g, "[^/]+");
  if (!allHookContent.includes(route) && !new RegExp(routePattern).test(allHookContent)) {
    addFinding("missing_route", "medium", "pb_hooks/*.pb.js", -1,
      "Route '" + route + "' tidak terdaftar di hook.");
  }
}

// ── 4. File JS yang direferensi di index.html tapi tidak ada ──
const indexHtml = readFileSafe(path.join(publicDir, "index.html"));
if (indexHtml) {
  const scriptRefs = indexHtml.match(/<script src="([^"]+)"><\/script>/g) || [];
  for (const ref of scriptRefs) {
    const match = ref.match(/src="([^"]+)"/);
    if (!match) continue;
    const src = match[1];
    const filePath = path.join(publicDir, src.replace("./", ""));
    if (!fs.existsSync(filePath)) {
      addFinding("missing_file", "medium", "pb_public/index.html", -1,
        "File skrip '" + src + "' direferensi di index.html tetapi tidak ada di filesystem.");
    }
  }
}

// ── 5. Koleksi penting ada di DB (via sqlite3) ──
const dbPath = path.join(projectRoot, "pb_data", "data.db");
const requiredCollections = ["users", "profil_publik", "pendaftaran", "bidang_profil", "log_aktivitas", "kas", "iuran", "progres_fase", "progres_fitur", "progres_uji"];
for (const colName of requiredCollections) {
  try {
    const out = execSync(`sqlite3 "${dbPath}" "SELECT count(*) FROM _collections WHERE name='${colName}';"`, { encoding: "utf-8" }).trim();
    if (parseInt(out) === 0) {
      addFinding("missing_collection", "high", "pb_migrations", -1,
        "Koleksi '" + colName + "' tidak ditemukan di database. Jalankan migrasi.");
    }
  } catch (_) {
    addFinding("missing_collection", "high", "pb_migrations", -1,
      "Tidak dapat memeriksa koleksi '" + colName + "' (sqlite3 error).");
  }
}

// ── 6. Cek service pocketbase sedang jalan ──
try {
  execSync("systemctl is-active webapp-komunitas-pocketbase.service", { encoding: "utf-8" });
} catch (_) {
  addFinding("service_down", "high", "systemd", -1,
    "Layanan webapp-komunitas-pocketbase.service tidak aktif. Periksa systemctl status.");
}

// ── Ringkasan ──
const bySeverity = { high: 0, medium: 0, low: 0 };
for (const f of findings) {
  bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
}

const report = {
  scanned_at: new Date().toISOString(),
  total_findings: findings.length,
  by_severity: bySeverity,
  findings: findings
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log("[scan-bugs] Selesai. Total temuan: " + findings.length +
  " (tinggi: " + bySeverity.high + ", sedang: " + bySeverity.medium + ")");
console.log("[scan-bugs] Laporan ditulis ke: " + reportPath);
