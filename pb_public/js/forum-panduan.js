// js/forum-panduan.js - Modul Forum Diskusi, Panduan & Pengumuman Komunitas
window.AppModules = window.AppModules || {};

window.AppModules.ForumPanduan = {
  _allPengumuman: [],
  _allForum: [],
  _allPanduan: [],

  async loadPengumuman() {
    const el = document.getElementById("pengumuman-list");
    if (el) el.innerHTML = `<div class="empty-state">⏳ Memuat pengumuman...</div>`;
    try {
      const res = await fetch(`${this.apiBase}/collections/pengumuman/records?sort=-disematkan,-created&perPage=30`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) throw new Error("Gagal memuat");
      const data = await res.json();
      this._allPengumuman = data.items || [];

      if (this._allPengumuman.length === 0) {
        if (el) el.innerHTML = `<div class="empty-state">Belum ada pengumuman basecamp.</div>`;
        return;
      }

      if (el) {
        el.innerHTML = this._allPengumuman.map(p => `
          <div class="kas-card" style="flex-direction:column; align-items:stretch; margin-bottom:12px; ${p.disematkan ? 'border-left:3px solid var(--warna-aksen);' : ''}">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div style="font-weight:700; font-size:0.95rem;">
                ${p.disematkan ? '📌 ' : ''}${this.escapeHtml(p.judul)}
              </div>
              ${p.penting ? `<span class="badge" style="background:var(--warna-merah); color:#fff; font-size:0.68rem; padding:2px 6px; border-radius:6px;">PENTING</span>` : ''}
            </div>
            <div style="font-size:0.8rem; color:var(--text-main); margin-top:6px; line-height:1.4;">
              ${this.escapeHtml(p.isi)}
            </div>
            <div style="font-size:0.7rem; color:var(--text-sub); margin-top:8px;">
              📅 ${(p.created || '').split(' ')[0]}
            </div>
          </div>
        `).join("");
      }
    } catch (e) {
      if (el) el.innerHTML = `<div class="empty-state">Gagal memuat pengumuman.</div>`;
    }
  },

  async loadForum() {
    const el = document.getElementById("forum-list");
    if (el) el.innerHTML = `<div class="empty-state">⏳ Memuat topik forum...</div>`;
    try {
      const res = await fetch(`${this.apiBase}/collections/forum_topik/records?sort=-disematkan,-created&expand=penulis&perPage=40`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) throw new Error("Gagal");
      const data = await res.json();
      this._allForum = data.items || [];

      if (this._allForum.length === 0) {
        if (el) el.innerHTML = `<div class="empty-state">Belum ada obrolan di forum pangkalan. Jadilah yang pertama!</div>`;
        return;
      }

      if (el) {
        el.innerHTML = this._allForum.map(t => `
          <div class="kas-card" style="flex-direction:column; align-items:stretch; margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div style="font-weight:700; font-size:0.92rem;">
                ${t.disematkan ? '📌 ' : ''}${this.escapeHtml(t.judul)}
              </div>
              <span class="role-pill role-anggota">${this.escapeHtml(t.kategori)}</span>
            </div>
            <div style="font-size:0.8rem; color:var(--text-main); margin:6px 0; line-height:1.35;">
              ${this.escapeHtml(t.isi)}
            </div>
            <div style="font-size:0.72rem; color:var(--text-sub);">
              👤 ${this.escapeHtml(t.expand?.penulis?.nama || t.expand?.penulis?.username || 'Anggota')} • ${(t.created || '').split(' ')[0]}
            </div>
          </div>
        `).join("");
      }
    } catch (e) {
      if (el) el.innerHTML = `<div class="empty-state">Gagal memuat forum diskusi.</div>`;
    }
  },

  async submitTopikForum(e) {
    if (e) e.preventDefault();
    const judul = document.getElementById("forum-input-judul")?.value.trim();
    const kategori = document.getElementById("forum-input-kategori")?.value || "umum";
    const isi = document.getElementById("forum-input-isi")?.value.trim();

    if (!judul || !isi) return;

    try {
      Hero.setExpression("berpikir", Teks.hero.loading);
      const res = await fetch(`${this.apiBase}/collections/forum_topik/records`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          judul, kategori, isi,
          penulis: this.user.id,
          disematkan: false,
          dikunci: false
        })
      });
      if (!res.ok) throw new Error("Gagal membuat topik");
      document.getElementById("form-topik-forum")?.reset();
      Hero.setExpression("senang", "Topik forum berhasil diposting!");
      this.loadForum();
    } catch (err) {
      alert("Gagal posting forum: " + err.message);
    }
  },

  async loadPanduan() {
    const el = document.getElementById("panduan-list");
    if (el) el.innerHTML = `<div class="empty-state">⏳ Memuat pusat panduan...</div>`;
    try {
      const res = await fetch(`${this.apiBase}/collections/panduan/records?filter=(diterbitkan=true)&sort=-created&perPage=50`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) throw new Error("Gagal");
      const data = await res.json();
      this._allPanduan = data.items || [];

      if (this._allPanduan.length === 0) {
        if (el) el.innerHTML = `<div class="empty-state">Belum ada artikel panduan yang diterbitkan.</div>`;
        return;
      }

      if (el) {
        el.innerHTML = this._allPanduan.map(p => `
          <div class="kas-card" style="flex-direction:column; align-items:stretch; margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div style="font-weight:700; font-size:0.95rem;">📚 ${this.escapeHtml(p.judul)}</div>
              <span class="role-pill role-pengurus">${this.escapeHtml(p.kategori)}</span>
            </div>
            <div style="font-size:0.75rem; color:var(--text-sub); margin-top:2px;">${this.escapeHtml(p.ringkasan || '')}</div>
            <div style="font-size:0.8rem; color:var(--text-main); margin-top:8px; line-height:1.4;">
              ${this.escapeHtml(p.isi)}
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; border-top:1px solid rgba(255,255,255,0.06); padding-top:6px; font-size:0.72rem;">
              <span style="color:var(--text-muted);">🏷️ ${this.escapeHtml(p.tag || '-')}</span>
              <a href="https://wa.me/?text=${encodeURIComponent(p.judul + ' - Baca panduan basecamp!')}" target="_blank" style="color:var(--warna-utama); text-decoration:none; font-weight:700;">
                📲 Bagikan ke WA
              </a>
            </div>
          </div>
        `).join("");
      }
    } catch (e) {
      if (el) el.innerHTML = `<div class="empty-state">Gagal memuat panduan.</div>`;
    }
  }
};
