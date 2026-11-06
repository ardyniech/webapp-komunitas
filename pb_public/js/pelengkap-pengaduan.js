// js/pelengkap-pengaduan.js - Pengaduan ke Dewan Etik (atomik dari pelengkap.js, <200 baris).
window.AppModules = window.AppModules || {};

window.AppModules.PelengkapPengaduan = {
  kirimPengaduan() {
    const kategori = document.getElementById("pengaduan-kategori")?.value;
    const isi = document.getElementById("pengaduan-isi")?.value?.trim();
    const anonim = document.getElementById("pengaduan-anonim")?.checked;
    if (!isi) return alert("Isi laporan wajib diisi");
    this._kirimPengaduanInternal(kategori, isi, !!anonim);
  },

  async _kirimPengaduanInternal(kategori, isi, anonim) {
    try {
      const kode = "ADU-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      const res = await fetch(`${this.apiBase}/collections/pengaduan/records`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ kategori, isi, anonim, pelapor: anonim ? null : this.user.id, kode_cek: kode, status: "baru" })
      });
      if (!res.ok) throw new Error("Gagal mengirim pengaduan");
      const el = document.getElementById("pengaduan-result");
      if (el) el.innerHTML = `<div class="confirm-warning-box">✅ Laporan terkirim. Kode aduan kamu: <strong>${kode}</strong> — simpan baik-baik untuk cek status.</div>`;
      Hero.setExpression("senang", "Laporan kamu telah diterima Dewan Etik secara aman.");
    } catch (e) { alert("Gagal kirim aduan: " + e.message); }
  },

  switchPengaduanTab(tab) {
    const baru = document.getElementById("pengaduan-panel-baru");
    const cek = document.getElementById("pengaduan-panel-cek");
    const btnBaru = document.getElementById("btn-pengaduan-tab-baru");
    const btnCek = document.getElementById("btn-pengaduan-tab-cek");
    const isBaru = tab === "baru";
    if (baru) baru.style.display = isBaru ? "block" : "none";
    if (cek) cek.style.display = isBaru ? "none" : "block";
    btnBaru?.classList.toggle("active", isBaru);
    btnCek?.classList.toggle("active", !isBaru);
  },

  cekStatusPengaduan() {
    const kode = (document.getElementById("pengaduan-kode-cek")?.value || "").trim();
    const el = document.getElementById("pengaduan-status-result");
    if (!kode) return alert("Masukkan kode cek dulu");
    fetch(`${this.apiBase}/collections/pengaduan/records?filter=(kode_cek='${encodeURIComponent(kode)}')`, { headers: this.getAuthHeaders() })
      .then(r => r.json())
      .then(d => {
        const it = (d.items || [])[0];
        if (el) el.innerHTML = it ? `<div class="confirm-warning-box">Status laporan <strong>${kode}</strong>: <strong>${it.status}</strong></div>` : `<div class="empty-state">Kode tidak ditemukan.</div>`;
      }).catch(() => { if (el) el.innerHTML = `<div class="empty-state">Gagal cek status.</div>`; });
  },

  async submitPengaduanDewan(e) {
    if (e) e.preventDefault();
    const kategori = document.getElementById("pengaduan-kategori")?.value;
    const isi = document.getElementById("pengaduan-isi")?.value.trim();
    const anonim = document.getElementById("pengaduan-anonim")?.checked;

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
    } catch (err) {
      alert("Gagal kirim aduan: " + err.message);
    }
  }
};
