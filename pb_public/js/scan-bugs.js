// js/scan-bugs.js - Tampilkan laporan scan bug otomatis (Page: Bug Hunter)
window.AppModules = window.AppModules || {};

window.AppModules.ScanBugs = {
  async loadScanBugs() {
    const listEl = document.getElementById("bug-hunter-list");
    const totalEl = document.getElementById("bh-total-checked");
    const findingsEl = document.getElementById("bh-total-findings");
    const critEl = document.getElementById("bh-critical");
    const highEl = document.getElementById("bh-high");
    const medEl = document.getElementById("bh-medium");
    const scannedAtEl = document.getElementById("bh-scanned-at");
    if (!listEl) return;

    listEl.innerHTML = `<div class="empty-state">Memuat laporan scan bug...</div>`;

    // Coba beberapa path kandidat agar bekerja baik di root maupun /drg/.
    // Root page:    /scan-report.json → JSON ✓
    // /drg/ page:   /drg/scan-report.json → Caddy strip prefix → PocketBase root → JSON ✓
    const candidates = [
      "scan-report.json?t=" + Date.now(),
      "/scan-report.json?t=" + Date.now(),
      "/drg/scan-report.json?t=" + Date.now()
    ];

    let lastErr = null;
    for (const scanUrl of candidates) {
      try {
        const res = await fetch(scanUrl, { cache: "no-store" });
        const text = await res.text();
        if (!res.ok) throw new Error("HTTP " + res.status);

        // Deteksi jika respons bukan JSON (misal SPA fallback HTML)
        let data;
        try {
          data = JSON.parse(text);
        } catch (err) {
          lastErr = new Error("Respons bukan JSON di " + scanUrl + " (content-type: " + (res.headers.get('content-type') || '-') + ")");
          continue;
        }

        // Berhasil parse JSON
        if (totalEl) totalEl.innerText = data.total_checked || "-";
        if (findingsEl) findingsEl.innerText = data.total_findings || "-";
        if (critEl) critEl.innerText = data.by_severity && data.by_severity.critical || 0;
        if (highEl) highEl.innerText = data.by_severity && data.by_severity.high || 0;
        if (medEl) medEl.innerText = data.by_severity && data.by_severity.medium || 0;
        if (scannedAtEl) scannedAtEl.innerText = data.scanned_at ? new Date(data.scanned_at).toLocaleString("id-ID") : "-";

        if (!data.findings || data.findings.length === 0) {
          listEl.innerHTML = `<div class="empty-state" style="color:var(--warna-utama);">🎉 Tidak ditemukan bug. Semua baik-baik saja bro!</div>`;
          return;
        }

        const sevColor = { critical: "var(--warna-merah)", high: "var(--warna-merah)", medium: "var(--warna-aksen)", low: "var(--text-sub)" };
        const sevLabel = { critical: "KRITIKAL", high: "TINGGI", medium: "SEDANG", low: "RENDAH" };

        listEl.innerHTML = data.findings.map(f => `
          <div class="bug-item" title="Klik untuk lihat diagnosa akar masalah di Dev Tools" style="padding:10px 12px; border:1px solid var(--border-color); border-radius:10px; margin-bottom:8px; background:var(--bg-card);cursor:pointer;" onclick="App.switchTab('devtools'); if(App.devtoolsSwitchSub) App.devtoolsSwitchSub('diagnosa'); if(App.renderDiagnose) App.renderDiagnose();">
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
            ${f.suggestion ? `<div style="font-size:0.75rem; color:var(--warna-aksen); margin-top:4px; font-style:italic;">💡 ${this.escapeHtml(f.suggestion)}</div>` : ''}
          </div>
        `).join("");
        return;
      } catch (err) {
        lastErr = err;
      }
    }

    // Semua path gagal
    listEl.innerHTML = `
      <div style="padding:16px; border:1px solid var(--warna-merah); border-radius:10px; background:rgba(239,68,68,0.1); margin-bottom:12px;">
        <div style="font-weight:700; color:var(--warna-merah); margin-bottom:8px;">⚠️ Gagal memuat laporan scan</div>
        <div style="font-size:0.82rem; color:var(--text-primary); margin-bottom:12px;">
          ${this.escapeHtml(lastErr && lastErr.message ? lastErr.message : String(lastErr))}
        </div>
        <button class="btn btn-primary" onclick="App.refreshScan()" style="padding:8px 14px; font-size:0.82rem; margin-right:8px;">
          🔄 Coba Lagi
        </button>
        <button class="btn btn-outline" onclick="window.location.href='http://100.117.176.41:8095/'" style="padding:8px 14px; font-size:0.82rem;">
          📱 Buka via IP Langsung
        </button>
      </div>
    `;
  },

  refreshScan() {
    this.loadScanBugs();
  },

  async clearSwAndRefresh() {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
    } catch (_) {}
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) await caches.delete(key);
      }
    } catch (_) {}
    window.location.reload();
  },

  escapeHtml(s) {
    if (!s) return "";
    return String(s).replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t));
  }
};
