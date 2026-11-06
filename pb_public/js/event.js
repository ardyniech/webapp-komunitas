// js/event.js - Modul Manajemen Event Komunitas
window.AppModules = window.AppModules || {};

window.AppModules.Event = {
  _allEvents: [],

  async loadEvents() {
    const listEl = document.getElementById("events-list");
    if (listEl) listEl.innerHTML = `<div class="empty-state">⏳ Memuat daftar event...</div>`;
    try {
      const res = await fetch(`${this.apiBase}/collections/event/records?sort=-tanggal_mulai&perPage=50`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) throw new Error("Gagal memuat event");
      const data = await res.json();
      this._allEvents = data.items || [];

      if (this._allEvents.length === 0) {
        if (listEl) listEl.innerHTML = `<div class="empty-state">Belum ada kegiatan/event yang terdaftar.</div>`;
        return;
      }

      if (listEl) {
        listEl.innerHTML = this._allEvents.map(ev => {
          const statusColors = {
            usulan: "var(--text-muted)",
            disetujui: "var(--warna-aksen)",
            persiapan: "#3b82f6",
            berlangsung: "var(--warna-utama)",
            selesai: "#10b981",
            lpj_diajukan: "#8b5cf6",
            ditutup: "var(--text-muted)",
            dibatalkan: "var(--warna-merah)"
          };
          const color = statusColors[ev.status] || "var(--text-main)";

          return `
            <div class="kas-card" style="flex-direction:column; align-items:stretch; margin-bottom:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="font-weight:700; font-size:0.95rem;">${this.escapeHtml(ev.judul)}</div>
                <span class="role-pill" style="color:${color}; border:1px solid ${color};">${ev.status.toUpperCase()}</span>
              </div>
              <div style="font-size:0.75rem; color:var(--text-sub); margin-top:4px;">
                🏷️ Jenis: ${this.escapeHtml(ev.jenis)} | 📍 ${this.escapeHtml(ev.lokasi || 'Basecamp')} | 📅 ${(ev.tanggal_mulai || '').split(' ')[0]}
              </div>
              <div style="font-size:0.78rem; color:var(--text-main); margin-top:6px; line-height:1.35;">
                ${this.escapeHtml(ev.deskripsi || ev.tujuan || '')}
              </div>
              <div style="display:flex; gap:6px; margin-top:10px; border-top:1px solid rgba(255,255,255,0.06); padding-top:8px;">
                <button class="btn btn-outline" style="padding:4px 8px; font-size:0.75rem;" onclick="App.bukaPetaDanaEvent('${ev.id}')">
                  🗺️ Peta Dana
                </button>
                <button class="btn btn-outline" style="padding:4px 8px; font-size:0.75rem;" onclick="App.bukaSusunPanitia('${ev.id}')">
                  👥 Panitia
                </button>
                ${(this.user.role === 'admin' || this.user.role === 'pengurus') ? `
                  <button class="btn btn-primary" style="padding:4px 8px; font-size:0.75rem;" onclick="App.bukaSusunLPJ('${ev.id}')">
                    📑 LPJ
                  </button>
                ` : ''}
              </div>
            </div>
          `;
        }).join("");
      }
    } catch (e) {
      console.warn("Could not load events", e);
      if (listEl) listEl.innerHTML = `<div class="empty-state">Gagal memuat daftar event.</div>`;
    }
  }
};
