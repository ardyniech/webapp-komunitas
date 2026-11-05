// js/scan-bugs.js - Tampilkan laporan scan bug otomatis (Plan: bug hunter page)
window.AppModules = window.AppModules || {};

window.AppModules.ScanBugs = {
  async loadScanBugs() {
    const wrap = document.getElementById("scan-bugs-wrap");
    const listEl = document.getElementById("scan-bugs-list");
    const summaryEl = document.getElementById("scan-bugs-summary");
    const scannedAtEl = document.getElementById("scan-bugs-scanned-at");
    const refreshBtn = document.getElementById("btn-refresh-scan");
    if (!wrap || !listEl) return;

    wrap.style.display = "block";
    listEl.innerHTML = `<div class="empty-state">Memuat laporan scan bug...</div>`;

    try {
      // Cache-busting agar SW tidak melayani laporan lama
      const res = await fetch("/scan-report.json?t=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error("Laporan scan tidak tersedia (HTTP " + res.status + ")");
      const data = await res.json();

      if (scannedAtEl) scannedAtEl.innerText = data.scanned_at ? new Date(data.scanned_at).toLocaleString("id-ID") : "-";
      if (summaryEl) {
        summaryEl.innerHTML =
          "<strong>Total temuan:</strong> " + data.total_findings +
          " &nbsp;|&nbsp; <strong style='color:var(--warna-merah);'>Tinggi:</strong> " + (data.by_severity && data.by_severity.high || 0) +
          " &nbsp;|&nbsp; <strong style='color:var(--warna-aksen);'>Sedang:</strong> " + (data.by_severity && data.by_severity.medium || 0);
      }

      if (!data.findings || data.findings.length === 0) {
        listEl.innerHTML = `<div class="empty-state" style="color:var(--warna-utama);">🎉 Tidak ditemukan bug. Semua baik-baik saja bro!</div>`;
        return;
      }

      const sevColor = { high: "var(--warna-merah)", medium: "var(--warna-aksen)", low: "var(--text-sub)" };
      const sevLabel = { high: "TINGGI", medium: "SEDANG", low: "RENDAH" };

      listEl.innerHTML = data.findings.map(f => `
        <div class="bug-item" style="padding:10px 12px; border:1px solid var(--border-color); border-radius:10px; margin-bottom:8px; background:var(--bg-card);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
            <div>
              <span class="badge" style="background:${sevColor[f.severity] || 'var(--text-sub)'}; color:#fff; font-size:0.7rem; font-weight:700; padding:2px 8px; border-radius:10px; margin-right:6px;">
                ${sevLabel[f.severity] || f.severity}
              </span>
              <span class="badge" style="background:var(--bg-input); color:var(--text-sub); font-size:0.7rem; padding:2px 8px; border-radius:10px; border:1px solid var(--border-color);">
                ${f.type}
              </span>
            </div>
            <div style="font-size:0.72rem; color:var(--text-muted); font-family:monospace;">
              ${this.escapeHtml(f.file)}:${f.line > 0 ? f.line : "-"}
            </div>
          </div>
          <div style="font-size:0.82rem; color:var(--text-primary);">
            ${this.escapeHtml(f.message)}
          </div>
        </div>
      `).join("");
    } catch (err) {
      listEl.innerHTML = `<div class="empty-state" style="color:var(--warna-merah);">Gagal memuat laporan scan: ${err.message}</div>`;
    }
  },

  refreshScan() {
    this.loadScanBugs();
  },

  escapeHtml(s) {
    if (!s) return "";
    return String(s).replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t));
  }
};
