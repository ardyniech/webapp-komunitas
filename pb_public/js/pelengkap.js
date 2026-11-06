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

  closeAgenda() {
    const l = document.getElementById("agenda-list");
    const d = document.getElementById("agenda-detail");
    if (l) l.style.display = "block";
    if (d) d.style.display = "none";
  },

  closeForum() {
    const l = document.getElementById("forum-list");
    const d = document.getElementById("forum-detail");
    if (l) l.style.display = "block";
    if (d) d.style.display = "none";
  },

  closePanduan() {
    const l = document.getElementById("panduan-list");
    const d = document.getElementById("panduan-detail");
    if (l) l.style.display = "block";
    if (d) d.style.display = "none";
  },

  filterPanduan() {
    const q = (document.getElementById("panduan-search")?.value || "").toLowerCase();
    // Sederhana: filter DOM panduan by innerText
    const list = document.getElementById("panduan-list");
    if (!list) return;
    list.querySelectorAll(".kas-card").forEach(card => {
      card.style.display = card.innerText.toLowerCase().includes(q) ? "" : "none";
    });
  },

  openBuatTopik() {
    // Buka form topik (promp fallback inline di forum panel)
    const judul = prompt("Judul topik forum:");
    if (judul === null) return;
    const isi = prompt("Isi/konten topik:");
    if (isi === null) return;
    const kategori = (prompt("Kategori (umum/tanya_jawab/saran/info_orderan/curhat):", "umum") || "umum").trim();
    if (!judul.trim()) { alert("Judul wajib diisi"); return; }
    const judulVal = judul.trim();
    const isiVal = isi.trim();
    if (!isiVal) { alert("Isi wajib diisi"); return; }
    this.submitTopikForumInternal(judulVal, isiVal, kategori || "umum");
  },

  async submitTopikForumInternal(judul, isi, kategori) {
    try {
      const res = await fetch(`${this.apiBase}/collections/forum_topik/records`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ judul, isi, kategori, penulis: this.user.id, disematkan: false, dikunci: false })
      });
      if (!res.ok) throw new Error("Gagal membuat topik");
      this.loadForum();
      Hero.setExpression("senang", "Topik forum berhasil diposting!");
    } catch (e) { alert("Gagal posting forum: " + e.message); }
  },

  kirimBalasan() {
    const isi = document.getElementById("forum-balas-isi")?.value?.trim();
    if (!isi) return alert("Isi balasan wajib diisi");
    // topik saat ini belum ada di UI list (simplifikasi: prompt ID topik? — fallback: ambil dari dataset detail)
    const topikId = document.getElementById("forum-detail")?.dataset?.topikid;
    if (!topikId) return alert("Buka dulu topiknya dari daftar (klik kartu topik).");
    this.submitBalasanInternal(topikId, isi);
  },

  async submitBalasanInternal(topikId, isi) {
    try {
      const res = await fetch(`${this.apiBase}/collections/forum_balasan/records`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ topik: topikId, isi, penulis: this.user.id })
      });
      if (!res.ok) throw new Error("Gagal membalas");
      document.getElementById("forum-balas-isi").value = "";
      this.loadForum();
    } catch (e) { alert("Gagal membalas: " + e.message); }
  },

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
