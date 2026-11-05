// scripts/scan-bugs.js - Bug Hunter Scanner untuk webapp-komunitas (versi cerewet)
// Menulis laporan ke pb_public/scan-report.json (frontend fetch langsung).
//
// Cara pakai manual: node scripts/scan-bugs.js
// Otomatis: systemd user timer (scan-bugs.timer) menjalankan scan-bugs.service

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const projectRoot = "/home/ardy/projects/webapp-komunitas";
const hooksDir = path.join(projectRoot, "pb_hooks");
const publicDir = path.join(projectRoot, "pb_public");
const jsDir = path.join(publicDir, "js");
const indexHtmlPath = path.join(publicDir, "index.html");
const reportPath = path.join(publicDir, "scan-report.json");

const findings = [];
const seenFindings = new Set();
let totalChecked = 0;

function readFileSafe(filePath) {
  try { return fs.readFileSync(filePath, "utf-8"); } catch (_) { return null; }
}

function addFinding(type, severity, file, line, message, suggestion) {
  const key = type + "|" + file + "|" + message;
  if (seenFindings.has(key)) return;
  seenFindings.add(key);
  findings.push({ type, severity, file: file || "-", line: line || -1, message, suggestion: suggestion || "" });
  totalChecked++;
}

// ── 1. Isolated scope bug di hook files ──
const hookFiles = fs.existsSync(hooksDir) ? fs.readdirSync(hooksDir).filter(f => f.endsWith(".pb.js")) : [];
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
            "isolated_scope", "critical",
            "pb_hooks/" + hf, i + 1,
            "Fungsi file-scope '" + funcName + "' dipanggil di dalam handler terisolasi. PocketBase tidak menyediakan variabel luar handler.",
            "Gunakan require('${__hooks}/lib/profil.js') di awal handler atau pindahkan logika ke dalam handler."
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
    addFinding("syntax_error", "critical", rel, -1, "Syntax error: " + err.message, "Perbaiki sintaks JavaScript pada baris yang disebutkan.");
  }
}

// ── 3. Baca index.html untuk referensi elemen & skrip ──
const indexHtml = readFileSafe(indexHtmlPath);
const htmlIds = new Set();
if (indexHtml) {
  const idMatches = indexHtml.match(/id="([^"]+)"/g) || [];
  for (const ref of idMatches) {
    htmlIds.add(ref.replace(/id="/, "").replace(/"/, ""));
  }
}

// ── 4. Cek ID elemen yang direferensi di JS tapi tidak ada di HTML ──
const jsAll = jsFiles.map(jf => readFileSafe(jf)).filter(Boolean).join("\n");
// ID yang dibuat dinamis di JS (tidak akan ada di index.html): jangan laporkan.
const dynamicIds = new Set();
{
  const re1 = /\.setAttribute\(['"]id['"]\s*,\s*['"]([^'"]+)['"]\)/g;
  const re2 = /\.id\s*=\s*['"]([^'"]+)['"]/g;
  const re3 = /id="([^"]+)"/g; // dibuat lewat template innerHTML di JS
  let m;
  while ((m = re1.exec(jsAll)) !== null) dynamicIds.add(m[1]);
  while ((m = re2.exec(jsAll)) !== null) dynamicIds.add(m[1]);
  while ((m = re3.exec(jsAll)) !== null) dynamicIds.add(m[1]);
}
// Fallback dua id (A || B): cukup satu yang ada di HTML — id pasangan diabaikan.
// Contoh: getElementById("bukti-modal-img") || getElementById("bukti-img-preview")
const pairedFallbackIds = new Set();
{
  const fbRe = /getElementById\(['"]([^'"]+)['"]\)\s*\|\|\s*document\.getElementById\(['"]([^'"]+)['"]\)/g;
  let m;
  while ((m = fbRe.exec(jsAll)) !== null) {
    if (htmlIds.has(m[1])) pairedFallbackIds.add(m[2]);
    if (htmlIds.has(m[2])) pairedFallbackIds.add(m[1]);
  }
}
// Pola id dinamis bertemplate (mis. `id="xxx-${y}"`): dideteksi sebagai pola, bukan id pasti.
const getElementByIdMatches = jsAll.match(/document\.getElementById\(['"]([^'"]+)['"]\)/g) || [];
for (const ref of getElementByIdMatches) {
  const id = ref.match(/['"]([^'"]+)['"]/)[1];
  if (id.includes("${") || id.includes("+")) continue; // template dinamis — lewati
  totalChecked++;
  if (!htmlIds.has(id) && !dynamicIds.has(id) && !pairedFallbackIds.has(id)) {
    addFinding("missing_html_id", "medium", "pb_public/js/*.js", -1,
      "ID elemen '" + id + "' dipanggil via document.getElementById tetapi tidak ada di index.html.",
      "Tambahkan elemen dengan id='" + id + "' di index.html atau hapus pemanggilan.");
  }
}

// ── 5. Cek fungsi App.xxx / module.xxx yang dipanggil onclick di HTML tapi tidak ada di JS ──
if (indexHtml && jsAll) {
  const onclickMatches = indexHtml.match(/onclick="([^"]+)"/g) || [];
  const declaredAppFuncs = new Set();
  const appFuncRegex = /([A-Za-z_$][\w$]*)\s*[:=]\s*function|([A-Za-z_$][\w$]*)\s*\(?\s*=\s*\(?\s*async\s*?\)/g;
  let mm;
  while ((mm = appFuncRegex.exec(jsAll)) !== null) {
    const name = mm[1] || mm[2];
    if (name) declaredAppFuncs.add(name);
  }
  // juga tangkap nama method dari AppModules.X = { method() {...} }
  const moduleMethodRegex = /([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/g;
  while ((mm = moduleMethodRegex.exec(jsAll)) !== null) {
    declaredAppFuncs.add(mm[1]);
  }

  for (const ref of onclickMatches) {
    const onclick = ref.match(/onclick="([^"]+)"/)[1];
    // ambil nama fungsi pertama yang dipanggil (App.xxx atau xxx)
    const funcMatch = onclick.match(/(?:App\.)?([A-Za-z_$][\w$]*)\s*\(/);
    if (funcMatch) {
      const funcName = funcMatch[1];
      totalChecked++;
      // skip fungsi native/bawaan browser
      const nativeFuncs = ["alert", "confirm", "console", "fetch", "JSON", "Math", "parseInt", "parseFloat", "encodeURIComponent", "decodeURIComponent", "new", "this", "event", "document", "window", "localStorage", "Hero", "Teks", "getElementById", "getElementsByClassName", "querySelector", "querySelectorAll", "addEventListener", "stopPropagation", "preventDefault", "classList", "setAttribute", "removeAttribute", "style", "innerHTML", "textContent", "value", "checked", "files", "target"];
      if (nativeFuncs.indexOf(funcName) !== -1) continue;
      if (!declaredAppFuncs.has(funcName)) {
        addFinding("missing_js_function", "high", "pb_public/index.html", -1,
          "Fungsi '" + funcName + "' dipanggil onclick di HTML tetapi tidak ditemukan di file JS.",
          "Definisikan method '" + funcName + "' di App atau modul terkait.");
      }
    }
  }
}

// ── 6. Cek route yang dipanggil di frontend tapi tidak terdaftar di backend hook ──
if (indexHtml && jsAll) {
  const frontendRoutes = new Set();
  const fetchMatches = jsAll.match(/`\$\{this\.apiBase\}[^`]*`|"[^"]*api[^"]*"|'[^']*api[^']*'/g) || [];
  // Tangkap pola /api/... dan /komunitas/... dalam string template
  const apiPathMatches = jsAll.match(/\/api\/[^`'"]+|`\/api\/[^`]*`|\$\{this\.apiBase\}[^`]*`/g) || [];
  for (const match of apiPathMatches) {
    const clean = match.replace(/`/g, "").replace("${this.apiBase}", "");
    const parts = clean.split("?")[0].split("&")[0];
    // Abaikan route bawaan PocketBase (built-in): /collections/..., /files/..., /api/...
    if (parts.startsWith("/collections/") || parts.startsWith("/files/") || parts.startsWith("/api/")) continue;
    if (!parts) continue;
    frontendRoutes.add(parts);
  }

  const allHookContent = hookFiles.map(hf => readFileSafe(path.join(hooksDir, hf))).filter(Boolean).join("\n");
  for (const route of frontendRoutes) {
    if (!route) continue;
    totalChecked++;
    const routePattern = route.replace(/:kode/g, "[^/]+").replace(/:id/g, "[^/]+");
    if (!allHookContent.includes(route) && !new RegExp(routePattern).test(allHookContent)) {
      addFinding("missing_backend_route", "high", "pb_public/js/*.js", -1,
        "Frontend memanggil route '" + route + "' tetapi tidak terdaftar di hook PocketBase.",
        "Daftarkan route '" + route + "' di pb_hooks/*.pb.js atau perbaiki pemanggilan frontend.");
    }
  }
}

// ── 7. Cek file skrip yang direferensi di index.html tapi tidak ada ──
if (indexHtml) {
  const scriptRefs = indexHtml.match(/<script src="([^"]+)"><\/script>/g) || [];
  for (const ref of scriptRefs) {
    const match = ref.match(/src="([^"]+)"/);
    if (!match) continue;
    const src = match[1].split("?")[0]; // strip cache-busting ?v=8
    const filePath = path.join(publicDir, src.replace("./", ""));
    totalChecked++;
    if (!fs.existsSync(filePath)) {
      addFinding("missing_file", "high", "pb_public/index.html", -1,
        "File skrip '" + src + "' direferensi di index.html tetapi tidak ada di filesystem.",
        "Buat file '" + src + "' atau hapus referensi di index.html.");
    }
  }
}

// ── 8. Cek modal id yang dibuka tapi tidak ada di HTML ──
if (indexHtml && jsAll) {
  const modalOpenMatches = jsAll.match(/\.classList\.add\("show"\)/g) || [];
  // cari id modal yang disimpan di variabel, sederhana: cari id="modal-..." di HTML
  const modalIdsInHtml = new Set();
  const modalHtmlMatches = indexHtml.match(/id="(modal-[^"]+)"/g) || [];
  for (const ref of modalHtmlMatches) {
    modalIdsInHtml.add(ref.replace(/id="/, "").replace(/"/, ""));
  }
  // cari getElementById("modal-...")
  // Fallback dua id (A || B): cukup satu yang ada di HTML, id lainnya abaikan.
  // Contoh: getElementById("bukti-modal") || getElementById("modal-bukti")
  const fallbackPaired = new Set();
  const fallbackRe = /getElementById\(['"]([^'"]+)['"]\)\s*\|\|\s*document\.getElementById\(['"]([^'"]+)['"]\)/g;
  let fm;
  while ((fm = fallbackRe.exec(jsAll)) !== null) {
    if (htmlIds.has(fm[1])) fallbackPaired.add(fm[2]);
    if (htmlIds.has(fm[2])) fallbackPaired.add(fm[1]);
  }
  const modalJsMatches = jsAll.match(/getElementById\(['"](modal-[^'"]+)['"]\)/g) || [];
  for (const ref of modalJsMatches) {
    const id = ref.match(/['"](modal-[^'"]+)['"]/)[1];
    totalChecked++;
    if (!modalIdsInHtml.has(id) && !fallbackPaired.has(id)) {
      addFinding("missing_modal", "high", "pb_public/js/*.js", -1,
        "Modal '" + id + "' diakses di JS tetapi tidak ada di index.html.",
        "Tambahkan elemen modal dengan id='" + id + "' di index.html.");
    }
  }
}

// ── 9. Koleksi penting ada di DB ──
const dbPath = path.join(projectRoot, "pb_data", "data.db");
const requiredCollections = ["users", "profil_publik", "pendaftaran", "bidang_profil", "log_aktivitas", "kas", "iuran", "progres_fase", "progres_fitur", "progres_uji"];
for (const colName of requiredCollections) {
  try {
    const out = execSync(`sqlite3 "${dbPath}" "SELECT count(*) FROM _collections WHERE name='${colName}';"`, { encoding: "utf-8" }).trim();
    totalChecked++;
    if (parseInt(out) === 0) {
      addFinding("missing_collection", "critical", "pb_migrations", -1,
        "Koleksi '" + colName + "' tidak ditemukan di database. Jalankan migrasi.",
        "Buat/terapkan migrasi untuk koleksi '" + colName + "'.");
    }
  } catch (_) {
    addFinding("missing_collection", "critical", "pb_migrations", -1,
      "Tidak dapat memeriksa koleksi '" + colName + "' (sqlite3 error).", "Periksa koneksi database.");
  }
}

// ── 10. Layanan Pocketbase ──
try {
  execSync("systemctl is-active webapp-komunitas-pocketbase.service", { encoding: "utf-8" });
} catch (_) {
  addFinding("service_down", "critical", "systemd", -1,
    "Layanan webapp-komunitas-pocketbase.service tidak aktif.",
    "Jalankan: sudo systemctl start webapp-komunitas-pocketbase.service");
}

// ── Ringkasan ──
const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
for (const f of findings) {
  bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
}

const report = {
  scanned_at: new Date().toISOString(),
  total_checked: totalChecked,
  total_findings: findings.length,
  by_severity: bySeverity,
  findings: findings
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

// Tulis juga ke pb_public/drg/ agar /drg/scan-report.json tersedia sebagai
// file statis saat diakses via domain /drg/ (Tailscale). PocketBase serve
// file statis dari pb_public/, sehingga path ini akan terlayani dengan benar.
const drgReportPath = path.join(publicDir, "drg", "scan-report.json");
fs.writeFileSync(drgReportPath, JSON.stringify(report, null, 2));
console.log("[scan-bugs] Laporan: " + reportPath + " dan " + drgReportPath);
