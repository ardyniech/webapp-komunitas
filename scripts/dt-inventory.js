// scripts/dt-inventory.js - Inventaris sistem: route hook + koleksi DB + file JS
// Menulis laporan ke pb_public/devtools-inventory.json (+salinan drg/).

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const projectRoot = "/home/ardy/projects/webapp-komunitas";
const hooksDir = path.join(projectRoot, "pb_hooks");
const jsDir = path.join(projectRoot, "pb_public/js");
const reportPaths = [
  path.join(projectRoot, "pb_public/devtools-inventory.json"),
  path.join(projectRoot, "pb_public/drg/devtools-inventory.json"),
];

function readSafe(p) {
  try { return fs.readFileSync(p, "utf-8"); } catch (_) { return ""; }
}

// ── route hook ──
const routes = [];
if (fs.existsSync(hooksDir)) {
  for (const f of fs.readdirSync(hooksDir)) {
    if (!f.endsWith(".pb.js")) continue;
    const content = readSafe(path.join(hooksDir, f));
    const re = /routerAdd\("(GET|POST)",\s*"([^"]+)"/g;
    let m;
    while ((m = re.exec(content)) !== null) routes.push({ method: m[1], route: m[2], file: f });
  }
}
routes.sort((a, b) => a.route.localeCompare(b.route));

// ── koleksi DB ──
let collections = [];
try {
  const out = execFileSync("sqlite3", [
    path.join(projectRoot, "pb_data/data.db"),
    "SELECT name FROM _collections WHERE type='base' ORDER BY name;",
  ], { encoding: "utf-8" }).trim();
  collections = out ? out.split("\n").filter(Boolean) : [];
} catch (_) {}

// ── hook handlers per file ──
const hookHandlers = [];
if (fs.existsSync(hooksDir)) {
  for (const f of fs.readdirSync(hooksDir)) {
    if (!f.endsWith(".pb.js")) continue;
    const content = readSafe(path.join(hooksDir, f));
    const hooks = (content.match(/on[A-Z][A-Za-z]*Request|routerAdd\(/g) || []).length;
    hookHandlers.push({ file: f, handlers: hooks });
  }
}

// ── file JS + ukuran (KB) ──
const jsFiles = [];
(function walk(dir, out) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name.endsWith(".js")) {
      out.push({ file: path.relative(projectRoot, full), kb: Math.round(fs.statSync(full).size / 1024) });
    }
  });
})(jsDir, jsFiles);
jsFiles.sort((a, b) => b.kb - a.kb);

const report = {
  generated_at: new Date().toISOString(),
  routes,
  routes_count: routes.length,
  collections,
  collections_count: collections.length,
  hook_handlers: hookHandlers,
  js_files: jsFiles,
  js_count: jsFiles.length,
  js_total_kb: jsFiles.reduce((s, j) => s + j.kb, 0),
};

for (const p of reportPaths) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(report, null, 2));
}
console.log(`[dt-inventory] routes=${routes.length} collections=${collections.length} js=${jsFiles.length} (${report.js_total_kb}KB)`);
