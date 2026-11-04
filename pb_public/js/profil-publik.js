// js/profil-publik.js - Tinjau Profil Publik & Unduh Data Pribadi (GDPR)
window.AppModules = window.AppModules || {};

window.AppModules.ProfilPublik = {
  async showProfilPublikPreview() {
    if (!this.user) return;
    const modal = document.getElementById("modal-profil-publik");
    const body = document.getElementById("profil-publik-card-body");
    if (!modal || !body) return;

    body.innerHTML = `<div class="empty-state">⏳ Memuat profil publik...</div>`;
    modal.classList.add("show");

    try {
      const res = await fetch(`${this.apiBase}/collections/profil_publik/records?filter=(user='${this.user.id}')`, {
        headers: this.getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        const p = (data.items && data.items.length > 0) ? data.items[0] : null;

        body.innerHTML = `
          <div style="text-align:center; padding:10px 0;">
            <div style="width:60px; height:60px; border-radius:50%; background:var(--warna-utama); margin:0 auto 10px; display:flex; align-items:center; justify-content:center; font-size:26px;">🛵</div>
            <div style="font-weight:700; font-size:1.1rem;">${this.escapeHtml(p?.nama_tampil || this.user.nama || this.user.username)}</div>
            <div style="font-size:0.8rem; color:var(--warna-utama); font-weight:600; margin-top:2px;">
              ${this.escapeHtml(p?.jabatan_ringkas || this.user.role.toUpperCase())}
            </div>
            <div style="font-size:0.75rem; color:var(--text-sub); margin-top:2px;">
              ${this.escapeHtml(p?.unit_ringkas || 'Pangkalan Ojol')}
            </div>
          </div>
          <div style="background:rgba(0,0,0,0.15); border-radius:10px; padding:12px; margin-top:10px; font-size:0.8rem;">
            <div style="font-weight:700; margin-bottom:6px; color:var(--text-sub);">BIDANG YANG TERLIHAT ANGGOTA LAIN:</div>
            <div>📍 Domisili: <strong>${this.escapeHtml(this.user.domisili || 'Belum diisi')}</strong></div>
            <div style="margin-top:4px;">💬 Bio: <em>"${this.escapeHtml(this.user.bio || 'Driver santuy')}"</em></div>
          </div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-top:12px; text-align:center;">
            *Data sensitif (kontak darurat, nomor dokumen, saldo iuran pribadi) disembunyikan dan tidak dapat diakses anggota lain.
          </div>
        `;
      }
    } catch (e) {
      body.innerHTML = `<div class="empty-state">Gagal memuat profil publik.</div>`;
    }
  },

  closeProfilPublikPreview() {
    const modal = document.getElementById("modal-profil-publik");
    if (modal) modal.classList.remove("show");
  },

  async unduhDataPribadi() {
    if (!this.user) return;
    try {
      const dataExport = {
        pengguna: {
          id: this.user.id,
          nama: this.user.nama,
          nama_panggilan: this.user.nama_panggilan,
          whatsapp: this.user.whatsapp || this.user.kontak,
          domisili: this.user.domisili,
          tanggal_lahir: this.user.tanggal_lahir,
          kontak_darurat_nama: this.user.kontak_darurat_nama,
          kontak_darurat_telepon: this.user.kontak_darurat_telepon,
          bio: this.user.bio,
          role: this.user.role,
          status: this.user.status,
          tanggal_gabung: this.user.tanggal_gabung
        },
        iuran: (this.allIuran || []).filter(i => i.anggota === this.user.id),
        tanggal_ekspor: new Date().toISOString()
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataExport, null, 2));
      const a = document.createElement("a");
      a.setAttribute("href", dataStr);
      a.setAttribute("download", `data_pribadi_${this.user.username}_${new Date().toISOString().split("T")[0]}.json`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      alert("Gagal mengunduh data pribadi: " + e.message);
    }
  }
};
