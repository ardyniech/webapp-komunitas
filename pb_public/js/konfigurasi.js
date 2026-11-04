// js/konfigurasi.js - Modul Editor Konfigurasi Kebijakan Basecamp
window.AppModules = window.AppModules || {};

window.AppModules.Konfigurasi = {
  _konfigurasiLoaded: false,

  async toggleKonfigurasiEditor() {
    const container = document.getElementById("konfigurasi-editor-container");
    if (!container) return;
    const isHidden = container.style.display === "none";
    container.style.display = isHidden ? "block" : "none";

    if (isHidden && !this._konfigurasiLoaded) {
      this.loadKonfigurasiList();
    }
  },

  async loadKonfigurasiList() {
    const listEl = document.getElementById("konfigurasi-list-items");
    if (!listEl) return;
    listEl.innerHTML = `<div class="empty-state">⏳ Memuat setelan kebijakan...</div>`;
    try {
      const res = await fetch(`${this.apiBase}/collections/konfigurasi/records?sort=kunci`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) throw new Error("Gagal");
      const items = (await res.json()).items || [];
      if (items.length === 0) {
        listEl.innerHTML = `<div class="empty-state">Belum ada parameter konfigurasi.</div>`;
        return;
      }
      listEl.innerHTML = items.map(c => `
        <div style="padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.06); font-size:0.78rem;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:var(--warna-utama);">${this.escapeHtml(c.kunci)}</strong>
            <span style="font-size:0.7rem; color:var(--text-sub);">Wewenang: ${c.wewenang}</span>
          </div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin:2px 0;">${this.escapeHtml(c.deskripsi || '')}</div>
          <div style="display:flex; gap:6px; margin-top:4px;">
            <input type="text" id="cfg-val-${c.id}" value="${this.escapeHtml(typeof c.nilai === 'object' ? JSON.stringify(c.nilai) : String(c.nilai))}" class="form-control" style="padding:4px 8px; font-size:0.75rem;">
            <button class="btn btn-outline" style="padding:4px 8px; font-size:0.72rem;" onclick="App.simpanKonfigurasi('${c.id}')">Simpan</button>
          </div>
        </div>
      `).join("");
      this._konfigurasiLoaded = true;
    } catch (e) {
      listEl.innerHTML = `<div class="empty-state">Gagal memuat konfigurasi.</div>`;
    }
  },

  async simpanKonfigurasi(id) {
    const input = document.getElementById(`cfg-val-${id}`);
    if (!input) return;
    let val = input.value.trim();
    try { val = JSON.parse(val); } catch(e){}

    try {
      Hero.setExpression("berpikir", Teks.hero.loading);
      const res = await fetch(`${this.apiBase}/collections/konfigurasi/records/${id}`, {
        method: "PATCH",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          nilai: val,
          diubah_oleh: this.user.id,
          diubah_pada: new Date().toISOString()
        })
      });
      if (!res.ok) throw new Error("Gagal menyimpan");
      Hero.setExpression("senang", "Parameter konfigurasi berhasil disimpan!");
      alert("Setelan konfigurasi berhasil diperbarui!");
    } catch (e) {
      alert("Gagal update konfigurasi: " + e.message);
    }
  }
};
