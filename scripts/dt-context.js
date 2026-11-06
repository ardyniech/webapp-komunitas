// scripts/dt-context.js - Paket konteks untuk AI dev (dibaca di awal sesi kerja)
// Menggabungkan: scan ringkas, diagnosa kritikal/tinggi, git status,
// heartbeat, progres, penalti bug — menjadi SATU file markdown agar AI dev
// tidak perlu menjalankan banyak perintah untuk memahami kondisi sistem.
//
// Keluaran: pb_public/devtools-context.md (+salinan drg/)

const fs = require("fs");
const path = require("path");

const projectRoot = "/home/ardy/projects/webapp-komunitas";
const pubDir = path.join(projectRoot, "pb_public");
const outPaths = [
  path.join(pubDir, "devtools-context.md"),
  path.join(pubDir, "drg/devtools-context.md"),
];

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch (_) {
    return {};
  }
}

const scan = readJson(path.join(pubDir, "scan-report.json"));
const diag = readJson(path.join(pubDir, "devtools-diagnose.json"));
const git = readJson(path.join(pubDir, "devtools-git.json"));
const hb = readJson(path.join(pubDir, "devtools-heartbeat.json"));
const db = readJson(path.join(pubDir, "devtools-db.json"));
const links = readJson(path.join(pubDir, "devtools-links.json"));
const errors = readJson(path.join(pubDir, "devtools-errors.json"));

const L = [];
L.push("# Konteks Sistem untuk AI Dev (webapp-komunitas)");
L.push("");
L.push(`Dibangkitkan: ${new Date().toISOString()} (otomatis oleh dt-context.js)`);
L.push("");
L.push("## Ringkasan satu baris");
const krit = (scan.by_severity && scan.by_severity.critical) || 0;
const ting = (scan.by_severity && scan.by_severity.high) || 0;
const sed = (scan.by_severity && scan.by_severity.medium) || 0;
L.push(
  `Bug: ${scan.total_findings || 0} temuan (${krit} kritikal, ${ting} tinggi, ${sed} sedang) | ` +
    `Git: ${git.dirty_count || 0} file kotor di ${git.branch || "-"} | ` +
    `Host: RAM ${hb.ram_pct || "-"}% UDP ${hb.udp_inuse ?? "-"} PB ${hb.pocketbase || "-"} | ` +
    `DB: ${db.total_rows || 0} baris / ${db.collections_count || 0} koleksi`
);
L.push("");
L.push("## Prioritas perbaikan (kritikal + tinggi)");
const top = (diag.diagnosed || []).filter((f) => f.severity === "critical" || f.severity === "high").slice(0, 8);
if (top.length === 0) L.push("Tidak ada bug kritikal/tinggi. Kerja fokus fitur baru.");
top.forEach((f, i) => {
  L.push(`### ${i + 1}. ${f.file} — ${f.message}`);
  if (f.last_commit_file) L.push(`- Commit terakhir file: ${f.last_commit_file}`);
  L.push(`- Akar masalah: ${f.akar_masalah || "-"}`);
  L.push(`- Verifikasi: \`${f.verifikasi || "-"}\``);
  L.push(`- Fix: ${f.fix || "-"}`);
  L.push("");
});
L.push("## File kotor (waspada konflik antar-agen)");
(git.dirty || []).slice(0, 10).forEach((x) => L.push(`- ${x.code} ${x.file}`));
if (!git.dirty || git.dirty.length === 0) L.push("Bersih.");
L.push("");
L.push("## Tautan mati");
if (links.total_dead > 0) {
  (links.routes_dead || []).forEach((r) => L.push(`- Route ${r.route} → HTTP ${r.http}`));
  (links.static_dead || []).forEach((s) => L.push(`- File ${s.ref} tidak ada`));
} else {
  L.push(`Tidak ada (0 dari ${links.static_total || 0} statis + ${links.routes_total || 0} route).`);
}
L.push("");
L.push("## Error journal (pola dominan)");
(errors.errors || []).slice(0, 3).forEach((e) => L.push(`- ${e.jumlah}× ${e.signature}`));
if (!errors.errors || errors.errors.length === 0) L.push("Tidak ada error tercatat.");
L.push("");
L.push("## Checklist AI dev sebelum menyentuh kode");
L.push("1. Baca file ini + `devtools-diagnose.md` (detail per bug).");
L.push("2. Cek `git status` (Dev Tools → Git) — jangan sentuh file kotor agen lain.");
L.push("3. Hook handler: `require(`${__hooks}/lib/...`)` di baris pertama (isolasi runtime).");
L.push("4. Modul JS baru = file atomik <200 baris, daftarkan di index.html + sw.js.");
L.push("5. Setelah ubah: `node --check`, restart service, `curl` health + endpoint disentuh.");
L.push("6. Commit konvensional ID; update changelog `/home/ardy/docs/04-governance/changelog.md`.");
L.push("");

const content = L.join("\n");
for (const p of outPaths) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}
console.log(`[dt-context] paket konteks ditulis -> ${outPaths[0]} (${content.length} bytes)`);
