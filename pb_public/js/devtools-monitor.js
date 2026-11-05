// js/devtools-monitor.js - Tampilan Monitor: Host Heartbeat + Log tail.
window.AppModules = window.AppModules || {};

window.AppModules.DevToolsMonitor = {
  async renderMonitor() {
    const hbEl = document.getElementById("devtools-heartbeat-list");
    const logEl = document.getElementById("devtools-log-list");
    const dbEl = document.getElementById("devtools-db-list");
    const histEl = document.getElementById("devtools-history-list");
    const errEl = document.getElementById("devtools-errors-list");
    if (dbEl) this.renderDB(dbEl);
    if (histEl) this.renderHistory(histEl);
    if (errEl) this.renderErrors(errEl);
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

  // Kesegaran data per koleksi (paling basi dulu)
  async renderDB(el) {
    el.innerHTML = `<div class="empty-state">Memuat kesegaran DB...</div>`;
    try {
      const d = await this.devtoolsFetch("devtools-db.json");
      const basi = (d.freshness || []).filter((f) => f.umur_jam !== null && f.umur_jam > 72);
      el.innerHTML =
        `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;">` +
        `<div class="stat-tile"><div class="stat-nilai">${d.collections_count}</div><div class="stat-label">Koleksi</div></div>` +
        `<div class="stat-tile"><div class="stat-nilai">${d.total_rows}</div><div class="stat-label">Total baris data</div></div>` +
        `<div class="stat-tile"><div class="stat-nilai" style="color:${basi.length ? "var(--warna-merah)" : "var(--warna-utama)"};">${basi.length}</div><div class="stat-label">Basi &gt;72 jam</div></div>` +
        `</div>` +
        `<div style="font-size:0.72rem;color:var(--text-muted);margin:6px 0 4px;">Paling basi (kemungkinan tak terpakai / sync macet):</div>` +
        (d.freshness || [])
          .slice(0, 8)
          .map(
            (f) =>
              `<div style="display:flex;justify-content:space-between;padding:4px 8px;border-bottom:1px solid var(--border-color);font-size:0.78rem;">` +
              `<span style="font-family:monospace;">${this.esc(f.koleksi)}</span>` +
              `<span>${f.rows} baris · ${f.umur_jam === null ? "belum pernah berubah" : f.umur_jam + " jam lalu"}</span></div>`
          )
          .join("");
    } catch (e) {
      el.innerHTML = `<div class="empty-state" style="color:var(--warna-merah);">${this.esc(e.message)}</div>`;
    }
  },

  // Tren riwayat (sparkline teks + delta bug)
  async renderHistory(el) {
    el.innerHTML = `<div class="empty-state">Memuat riwayat...</div>`;
    try {
      const d = await this.devtoolsFetch("devtools-history.json");
      const pts = (d.recent || []).map((p) => p.bug_total);
      const spark = pts
        .map((v, i) => {
          const h = 8 + Math.min(24, v * 2);
          const c = v === 0 ? "var(--warna-utama)" : v < 10 ? "var(--warna-aksen)" : "var(--warna-merah)";
          return `<span title="bug=${v}" style="display:inline-block;width:8px;height:${h}px;background:${c};margin-right:2px;border-radius:2px;vertical-align:bottom;"></span>`;
        })
        .join("");
      const delta = d.delta_vs_sebelumnya || 0;
      const arah = delta < 0 ? "turun (bagus)" : delta > 0 ? "naik (waspada)" : "tetap";
      el.innerHTML =
        `<div style="font-size:0.8rem;margin-bottom:6px;">${d.titik} titik riwayat · bug total terakhir <b>${pts[pts.length - 1] || 0}</b> · delta vs sebelumnya: <b>${delta >= 0 ? "+" : ""}${delta}</b> (${arah})</div>` +
        `<div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:10px;min-height:44px;">${spark}</div>` +
        `<div style="font-size:0.72rem;color:var(--text-muted);margin-top:4px;">Sparkline 10 titik terakhir (bug total). Makin pendek makin bagus.</div>`;
    } catch (e) {
      el.innerHTML = `<div class="empty-state" style="color:var(--warna-merah);">${this.esc(e.message)}</div>`;
    }
  },

  // Error terstruktur (pola journal)
  async renderErrors(el) {
    el.innerHTML = `<div class="empty-state">Memuat error...</div>`;
    try {
      const d = await this.devtoolsFetch("devtools-errors.json");
      if (!d.errors || d.errors.length === 0) {
        el.innerHTML = `<div class="empty-state" style="color:var(--warna-utama);">Tidak ada error tercatat di journal PocketBase.</div>`;
        return;
      }
      el.innerHTML = d.errors
        .map(
          (e) =>
            `<div style="display:flex;justify-content:space-between;padding:5px 8px;border-bottom:1px solid var(--border-color);font-size:0.78rem;">` +
            `<span style="font-family:monospace;word-break:break-all;">${this.esc(e.signature)}</span>` +
            `<span class="badge" style="background:var(--warna-merah);color:#fff;font-size:0.68rem;padding:2px 8px;border-radius:10px;">${e.jumlah}×</span></div>`
        )
        .join("");
    } catch (e) {
      el.innerHTML = `<div class="empty-state" style="color:var(--warna-merah);">${this.esc(e.message)}</div>`;
    }
  },
};
