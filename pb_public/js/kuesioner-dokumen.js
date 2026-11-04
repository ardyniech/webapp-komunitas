// js/kuesioner-dokumen.js - Modul Uji Kuesioner, Berkas Dokumen & Audit Log
window.AppModules = window.AppModules || {};

window.AppModules.KuesionerDokumen = {
  _allKuesioner: [],
  _logLoaded: false,

  async loadKuesioner() {
    const el = document.getElementById("kuesioner-list");
    if (el) el.innerHTML = `<div class="empty-state">⏳ Memuat daftar kuesioner...</div>`;
    try {
      const res = await fetch(`${this.apiBase}/collections/kuesioner/records?filter=(aktif=true)&sort=-created`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) throw new Error("Gagal");
      this._allKuesioner = (await res.json()).items || [];
      if (this._allKuesioner.length === 0) {
        if (el) el.innerHTML = `<div class="empty-state">Belum ada uji kuesioner yang aktif saat ini.</div>`;
        return;
      }
      if (el) {
        el.innerHTML = this._allKuesioner.map(k => `
          <div class="kas-card" style="flex-direction:column; align-items:stretch; margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div style="font-weight:700; font-size:0.95rem;">📝 ${this.escapeHtml(k.judul)}</div>
              <span class="role-pill role-pengurus">${this.escapeHtml(k.jenis)}</span>
            </div>
            <div style="font-size:0.78rem; color:var(--text-main); margin:6px 0;">${this.escapeHtml(k.deskripsi || '')}</div>
            <div style="font-size:0.72rem; color:var(--text-sub);">Syarat Nilai Lulus: ${k.nilai_lulus}%</div>
          </div>
        `).join("");
      }
    } catch (e) {
      if (el) el.innerHTML = `<div class="empty-state">Gagal memuat kuesioner.</div>`;
    }
  },

  async loadDokumen() {
    const el = document.getElementById("dokumen-list");
    if (el) el.innerHTML = `<div class="empty-state">⏳ Memuat berkas dokumen...</div>`;
    try {
      const res = await fetch(`${this.apiBase}/collections/dokumen/records?sort=-created&perPage=50`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) throw new Error("Gagal");
      const items = (await res.json()).items || [];
      if (items.length === 0) {
        if (el) el.innerHTML = `<div class="empty-state">Belum ada dokumen basecamp tersimpan.</div>`;
        return;
      }
      if (el) {
        el.innerHTML = items.map(d => {
          const fileUrl = `${this.apiBase}/files/${d.collectionId}/${d.id}/${d.berkas}`;
          return `
            <div class="kas-card" style="margin-bottom:10px;">
              <div>
                <div style="font-weight:700; font-size:0.9rem;">📁 ${this.escapeHtml(d.judul)}</div>
                <div style="font-size:0.72rem; color:var(--text-sub);">Kategori: ${this.escapeHtml(d.kategori)}</div>
              </div>
              <a href="${fileUrl}" target="_blank" class="btn btn-outline" style="text-decoration:none; padding:4px 8px; font-size:0.75rem;">
                📥 Unduh
              </a>
            </div>
          `;
        }).join("");
      }
    } catch (e) {
      if (el) el.innerHTML = `<div class="empty-state">Gagal memuat berkas dokumen.</div>`;
    }
  },

  async toggleLogAktivitas() {
    const container = document.getElementById("log-aktivitas-container");
    if (!container) return;
    const isHidden = container.style.display === "none";
    container.style.display = isHidden ? "block" : "none";

    if (isHidden && !this._logLoaded) {
      const listEl = document.getElementById("log-aktivitas-list");
      try {
        const res = await fetch(`${this.apiBase}/collections/log_aktivitas/records?sort=-created&perPage=30`, {
          headers: this.getAuthHeaders()
        });
        if (res.ok) {
          const items = (await res.json()).items || [];
          if (items.length === 0) {
            listEl.innerHTML = `<div class="empty-state">Belum ada catatan log aktivitas.</div>`;
          } else {
            listEl.innerHTML = items.map(l => `
              <div style="padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.06); font-size:0.75rem;">
                <span style="color:var(--text-muted);">${(l.created || '').split(' ')[0]}:</span> 
                <strong>${this.escapeHtml(l.aksi)}</strong> — ${this.escapeHtml(l.target || '')}
              </div>
            `).join("");
          }
          this._logLoaded = true;
        }
      } catch (e) {
        listEl.innerHTML = `<div class="empty-state">Gagal memuat log.</div>`;
      }
    }
  }
};
