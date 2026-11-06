// scripts/dt-links.js - Audit tautan hidup: curl semua route + file statis
// Menulis laporan ke data/devtools/devtools-links.json (+salinan drg/).
// Status: hidup = merespons (200/401/403 = route ada), mati = 404/timeout.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const projectRoot = "/home/ardy/projects/webapp-komunitas";
const publicDir = path.join(projectRoot, "pb_public");
function readSafe(p) {
  try {
    return fs.readFileSync(p, "utf-8");
  } catch (_) {
    return "";
  }
}

function curlStatus(url, method) {
  try {
    const args = ["-sS", "-m", "8", "-o", "/dev/null", "-w", "%{http_code}"];
    if (method && method !== "GET") args.push("-X", method, "-H", "Content-Type: application/json", "-d", "{}");
    args.push(url);
    const out = execFileSync("curl", args, { encoding: "utf-8" }).trim();
    return parseInt(out, 10) || 0;
  } catch (_) {
    return 0;
  }
}

// ── 1. Semua file statis yang direferensi index.html harus ada ──
const indexHtml = readSafe(path.join(publicDir, "index.html"));
const fileRefs = [];
{
  const re = /(?:src|href)="([^"]+?)"/g;
  let m;
  while ((m = re.exec(indexHtml)) !== null) {
    const ref = m[1].split("?")[0];
    if (/^(https?:|data:|mailto:|#)/.test(ref)) continue;
    fileRefs.push(ref);
  }
}
const staticChecks = [...new Set(fileRefs)].map((ref) => {
  const full = path.join(publicDir, ref.replace(/^\//, ""));
  const exists = fs.existsSync(full);
  return { ref, ok: exists };
});
const deadFiles = staticChecks.filter((c) => !c.ok);

// ── 2. Route hook: curl ke PocketBase langsung ──
const hooksDir = path.join(projectRoot, "pb_hooks");
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
const routeChecks = routes.map((r) => {
  const testRoute = r.route
    .replace(/:kode/g, "REG-TEST")
    .replace(/:id/g, "testid123456");
  const url = `http://100.117.176.41:8095${testRoute}`;
  const status = curlStatus(url, r.method);
  const adaParam = r.route.includes(":");
  // POST route hidup bila merespons 400/401/403/422 (validasi/auth), bukan 404/timeout.
  // GET route hidup bila bukan 404/timeout (401/403 = ada, butuh login).
  // Route berparameter: 404 juga bisa berarti route ada tapi data tidak ditemukan.
  const hidup = adaParam ? status !== 0 : status !== 0 && status !== 404;
  return { ...r, test_url: url, http: status, hidup };
});
const deadRoutes = routeChecks.filter((r) => !r.hidup);

// ── 3. Route bawaan PocketBase (health + collections) ──
const builtin = ["health", "collections", "collections/users/records"].map((p) => {
  const status = curlStatus(`http://100.117.176.41:8095/api/${p}`);
  return { path: "/api/" + p, http: status, hidup: status !== 0 && status !== 404 };
});

const report = {
  generated_at: new Date().toISOString(),
  static_total: staticChecks.length,
  static_dead: deadFiles,
  routes_total: routeChecks.length,
  routes_dead: deadRoutes,
  route_checks: routeChecks,
  builtin,
  total_dead: deadFiles.length + deadRoutes.length,
};

require("./dt-write").writeOutputs("devtools-links", report);
console.log(`[dt-links] static ${staticChecks.length} (mati ${deadFiles.length}) routes ${routeChecks.length} (mati ${deadRoutes.length})`);
