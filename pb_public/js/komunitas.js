// js/komunitas.js - Pengaturan Identitas Komunitas & Branding
window.AppModules = window.AppModules || {};

window.AppModules.Komunitas = {
  async loadKomunitasBranding() {
    try {
      const res = await fetch(`${this.apiBase}/collections/komunitas/records?perPage=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          this.komunitas = data.items[0];
          Teks.init(this.komunitas);

          if (this.komunitas.warna_utama) {
            document.documentElement.style.setProperty("--warna-utama", this.komunitas.warna_utama);
          }
          if (this.komunitas.warna_aksen) {
            document.documentElement.style.setProperty("--warna-aksen", this.komunitas.warna_aksen);
          }

          document.querySelectorAll(".brand-name-text").forEach(el => el.innerText = this.komunitas.nama);
          document.querySelectorAll(".brand-tagline-text").forEach(el => el.innerText = this.komunitas.tagline);

          const logoEl = document.getElementById("brand-logo-container");
          if (logoEl) {
            if (this.komunitas.logo) {
              const logoUrl = `${this.apiBase}/files/${this.komunitas.collectionId}/${this.komunitas.id}/${this.komunitas.logo}`;
              logoEl.innerHTML = `<img src="${logoUrl}" alt="Logo" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">`;
            } else {
              logoEl.innerHTML = `🛵`;
            }
          }
        }
      }
    } catch (e) {
      console.warn("Could not load komunitas branding", e);
    }
  },

  openSetupKomunitasModal() {
    const modal = document.getElementById("modal-setup-komunitas");
    if (!modal || !this.komunitas) return;
    document.getElementById("setup-nama").value = this.komunitas.nama || "";
    document.getElementById("setup-tagline").value = this.komunitas.tagline || "";
    document.getElementById("setup-warna-utama").value = this.komunitas.warna_utama || "#1FA463";
    document.getElementById("setup-warna-aksen").value = this.komunitas.warna_aksen || "#FFB020";
    document.getElementById("setup-iuran-default").value = this.komunitas.iuran_default || 20000;
    
    const previewEl = document.getElementById("setup-logo-preview");
    if (previewEl) {
      if (this.komunitas.logo) {
        const logoUrl = `${this.apiBase}/files/${this.komunitas.collectionId}/${this.komunitas.id}/${this.komunitas.logo}`;
        previewEl.innerHTML = `<img src="${logoUrl}" style="width:100%; height:100%; object-fit:cover;">`;
      } else {
        previewEl.innerHTML = `🛵`;
      }
    }
    modal.classList.add("show");
  },

  previewSetupLogo(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      alert("Ukuran file logo maksimal 500KB!");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const previewEl = document.getElementById("setup-logo-preview");
      if (previewEl) previewEl.innerHTML = `<img src="${evt.target.result}" style="width:100%; height:100%; object-fit:cover;">`;
    };
    reader.readAsDataURL(file);
  },

  closeSetupKomunitasModal() {
    const modal = document.getElementById("modal-setup-komunitas");
    if (modal) modal.classList.remove("show");
  },

  async submitSetupKomunitas() {
    if (!this.komunitas) return;
    const nama = document.getElementById("setup-nama")?.value.trim();
    const tagline = document.getElementById("setup-tagline")?.value.trim();
    const warna_utama = document.getElementById("setup-warna-utama")?.value.trim();
    const warna_aksen = document.getElementById("setup-warna-aksen")?.value.trim();
    const iuran_default = Number(document.getElementById("setup-iuran-default")?.value) || 0;
    const logoInput = document.getElementById("setup-logo-file");

    if (!nama) { alert("Nama komunitas tidak boleh kosong!"); return; }

    try {
      let res;
      if (logoInput && logoInput.files && logoInput.files.length > 0) {
        const fd = new FormData();
        fd.append("nama", nama);
        fd.append("tagline", tagline);
        fd.append("warna_utama", warna_utama);
        fd.append("warna_aksen", warna_aksen);
        fd.append("iuran_default", iuran_default);
        fd.append("logo", logoInput.files[0]);
        res = await fetch(`${this.apiBase}/collections/komunitas/records/${this.komunitas.id}`, {
          method: "PATCH",
          headers: this.getAuthHeaders(true),
          body: fd
        });
      } else {
        res = await fetch(`${this.apiBase}/collections/komunitas/records/${this.komunitas.id}`, {
          method: "PATCH",
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ nama, tagline, warna_utama, warna_aksen, iuran_default })
        });
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal menyimpan identitas");
      }
      this.komunitas = await res.json();
      await this.loadKomunitasBranding();
      Hero.setExpression("senang", "Identitas & logo basecamp berhasil diperbarui!");
      this.closeSetupKomunitasModal();
    } catch (e) {
      alert("Gagal update komunitas: " + e.message);
    }
  }
};
