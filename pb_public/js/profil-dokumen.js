// js/profil-dokumen.js - Submodul Upload Dokumen Anggota (KTP, SIM, STNK)
window.AppModules = window.AppModules || {};

window.AppModules.ProfilDokumen = {
  async uploadDokumenAnggota(e) {
    if (e) e.preventDefault();
    if (!this.user) return;

    const judul = document.getElementById("doc-judul")?.value.trim();
    const kategori = document.getElementById("doc-kategori")?.value || "lainnya";
    const fileInput = document.getElementById("doc-file");

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      alert("Pilih file dokumen terlebih dahulu!");
      return;
    }

    const file = fileInput.files[0];
    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran berkas maksimal 2MB!");
      return;
    }

    const fd = new FormData();
    fd.append("judul", `${judul} (${this.user.nama || this.user.username})`);
    fd.append("kategori", kategori);
    fd.append("berkas", file);
    fd.append("hanya_pengurus", "true");

    try {
      Hero.setExpression("berpikir", "Mengunggah dokumen...");
      const res = await fetch(`${this.apiBase}/collections/dokumen/records`, {
        method: "POST",
        headers: this.getAuthHeaders(true),
        body: fd
      });

      if (res.ok) {
        Hero.setExpression("senang", "Dokumen berhasil diunggah!");
        alert("Dokumen berhasil diunggah dan disimpan aman!");
        document.getElementById("doc-judul").value = "";
        fileInput.value = "";
        this.loadUserDokumenList();
      } else {
        const err = await res.json();
        alert("Gagal unggah dokumen: " + JSON.stringify(err.message || err));
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kendala jaringan saat unggah dokumen!");
    }
  },

  async loadUserDokumenList() {
    const listEl = document.getElementById("doc-list-user");
    if (!listEl) return;
    try {
      const res = await fetch(`${this.apiBase}/collections/dokumen/records?sort=-created&perPage=5`, {
        headers: this.getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        const myDocs = (data.items || []).filter(d => (d.judul || '').includes(this.user.nama || this.user.username));
        if (myDocs.length === 0) {
          listEl.innerHTML = `<span style="color:var(--text-muted);">Belum ada dokumen yang diunggah.</span>`;
        } else {
          listEl.innerHTML = `<strong>Dokumen tersimpan:</strong><ul style="margin:4px 0 0 16px; padding:0;">` +
            myDocs.map(d => `<li>${this.escapeHtml(d.judul)} (${d.kategori}) - <span style="color:#10b981;">✓ Terunggah</span></li>`).join("") +
            `</ul>`;
        }
      }
    } catch (e) {
      console.warn("Could not load user docs list", e);
    }
  }
};
