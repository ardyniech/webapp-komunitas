// scripts/dt-drift.js - Doc drift checker: PLAN vs registry vs kode nyata
// Menulis laporan ke pb_public/devtools-drift.json (+salinan drg/).
// Tujuan: tandai bagian PLAN yang belum ada implementasinya, dan fitur
// yang ada di kode tapi tidak direncanakan (menyimpang tapi mungkin wajar).

const fs = require("fs");
const path = require("path");

const projectRoot = "/home/ardy/projects/webapp-komunitas";
const reportPaths = [
  path.join(projectRoot, "pb_public/devtools-drift.json"),
  path.join(projectRoot, "pb_public/drg/devtools-drift.json"),
];

function readSafe(p) {
  try { return fs.readFileSync(p, "utf-8"); } catch (_) { return ""; }
}

// ── registry: kode fase/fitur + jumlah uji ──
let registry = { fase: [] };
try { registry = JSON.parse(readSafe(path.join(projectRoot, "progres/registry.json"))); } catch (_) {}
const registryFase = new Set((registry.fase || []).map((f) => f.kode));
const registryFitur = [];
(registry.fase || []).forEach((f) => (f.fitur || []).forEach((it) => registryFitur.push(it.kode)));

// ── PLAN.md: headings §5.x dan §6.x ──
const plan = readSafe(path.join(projectRoot, "PLAN.md"));
const planSections = [];
plan.split("\n").forEach((line, idx) => {
  const m = line.match(/^##\s+(5\.\d+|6\.\d+|6)\b|^##\s+([1-6])\./);
  if (m) planSections.push({ line: idx + 1, title: line.replace(/^##\s+/, "").slice(0, 60) });
});

// ── kode nyata: file hook, js, collection (via sqlite3) ──
const hookFiles = fs.existsSync(path.join(projectRoot, "pb_hooks"))
  ? fs.readdirSync(path.join(projectRoot, "pb_hooks")).filter((f) => f.endsWith(".pb.js"))
  : [];
const jsFiles = [];
(function walk(dir, out) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name.endsWith(".js")) out.push(path.relative(projectRoot, full));
  });
})(path.join(projectRoot, "pb_public/js"), jsFiles);

const drift = {
  generated_at: new Date().toISOString(),
  registry_fase: [...registryFase].sort(),
  registry_fitur_count: registryFitur.length,
  plan_sections_count: planSections.length,
  plan_sections: planSections.slice(0, 40),
  hooks: hookFiles,
  hooks_count: hookFiles.length,
  js_files: jsFiles,
  js_count: jsFiles.length,
  catatan: "Perbandingan kasar: bagian PLAN yang tidak punya jejak di registry/hook/js kandidat untuk ditinjau manual. Bukan vonis otomatis.",
};

for (const p of reportPaths) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(drift, null, 2));
}
console.log(`[dt-drift] plan_section=${planSections.length} registry_fase=${registryFase.size} hook=${hookFiles.length} js=${jsFiles.length}`);
