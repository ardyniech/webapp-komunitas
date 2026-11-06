// js/profil-foto.js - Upload & kompres foto profil (Plan §6.11, <200 baris, atomik dari profil.js)
window.AppModules = window.AppModules || {};

window.AppModules.ProfilFoto = {
  async handleUploadFotoProfil(e) {
    const file = e.target.files[0];
    if (!file || !this.user) return;
    const prevEl = document.getElementById("prof-foto-preview");
    const statEl = document.getElementById("prof-foto-status");
    if (file.size > 2 * 1024 * 1024) {
      if (statEl) { statEl.style.color = "var(--warna-merah)"; statEl.textContent = "Ukuran maksimal 2MB!"; }
      e.target.value = ""; return;
    }
    if (statEl) { statEl.style.color = "var(--text-sub)"; statEl.textContent = "Mengompres & mengunggah..."; }
    const kompres = await this.compressImage(file, 0.75);
    const fd = new FormData();
    fd.append("foto", kompres, "foto.jpg");
    try {
      Hero.setExpression("berpikir", "Mengunggah foto profil...");
      const res = await fetch(`${this.apiBase}/collections/users/records/${this.user.id}`, {
        method: "PATCH", headers: this.getAuthHeaders(true), body: fd
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Gagal upload"); }
      const updated = await res.json();
      this.user = { ...this.user, ...updated };
      localStorage.setItem("pb_user", JSON.stringify(this.user));
      if (prevEl && updated.foto) {
        prevEl.innerHTML = `<img src="${this.apiBase}/files/${this.user.collectionId}/${this.user.id}/${updated.foto}" style="width:100%;height:100%;object-fit:cover;">`;
      }
      if (statEl) { statEl.style.color = "var(--warna-utama)"; statEl.textContent = "✅ Foto tersimpan otomatis!"; }
      Hero.setExpression("senang", "Foto profil berhasil diperbarui!");
      this.renderProfil();
      // perbarui badge header (foto user)
      const badge = document.getElementById("user-header-badge");
      if (badge && this.user.foto) {
        const img = badge.querySelector("img");
        if (img) img.src = `${this.apiBase}/files/${this.user.collectionId}/${this.user.id}/${this.user.foto}`;
      }
    } catch (err) {
      if (statEl) { statEl.style.color = "var(--warna-merah)"; statEl.textContent = "Gagal: " + err.message; }
      alert("Gagal mengunggah foto profil: " + err.message);
    }
    e.target.value = "";
  },

  compressImage(file, kualitas) {
    return new Promise(resolve => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        const max = 800;
        if (w > max || h > max) { const s = Math.min(max / w, max / h); w *= s; h *= s; }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => resolve(new File([blob], "foto.jpg", { type: "image/jpeg" })), "image/jpeg", kualitas);
        URL.revokeObjectURL(img.src);
      };
    });
  },

  handleTanggalLahirChange(e) {
    if (this.renderKarakterAstrologi) this.renderKarakterAstrologi(e.target.value);
  }
};
