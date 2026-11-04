// js/pelengkap.js - Modul Fitur Pelengkap (Polling, Agenda, Pengaduan)
window.AppModules = window.AppModules || {};

window.AppModules.Pelengkap = {
  async loadPolling() {
    const el = document.getElementById("polling-list");
    if (el) el.innerHTML = `<div class="empty-state">⏳ Memuat daftar voting & polling...</div>`;
    try {
      const res = await fetch(`${this.apiBase}/collections/polling/records?sort=-created&perPage=20`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) throw new Error("Gagal");
      const items = (await res.json()).items || [];
      if (items.length === 0) {
        if (el) el.innerHTML = `<div class="empty-state">Belum ada polling aktif saat ini.</div>`;
        return;
      }
      if (el) {
        el.innerHTML = items.map(p => {
          let opsiArr = [];
          try { opsiArr = typeof p.opsi === 'string' ? JSON.parse(p.opsi) : p.opsi; } catch(e){}
          return `
            <div class="kas-card" style="flex-direction:column; align-items:stretch; margin-bottom:12px;">
              <div style="font-weight:700; font-size:0.95rem; margin-bottom:8px;">🗳️ ${this.escapeHtml(p.pertanyaan)}</div>
              <div style="display:flex; flex-direction:column; gap:6px;">
                ${(opsiArr || []).map(opt => `
                  <button class="btn btn-outline" style="text-align:left; justify-content:flex-start; padding:8px 12px; font-size:0.8rem;" onclick="App.submitVotePolling('${p.id}', '${this.escapeHtml(opt)}')">
                    🔘 ${this.escapeHtml(opt)}
                  </button>
                `).join("")}
              </div>
            </div>
          `;
        }).join("");
      }
    } catch (e) {
      if (el) el.innerHTML = `<div class="empty-state">Gagal memuat polling.</div>`;
    }
  },

  async submitVotePolling(pollingId, pilihan) {
    if (!confirm(`Konfirmasi pilihan: "${pilihan}"?`)) return;
    try {
      Hero.setExpression("berpikir", Teks.hero.loading);
      const res = await fetch(`${this.apiBase}/collections/polling_suara/records`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          polling: pollingId,
          anggota: this.user.id,
          pilihan: pilihan
        })
      });
      if (!res.ok) throw new Error("Kamu sudah pernah memilih di polling ini!");
      Hero.setExpression("senang", "Suara kamu berhasil dicatat! Terima kasih telah berpartisipasi.");
      alert("Suara kamu berhasil disimpan!");
      this.loadPolling();
    } catch (e) {
      alert("Gagal memberikan suara: " + e.message);
    }
  },

  async loadAgenda() {
    const el = document.getElementById("agenda-list");
    if (el) el.innerHTML = `<div class="empty-state">⏳ Memuat agenda kumpul basecamp...</div>`;
    try {
      const res = await fetch(`${this.apiBase}/collections/agenda/records?sort=-tanggal&perPage=30`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) throw new Error("Gagal");
      const items = (await res.json()).items || [];
      if (items.length === 0) {
        if (el) el.innerHTML = `<div class="empty-state">Belum ada agenda kumpul atau rapat terdaftar.</div>`;
        return;
      }
      if (el) {
        el.innerHTML = items.map(a => `
          <div class="kas-card" style="flex-direction:column; align-items:stretch; margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div style="font-weight:700; font-size:0.95rem;">📅 ${this.escapeHtml(a.judul)}</div>
              <span class="role-pill role-anggota">${(a.tanggal || '').split(' ')[0]}</span>
            </div>
            <div style="font-size:0.75rem; color:var(--text-sub); margin-top:2px;">📍 Lokasi: ${this.escapeHtml(a.lokasi || 'Basecamp')}</div>
            <div style="font-size:0.8rem; color:var(--text-main); margin-top:6px; line-height:1.35;">${this.escapeHtml(a.catatan || '')}</div>
          </div>
        `).join("");
      }
    } catch (e) {
      if (el) el.innerHTML = `<div class="empty-state">Gagal memuat agenda.</div>`;
    }
  },

  initPengaduanTab() {
    const form = document.getElementById("form-pengaduan-dewan");
    if (form) form.reset();
  },

  async submitPengaduanDewan(e) {
    if (e) e.preventDefault();
    const kategori = document.getElementById("aduan-kategori")?.value;
    const isi = document.getElementById("aduan-isi")?.value.trim();
    const anonim = document.getElementById("aduan-anonim")?.checked;

    if (!isi) return;

    try {
      Hero.setExpression("berpikir", Teks.hero.loading);
      const res = await fetch(`${this.apiBase}/collections/pengaduan/records`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          kategori, isi, anonim,
          pelapor: anonim ? null : this.user.id,
          kode_cek: "ADU-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
          status: "baru"
        })
      });

      if (!res.ok) throw new Error("Gagal mengirim pengaduan");
      const data = await res.json();
      Hero.setExpression("senang", "Laporan kamu telah diterima Dewan Etik secara aman.");
      alert(`Laporan berhasil dikirim! Simpan Kode Aduan kamu: ${data.kode_cek}`);
      document.getElementById("form-pengaduan-dewan")?.reset();
    } catch (err) {
      alert("Gagal kirim aduan: " + err.message);
    }
  }
};
