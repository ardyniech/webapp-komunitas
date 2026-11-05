// js/anggota-bidang.js - Kelola Bidang Profil Kustom (admin, Plan §5.8, <200 baris)
window.AppModules = window.AppModules || {};

window.AppModules.AnggotaBidang = {
  async openBidangProfil() {
    const modal = document.getElementById("modal-bidang-profil");
    const listEl = document.getElementById("bidang-profil-list");
    if (!modal || !listEl) return;
    modal.classList.add("show");
    document.getElementById("bidang-kunci").value = "";
    document.getElementById("bidang-label").value = "";
    document.getElementById("bidang-tipe").value = "teks";
    document.getElementById("bidang-opsi").value = "";
    document.getElementById("bidang-bisa-anggota").checked = false;
    document.getElementById("bidang-terlihat").value = "pribadi";
    await this.muatListBidang(listEl);
  },

  closeBidangProfilModal() {
    const m = document.getElementById("modal-bidang-profil");
    if (m) m.classList.remove("show");
  },

  async muatListBidang(listEl) {
    try {
      const res = await fetch(`${this.apiBase}/collections/bidang_profil/records?sort=urutan&perPage=50`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) { listEl.innerHTML = `<div class="empty-state">Gagal memuat bidang.</div>`; return; }
      const data = await res.json();
      const items = data.items || [];
      if (items.length === 0) { listEl.innerHTML = `<div class="empty-state">Belum ada bidang kustom.</div>`; return; }
      listEl.innerHTML = items.map(d => `
        <div style="padding:6px 8px; border-bottom:1px solid var(--border-color); font-size:0.78rem; display:flex; justify-content:space-between; align-items:center;">
          <div><strong>${this.escapeHtml(d.label || d.kunci)}</strong> <span style="font-size:0.7rem;color:var(--text-sub);">(${d.kunci})</span><br>
            <span style="font-size:0.7rem;color:var(--text-muted);">${d.tipe} • terlihat ${d.terlihat_oleh} • ${d.aktif !== false ? 'Aktif' : 'Nonaktif'}</span></div>
          <div style="font-size:0.7rem;"></div>
        </div>
      `).join("");
    } catch (e) {
      listEl.innerHTML = `<div class="empty-state">Gagal memuat bidang.</div>`;
    }
  },

  async submitBidangProfil() {
    const kunci = document.getElementById("bidang-kunci")?.value.trim();
    const label = document.getElementById("bidang-label")?.value.trim();
    const tipe = document.getElementById("bidang-tipe")?.value || "teks";
    const opsi = document.getElementById("bidang-opsi")?.value.trim();
    const bisaAnggota = document.getElementById("bidang-bisa-anggota")?.checked;
    const terlihat = document.getElementById("bidang-terlihat")?.value || "pribadi";
    if (!kunci || !label) { alert("Kunci dan label wajib diisi!"); return; }
    // Cek duplikasi kunci
    try {
      const cek = await fetch(`${this.apiBase}/collections/bidang_profil/records?filter=(kunci='${kunci}')&perPage=1`, {
        headers: this.getAuthHeaders()
      });
      if (cek.ok) {
        const data = await cek.json();
        if ((data.items || []).length > 0) {
          alert("Kunci '" + kunci + "' sudah digunakan. Gunakan kunci lain.");
          return;
        }
      }
    } catch (_) {}
    try {
      const opsiArr = opsi ? opsi.split(",").map(s => s.trim()).filter(Boolean) : [];
      const payload = {
        kunci, label, tipe,
        opsi: JSON.stringify(opsiArr),
        petunjuk: "",
        wajib: false,
        tampil_di_pendaftaran: false,
        bisa_diubah_anggota: bisaAnggota,
        terlihat_oleh: terlihat,
        urutan: 0,
        aktif: true
      };
      const res = await fetch(`${this.apiBase}/collections/bidang_profil/records`, {
        method: "POST", headers: this.getAuthHeaders(), body: JSON.stringify(payload)
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Gagal simpan"); }
      Hero.setExpression("senang", "Bidang profil tersimpan!");
      this.closeBidangProfilModal();
      const listEl = document.getElementById("bidang-profil-list");
      if (listEl) await this.muatListBidang(listEl);
    } catch (err) {
      alert("Gagal simpan bidang: " + err.message);
    }
  },

  escapeHtml(s) {
    if (!s) return "";
    return String(s).replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t));
  }
};
