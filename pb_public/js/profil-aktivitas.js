// js/profil-aktivitas.js - Aktivitas Profil (log_aktivitas, <200 baris)
window.AppModules = window.AppModules || {};

window.AppModules.ProfilAktivitas = {
  async renderAktivitas() {
    const el = document.getElementById("aktivitas-list");
    if (!el) return;
    el.innerHTML = `<div class="empty-state">Memuat aktivitas...</div>`;
    if (!this.user) { el.innerHTML = `<div class="empty-state">Belum login.</div>`; return; }
    try {
      const res = await fetch(`${this.apiBase}/collections/log_aktivitas/records?filter=(aktor='${this.user.id}')&sort=-waktu&perPage=30`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) {
        el.innerHTML = `<div class="empty-state">Catatan aktivitas hanya tersedia untuk pengurus basecamp.</div>`;
        return;
      }
      const data = await res.json();
      const items = data.items || [];
      if (items.length === 0) {
        el.innerHTML = `<div class="empty-state">Belum ada aktivitas yang dicatat.</div>`;
        return;
      }
      el.innerHTML = items.map(log => `
        <div class="aktivitas-item" style="padding:8px 10px; border-bottom:1px solid var(--border-color); font-size:0.82rem;">
          <div style="font-weight:700; color:var(--warna-utama);">${this.escapeHtml(log.aksi)}</div>
          <div style="font-size:0.72rem; color:var(--text-sub);">${this.escapeHtml(log.target || '')} ${this.formatTanggal ? this.formatTanggal(log.waktu) : log.waktu}</div>
        </div>
      `).join("");
    } catch (err) {
      el.innerHTML = `<div class="empty-state">Gagal memuat aktivitas.</div>`;
    }
  }
};
