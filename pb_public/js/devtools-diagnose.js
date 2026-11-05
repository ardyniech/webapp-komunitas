// js/devtools-diagnose.js - Tampilan Diagnosa Akar Masalah (dari dt-diagnose.js).
window.AppModules = window.AppModules || {};

window.AppModules.DevToolsDiagnose = {
  async renderDiagnose() {
    const el = document.getElementById("devtools-diagnose-list");
    if (!el) return;
    el.innerHTML = `<div class="empty-state">Memuat diagnosa...</div>`;
    try {
      const d = await this.devtoolsFetch("devtools-diagnose.json");
      const sevColor = { critical: "var(--warna-merah)", high: "var(--warna-merah)", medium: "var(--warna-aksen)", low: "var(--text-sub)" };
      const sevLabel = { critical: "KRITIKAL", high: "TINGGI", medium: "SEDANG", low: "RENDAH" };
      if (!d.diagnosed || d.diagnosed.length === 0) {
        el.innerHTML = `<div class="empty-state" style="color:var(--warna-utama);">Tidak ada bug terdeteksi. Sistem sehat.</div>`;
        return;
      }
      el.innerHTML =
        `<div style="font-size:0.8rem;margin-bottom:8px;">${d.total_findings} temuan · ` +
        `${d.by_severity.critical} kritikal · ${d.by_severity.high} tinggi · ${d.by_severity.medium} sedang</div>` +
        d.diagnosed
          .map(
            (f) =>
              `<div style="border:1px solid var(--border-color);border-radius:10px;padding:10px 12px;margin-bottom:8px;background:var(--bg-card);">` +
              `<div style="display:flex;justify-content:space-between;margin-bottom:4px;">` +
              `<span class="badge" style="background:${sevColor[f.severity] || "var(--text-sub)"};color:#fff;font-size:0.7rem;font-weight:700;padding:2px 8px;border-radius:10px;">${sevLabel[f.severity] || f.severity}</span>` +
              `<code style="font-size:0.7rem;color:var(--text-muted);">${this.esc(f.file)}${f.line > 0 ? ":" + f.line : ""}</code></div>` +
              `<div style="font-size:0.82rem;margin-bottom:6px;">${this.esc(f.message)}</div>` +
              `<div style="font-size:0.78rem;margin-bottom:4px;"><b>Akar masalah:</b> ${this.esc(f.akar_masalah || "-")}</div>` +
              `<div style="font-size:0.78rem;margin-bottom:4px;"><b>Verifikasi:</b> <code>${this.esc(f.verifikasi || "-")}</code></div>` +
              `<div style="font-size:0.78rem;color:var(--warna-aksen);"><b>Fix:</b> ${this.esc(f.fix || f.suggestion || "-")}</div>` +
              `</div>`
          )
          .join("");
    } catch (e) {
      el.innerHTML = `<div class="empty-state" style="color:var(--warna-merah);">Gagal memuat diagnosa: ${this.esc(e.message)}</div>`;
    }
  },
};
