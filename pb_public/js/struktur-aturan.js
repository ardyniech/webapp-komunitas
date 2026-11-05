// js/struktur-aturan.js - Bagan Struktur Unit, Jabatan & Aturan Komunitas
window.AppModules = window.AppModules || {};

window.AppModules.StrukturAturan = {
  async loadStruktur() {
    const el = document.getElementById("struktur-units-list");
    if (el) el.innerHTML = `<div class="empty-state">⏳ Memuat bagan struktur...</div>`;
    try {
      const [resUnit, resJabatan] = await Promise.all([
        fetch(`${this.apiBase}/collections/unit/records?sort=urutan`, { headers: this.getAuthHeaders() }),
        fetch(`${this.apiBase}/collections/jabatan/records?filter=(aktif=true)&expand=anggota,unit`, { headers: this.getAuthHeaders() })
      ]);

      if (!resUnit.ok || !resJabatan.ok) throw new Error("Gagal memuat data struktur");
      const units = (await resUnit.json()).items || [];
      const jabatans = (await resJabatan.json()).items || [];

      if (units.length === 0) {
        if (el) el.innerHTML = `<div class="empty-state">Belum ada unit struktur komunitas yang terdaftar.</div>`;
        return;
      }

      if (el) {
        el.innerHTML = units.map(u => {
          const pejabat = jabatans.filter(j => j.unit === u.id);
          const listPejabat = pejabat.length > 0
            ? pejabat.map(j => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-top:1px solid rgba(255,255,255,0.06); font-size:0.8rem;">
                  <div>
                    <span style="font-weight:700; color:var(--warna-utama);">${this.escapeHtml(j.jabatan)}:</span> 
                    <span>${this.escapeHtml(j.expand?.anggota?.nama || j.expand?.anggota?.username || 'Belum diisi')}</span>
                  </div>
                  <span style="font-size:0.7rem; color:var(--text-muted);">${(j.periode_mulai || '').split(' ')[0]} s/d ${(j.periode_selesai || '').split(' ')[0] || 'Sekarang'}</span>
                </div>
              `).join("")
            : `<div style="font-size:0.75rem; color:var(--text-muted); padding:4px 0;">Belum ada pengurus aktif yang ditunjuk.</div>`;

          return `
            <div class="kas-card" style="flex-direction:column; align-items:stretch; margin-bottom:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <div style="font-weight:700; font-size:0.95rem;">${this.escapeHtml(u.nama)}</div>
                <span class="role-pill role-pengurus">${this.escapeHtml(u.jenis)}</span>
              </div>
              <div style="font-size:0.78rem; color:var(--text-sub); margin-bottom:8px;">${this.escapeHtml(u.tugas || u.deskripsi || '')}</div>
              <div style="background:rgba(0,0,0,0.15); border-radius:8px; padding:8px 10px;">
                <div style="font-size:0.7rem; font-weight:700; color:var(--text-sub); margin-bottom:4px;">PENGURUS AKTIF:</div>
                ${listPejabat}
              </div>
            </div>
          `;
        }).join("");
      }
    } catch (e) {
      console.warn("Could not load struktur", e);
      if (el) el.innerHTML = `<div class="empty-state">Gagal memuat struktur pangkalan.</div>`;
    }
  },

  async loadAturan() {
    const el = document.getElementById("aturan-pasal-list");
    const bannerAck = document.getElementById("aturan-persetujuan-banner");
    if (el) el.innerHTML = `<div class="empty-state">⏳ Memuat pasal aturan pangkalan...</div>`;

    try {
      const [resVersi, resPasal] = await Promise.all([
        fetch(`${this.apiBase}/collections/aturan_versi/records?filter=(status='berlaku')&sort=-created&perPage=1`, { headers: this.getAuthHeaders() }),
        fetch(`${this.apiBase}/collections/aturan_pasal/records?sort=urutan&perPage=100`, { headers: this.getAuthHeaders() })
      ]);

      let versiBerlaku = null;
      if (resVersi.ok) {
        const dVersi = await resVersi.json();
        if (dVersi.items && dVersi.items.length > 0) versiBerlaku = dVersi.items[0];
      }

      if (bannerAck && versiBerlaku && this.user) {
        try {
          const resAck = await fetch(`${this.apiBase}/collections/aturan_persetujuan_anggota/records?filter=(versi='${versiBerlaku.id}'%26%26anggota='${this.user.id}')`, {
            headers: this.getAuthHeaders()
          });
          if (resAck.ok) {
            const dAck = await resAck.json();
            if (!dAck.items || dAck.items.length === 0) {
              bannerAck.innerHTML = `
                <div style="font-weight:700; font-size:0.85rem; color:#92400e;">⚠️ Kamu belum menyetujui Aturan Versi ${this.escapeHtml(versiBerlaku.nomor)} (${this.escapeHtml(versiBerlaku.judul)})!</div>
                <div style="font-size:0.75rem; color:#b45309; margin:4px 0 8px 0;">Mohon baca dengan teliti pasal-pasal di bawah demi ketertiban bersama di jalan.</div>
                <button class="btn btn-primary" style="padding:4px 10px; font-size:0.75rem; background:#d97706;" onclick="App.setujuiAturan('${versiBerlaku.id}')">
                  🤝 Saya Sudah Membaca & Setuju
                </button>
              `;
              bannerAck.style.display = "block";
            } else {
              bannerAck.style.display = "none";
            }
          }
        } catch (errAck) {
          console.warn("Could not check ack aturan", errAck);
        }
      }

      if (resPasal.ok && el) {
        const pasals = (await resPasal.json()).items || [];
        if (pasals.length === 0) {
          el.innerHTML = `<div class="empty-state">Belum ada pasal aturan yang disahkan.</div>`;
          return;
        }

        const babs = {};
        pasals.forEach(p => {
          const b = p.bab || "Ketentuan Umum";
          if (!babs[b]) babs[b] = [];
          babs[b].push(p);
        });

        el.innerHTML = Object.keys(babs).map(babName => `
          <div style="margin-bottom:14px;">
            <div style="font-size:0.85rem; font-weight:800; color:var(--text-sub); margin-bottom:8px; text-transform:uppercase;">
              📖 ${this.escapeHtml(babName)}
            </div>
            ${babs[babName].map(p => `
              <div class="kas-card" style="flex-direction:column; align-items:stretch; margin-bottom:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div style="font-weight:700; font-size:0.9rem;">Pasal ${this.escapeHtml(p.nomor)}: ${this.escapeHtml(p.judul)}</div>
                  <span class="role-pill role-anggota">${this.escapeHtml(p.kategori)}</span>
                </div>
                <div style="font-size:0.78rem; color:var(--text-main); margin-top:6px; line-height:1.4;">
                  ${this.escapeHtml(p.isi)}
                </div>
              </div>
            `).join("")}
          </div>
        `).join("");
      }
    } catch (e) {
      console.warn("Could not load aturan", e);
      if (el) el.innerHTML = `<div class="empty-state">Gagal memuat aturan pangkalan.</div>`;
    }
  },

  async setujuiAturan(versiId) {
    if (!this.user || !versiId) return;
    try {
      Hero.setExpression("berpikir", Teks.hero.loading);
      const res = await fetch(`${this.apiBase}/collections/aturan_persetujuan_anggota/records`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          versi: versiId,
          anggota: this.user.id,
          waktu: new Date().toISOString()
        })
      });
      if (!res.ok) throw new Error("Gagal menyetujui aturan");
      Hero.setExpression("senang", "Terima kasih telah menyetujui dan menghormati aturan basecamp!");
      alert("Persetujuan aturan berhasil dicatat!");
      this.loadAturan();
    } catch (err) {
      alert("Gagal mencatat persetujuan aturan: " + err.message);
    }
  }
};
