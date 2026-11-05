// js/progres-bug.js - Penyesuaian progres dengan penalti bug (dev tool, ATOMIK).
//
// Modul ini SENGAJA terpisah dari js/progres.js agar fitur bug-penalty
// tidak menyusup ke kode progres lama. Cara kerja:
// 1. Panggil loadProgres asli (menampilkan progres dasar seperti biasa).
// 2. Ambil penalti dari /api/komunitas/penalti-bug.
// 3. Tampilkan banner rinci + turunkan angka persen/bar secara jujur.
//
// Syarat: dimuat SETELAH progres.js di index.html (urutan script).

window.AppModules = window.AppModules || {};

(function () {
  const orig = window.AppModules.Progres && window.AppModules.Progres.loadProgres;

  window.AppModules.ProgresBug = {
    async loadProgres() {
      // 1) Render progres dasar seperti semula
      if (orig) await orig.call(this);
      if (!this.apiBase) return;

      // 2) Ambil penalti bug
      let bug = null;
      try {
        const res = await fetch(`${this.apiBase}/komunitas/penalti-bug`, { cache: "no-store" });
        if (res.ok) bug = await res.json();
      } catch (_) {}

      const pctHeadline = document.getElementById("progres-pct-headline");
      const barFill = document.getElementById("progres-bar-fill");
      const summarySub = document.getElementById("progres-summary-sub");
      if (!pctHeadline || !bug) return;

      const dasar = parseFloat(pctHeadline.textContent) || 0;
      const penalti = Number(bug.penalti) || 0;
      // Proporsional + lantai 5%: akhir = dasar * max(0.05, 1 - penalti/50)
      const faktor = Math.max(0.05, 1 - penalti / 50);
      const akhir = Math.max(0, Math.round(dasar * faktor * 10) / 10);

      // 3) Turunkan angka progres secara jujur
      pctHeadline.innerText = `${akhir}%`;
      if (barFill) barFill.style.width = `${akhir}%`;

      // 4) Banner detail penalti (diletakkan tepat di bawah kartu ringkasan)
      let banner = document.getElementById("progres-bug-penalty-banner");
      if (!banner) {
        const card = document.getElementById("progres-summary-sub");
        if (!card || !card.parentElement) return;
        banner = document.createElement("div");
        banner.id = "progres-bug-penalty-banner";
        banner.style.cssText = "margin-top:10px;padding:10px 12px;border-radius:10px;font-size:0.78rem;background:rgba(239,68,68,0.12);border:1px solid var(--warna-merah);";
        card.parentElement.appendChild(banner);
      }

      if (!bug.ada_data || penalti <= 0) {
        banner.innerHTML =
          `<strong>🐛 Bug Hunter:</strong> ` +
          (bug.ada_data
            ? `tidak ada bug aktif (${bug.total_findings} temuan, penalti 0).`
            : `laporan scan belum tersedia — progres ditampilkan apa adanya.`);
      } else {
        banner.innerHTML =
          `<strong>🐛 Bug Hunter (jujur, brutal tapi tidak nol):</strong> ` +
          `progres fitur ${dasar}% × faktor kualitas ${Math.round(faktor * 100)}% ` +
          `= <b>${akhir}%</b>. Penalti ${penalti} poin dari ${bug.total_findings} bug ` +
          `(${bug.kritikal} kritikal×3 + ${bug.tinggi} tinggi×2 + ${bug.sedang} sedang×0.5). ` +
          `UI tetap bisa diakses, tapi nilai dibatasi sampai bug diperbaiki.`;
      }

      if (summarySub && bug.ada_data) {
        summarySub.innerHTML +=
          `<br><span style="font-size:0.7rem;color:var(--warna-aksen);">` +
          `🐛 Penalti bug: -${penalti} dari ${bug.total_findings} temuan ` +
          `(${bug.kritikal} kritikal, ${bug.tinggi} tinggi) · scan: ` +
          `${bug.scanned_at ? new Date(bug.scanned_at).toLocaleString("id-ID") : "-"}</span>`;
      }
    }
  };
})();
