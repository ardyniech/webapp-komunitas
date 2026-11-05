// pb_hooks/lib/bug_progres.js - Logika penalti bug untuk progres (dev tool, ATOMIK).
//
// File ini SENGAJA terpisah dari progres.pb.js agar fitur bug-penalty
// tidak menyusup ke kode progres lama. Di-require oleh bug_penalties.pb.js.
//
// Rumus penalti (transparan, ditampilkan di UI):
//   kritikal * 3 + tinggi * 2 + sedang * 0.5 + low * 0.1
// Persen akhir = max(0, persen_dasar - penalti). Dibatasi maks 50 poin
// agar satu audit tidak menghapus seluruh progres.

function hitungPenalti(report) {
  if (!report || typeof report !== "object") {
    return {
      ada_data: false,
      kritikal: 0, tinggi: 0, sedang: 0, low: 0, total_findings: 0,
      penalti: 0, rumus: "kristikal*3 + tinggi*2 + sedang*0.5 + low*0.1",
      catatan: "Laporan scan belum tersedia."
    };
  }
  const sev = report.by_severity || {};
  const kritikal = Number(sev.critical) || 0;
  const tinggi = Number(sev.high) || 0;
  const sedang = Number(sev.medium) || 0;
  const low = Number(sev.low) || 0;
  const mentah = kritikal * 3 + tinggi * 2 + sedang * 0.5 + low * 0.1;
  const penalti = Math.min(50, Math.round(mentah * 10) / 10);
  return {
    ada_data: true,
    kritikal: kritikal,
    tinggi: tinggi,
    sedang: sedang,
    low: low,
    total_checked: Number(report.total_checked) || 0,
    total_findings: Number(report.total_findings) || 0,
    scanned_at: report.scanned_at || "",
    penalti: penalti,
    penalti_mentah: Math.round(mentah * 10) / 10,
    rumus: "kritikal*3 + tinggi*2 + sedang*0.5 + low*0.1 (maks 50)",
    catatan: "Penalti dari hasil scan Bug Hunter. Betul = progres turun secara jujur."
  };
}

// Proporsional + lantai 5%: progres tidak pernah 0 selama UI bisa diakses,
// tapi tetap brutal — penalti 50 memangkas nilai jadi 5% dari progres dasar.
// akhir = dasar * max(0.05, 1 - penalti/50)
// Contoh: dasar 15, penalti 29 -> 15 * 0.42 = 6.3
function terapkanPenalti(persenDasar, penalti) {
  const d = Number(persenDasar) || 0;
  const p = Number(penalti) || 0;
  const faktor = Math.max(0.05, 1 - p / 50);
  return Math.max(0, Math.round(d * faktor * 10) / 10);
}

module.exports = { hitungPenalti, terapkanPenalti };
