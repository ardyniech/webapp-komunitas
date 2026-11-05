// js/devtools-monitor.js - Tampilan Monitor: Host Heartbeat + Log tail.
window.AppModules = window.AppModules || {};

window.AppModules.DevToolsMonitor = {
  async renderMonitor() {
    const hbEl = document.getElementById("devtools-heartbeat-list");
    const logEl = document.getElementById("devtools-log-list");
    if (hbEl) {
      hbEl.innerHTML = `<div class="empty-state">Memuat heartbeat...</div>`;
      try {
        const h = await this.devtoolsFetch("devtools-heartbeat.json");
        const ramColor = h.ram_pct > 85 ? "var(--warna-merah)" : h.ram_pct > 65 ? "var(--warna-aksen)" : "var(--warna-utama)";
        const udpColor = h.udp_waspada ? "var(--warna-merah)" : "var(--warna-utama)";
        hbEl.innerHTML =
          `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;">` +
          this.tile("Uptime", h.uptime_str) +
          `<div class="stat-tile"><div class="stat-nilai" style="color:${ramColor};">${h.ram_pct}%</div><div class="stat-label">RAM (${h.ram_used_mb}/${h.ram_total_mb} MB)</div></div>` +
          `<div class="stat-tile"><div class="stat-nilai" style="color:${udpColor};">${h.udp_inuse}</div><div class="stat-label">Socket UDP ${h.udp_waspada ? "⚠️ WASPADA" : "(normal)"}</div></div>` +
          this.tile("Disk /", `${h.disk_used_pct} terpakai (${h.disk_avail} bebas)`) +
          this.tile("PocketBase", h.pocketbase) +
          `</div>` +
          `<div style="font-size:0.72rem;color:var(--text-muted);margin-top:6px;">FD tertinggi: ` +
          (h.top_fds || []).map((x) => `${this.esc(x.cmd)}:${x.fds}`).join(", ") +
          ` · ${this.esc(h.generated_at)}</div>`;
      } catch (e) {
        hbEl.innerHTML = `<div class="empty-state" style="color:var(--warna-merah);">Gagal memuat heartbeat: ${this.esc(e.message)}</div>`;
      }
    }
    if (logEl) {
      logEl.innerHTML = `<div class="empty-state">Memuat log...</div>`;
      try {
        const l = await this.devtoolsFetch("devtools-logs.json");
        logEl.innerHTML =
          `<div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:6px;">${l.lines_count} baris terakhir · ${this.esc(l.service)}</div>` +
          `<pre style="background:rgba(0,0,0,0.25);border-radius:8px;padding:10px;font-size:0.68rem;max-height:240px;overflow:auto;white-space:pre-wrap;">` +
          this.esc((l.lines || []).join("\n")) +
          `</pre>`;
      } catch (e) {
        logEl.innerHTML = `<div class="empty-state" style="color:var(--warna-merah);">Gagal memuat log: ${this.esc(e.message)}</div>`;
      }
    }
  },

  tile(label, val) {
    return `<div class="stat-tile"><div class="stat-nilai">${this.esc(String(val))}</div><div class="stat-label">${this.esc(label)}</div></div>`;
  },
};
