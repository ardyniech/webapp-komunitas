// scripts/dt-diagnose.js - Diagnosa akar masalah untuk setiap temuan bug
// Membaca pb_public/scan-report.json lalu memperkayanya dengan:
//   - hipotesis akar masalah (berdasarkan pola type + konteks kode)
//   - file terdampak + baris relevan
//   - perintah verifikasi cepat (curl / node --check / grep)
//   - langkah fix yang bisa langsung dieksekusi AI dev / human dev
//
// Dua keluaran:
//   1. data/devtools/devtools-diagnose.json (+salinan drg/) — untuk UI Dev Tools
//   2. data/devtools/devtools-diagnose.md (+salinan drg/) — ringkasan untuk AI dev

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const projectRoot = "/home/ardy/projects/webapp-komunitas";
function readSafe(p) {
  try {
    return fs.readFileSync(p, "utf-8");
  } catch (_) {
    return "";
  }
}

let scanReport = {};
try {
  scanReport = JSON.parse(readSafe(path.join(projectRoot, "data/devtools/scan-report.json")));
} catch (_) {}

const findings = scanReport.findings || [];

// ── Helper konteks kode per type ──
function readLines(file, around) {
  const full = path.join(projectRoot, file);
  const content = readSafe(full);
  if (!content || !around || around <= 0) return "";
  const lines = content.split("\n");
  const start = Math.max(0, around - 3);
  const end = Math.min(lines.length, around + 2);
  return lines
    .slice(start, end)
    .map((l, i) => `${start + i + 1}: ${l.trim()}`)
    .join("\n")
    .slice(0, 600);
}

function diagnose(f) {
  const t = f.type;
  const d = { ...f };

  if (t === "syntax_error") {
    d.akar_masalah =
      "File JS tidak bisa diparse browser/Node (identifikator ganda atau sintaks rusak). File yang rusak ini bisa memblokir pemuatan seluruh modul terkait di UI.";
    d.verifikasi = `node --check ${f.file}  # lihat baris errornya`;
    d.fix = "Perbaiki sintaks sesuai pesan error node --check, lalu jalankan: node --check <file> sampai OK, lalu hard refresh browser (Ctrl+F5).";
    d.konteks = readLines(f.file, 0).slice(0, 400);
  } else if (t === "isolated_scope") {
    d.akar_masalah =
      "Di PocketBase, setiap handler hook/route dieksekusi dalam runtime terisolasi. Konstanta/fungsi file-scope TIDAK terlihat di dalam handler → ReferenceError saat runtime. Ini persis penyebab outage produksi 13 jam (2026-11-05).";
    d.verifikasi = `grep -n "function ${f.message.match(/'([^']+)'/) ? f.message.match(/'([^']+)'/)[1] : ""}" ${f.file}`;
    d.fix = "Pindahkan logika ke dalam handler, atau ambil helper bersama lewat require(`${__hooks}/lib/<file>.js`) di baris pertama handler (pola pb_hooks/lib/profil.js).";
    d.konteks = readLines(f.file, f.line);
  } else if (t === "missing_html_id") {
    d.akar_masalah =
      "JS memanggil document.getElementById('<id>') tetapi elemen dengan id itu tidak ada di index.html. Kemungkinan: (a) id typo/berubah nama, (b) elemen dibuat dinamis dan tidak terdaftar di allowlist scanner, atau (c) elemen benar-benar belum dibuat di HTML.";
    d.verifikasi = `grep -rn '"${f.message.match(/'([^']+)'/) ? f.message.match(/'([^']+)'/)[1] : ""}"' pb_public/index.html pb_public/js/`;
    d.fix = "Jika elemen harus ada: tambahkan elemen ber-id itu di index.html. Jika elemen dibuat dinamis di JS: pastikan dibuat sebelum dipanggil (setAttribute('id', ...) ada sebelum getElementById).";
    d.konteks = readLines(f.file.replace("pb_public/js/*.js", "pb_public/js"), 0);
  } else if (t === "missing_modal") {
    d.akar_masalah =
      "JS membuka modal (classList.add('show')) dengan id yang tidak ada di index.html. Tombol yang membuka modal ini akan gagal diam-diam saat diklik user.";
    d.verifikasi = `grep -n "modal" pb_public/index.html | head`;
    d.fix = "Samakan id modal di JS dengan id di index.html (cek juga 2 temuan tinggi sebelumnya: modal-bukti vs bukti-modal).";
    d.konteks = "";
  } else if (t === "missing_js_function") {
    d.akar_masalah =
      "Tombol di HTML (onclick) memanggil fungsi App.* yang tidak didefinisikan di modul JS mana pun. Klik akan melempar error dan tombol 'mati'.";
    d.verifikasi = `grep -rn "function ${f.message.match(/'([^']+)'/) ? f.message.match(/'([^']+)'/)[1] : ""}\\b\|${f.message.match(/'([^']+)'/) ? f.message.match(/'([^']+)'/)[1] : ""}\\s*(" pb_public/js/`;
    d.fix = "Definisikan method itu di modul yang sesuai (AppModules.*) atau hapus onclick dari HTML.";
    d.konteks = "";
  } else if (t === "missing_backend_route") {
    d.akar_masalah =
      "Frontend memanggil route backend yang tidak terdaftar di hook mana pun. Request akan 404 / SPA fallback HTML → error JSON parse di frontend.";
    d.verifikasi = `grep -rn "routerAdd" pb_hooks/ | grep -i "${f.message.match(/'([^']+)'/) ? f.message.match(/'([^']+)'/)[1].split('/').pop().replace(/[^A-Za-z0-9-]/g, "") : ""}"`;
    d.fix = "Daftarkan route di file hook yang sesuai (pola routerAdd di pb_hooks/*.pb.js), atau perbaiki URL di frontend ke route yang sudah ada.";
    d.konteks = "";
  } else if (t === "missing_collection") {
    d.akar_masalah =
      "Koleksi database yang dibutuhkan belum ada (migration belum diterapkan atau service belum restart setelah migration baru ditambahkan).";
    d.verifikasi = `ls pb_migrations/ | grep -i ${f.file.replace(/[^A-Za-z0-9-]/g, "") || "scan"} ; systemctl status webapp-komunitas-pocketbase.service`;
    d.fix = "Terapkan migration: sudo systemctl restart webapp-komunitas-pocketbase.service, lalu cek: sqlite3 pb_data/data.db 'SELECT name FROM _collections;'";
    d.konteks = "";
  } else if (t === "service_down") {
    d.akar_masalah = "Layanan PocketBase produksi tidak aktif — webapp tidak bisa melayani semua API.";
    d.verifikasi = "systemctl status webapp-komunitas-pocketbase.service; journalctl -u webapp-komunitas-pocketbase.service -n 20";
    d.fix = "sudo systemctl start webapp-komunitas-pocketbase.service; curl http://100.117.176.41:8095/api/health";
    d.konteks = "";
  } else if (t === "missing_file") {
    d.akar_masalah = "File referensi (script/index) tidak ada di filesystem — browser akan 404 saat memuat halaman.";
    d.verifikasi = `ls -l pb_public/ | grep -i ${f.message.match(/'([^']+)'/) ? f.message.match(/'([^']+)'/)[1].split("/").pop() : ""}`;
    d.fix = "Buat file yang hilang atau hapus referensinya dari index.html.";
    d.konteks = "";
  } else {
    d.akar_masalah = "Temuan umum — lihat pesan dan saran pada laporan scan.";
    d.verifikasi = "-";
    d.fix = f.suggestion || "-";
    d.konteks = "";
  }

  return d;
}

const diagnosed = findings.map(diagnose);
const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
diagnosed.forEach((f) => { bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1; });

const report = {
  generated_at: new Date().toISOString(),
  total_findings: diagnosed.length,
  by_severity: bySeverity,
  diagnosed,
  // Ringkasan satu kalimat untuk AI dev
  ringkasan_ai:
    diagnosed.length === 0
      ? "Tidak ada bug terdeteksi. Sistem sehat."
      : `${diagnosed.length} temuan (${bySeverity.critical} kritikal, ${bySeverity.high} tinggi, ${bySeverity.medium} sedang). ` +
        `Mulai dari kritikal: ${diagnosed.find((f) => f.severity === "critical")?.message || "-"} — lihat field akar_masalah, verifikasi, dan fix untuk perintah siap salin.`,
};

// ── Keluaran JSON (UI) ──
require("./dt-write").writeOutputs("devtools-diagnose", report);

// ── Keluaran Markdown (AI dev & human) ──
const mdLines = [];
mdLines.push("# Diagnosa Bug — Ringkasan untuk AI Dev & Human Dev");
mdLines.push("");
mdLines.push(`Dihasilkan: ${report.generated_at} (${diagnosed.length} temuan)`);
mdLines.push("");
mdLines.push(`> ${report.ringkasan_ai}`);
mdLines.push("");
mdLines.push("## Daftar Temuan (urut tingkat bahaya)");
mdLines.push("");
diagnosed.forEach((f, i) => {
  mdLines.push(`### ${i + 1}. [${f.severity.toUpperCase()}] ${f.type} — \`${f.file}\`${f.line > 0 ? ":" + f.line : ""}`);
  mdLines.push("");
  mdLines.push(`**Temuan:** ${f.message}`);
  if (f.suggestion) mdLines.push(`**Saran:** ${f.suggestion}`);
  if (f.akar_masalah) mdLines.push(`**Akar masalah:** ${f.akar_masalah}`);
  if (f.verifikasi) mdLines.push(`**Verifikasi cepat:** \`${f.verifikasi}\``);
  if (f.fix) mdLines.push(`**Langkah fix:** ${f.fix}`);
  if (f.konteks) mdLines.push(`**Konteks kode:**\n\`\`\`\n${f.konteks}\n\`\`\``);
  mdLines.push("");
});
const mdContent = mdLines.join("\n");
const mdPath = path.join(projectRoot, "data/devtools/devtools-diagnose.md");
fs.mkdirSync(path.dirname(mdPath), { recursive: true });
fs.writeFileSync(mdPath, mdContent);

console.log(`[dt-diagnose] ${diagnosed.length} temuan didiagnosa`);
