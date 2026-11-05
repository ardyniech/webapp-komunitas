// js/profil-form.js - Form Data Pribadi & Bidang Kustom (Plan §5.8, §6.11, <200 baris)
window.AppModules = window.AppModules || {};

window.AppModules.ProfilForm = {
  renderDataPribadi() {
    const map = {
      "prof-nama-lengkap": "nama", "prof-nama-panggilan": "nama_panggilan",
      "prof-tanggal-lahir": "tanggal_lahir", "prof-whatsapp": "whatsapp",
      "prof-domisili": "domisili", "prof-bio": "bio",
      "prof-kontak-darurat-nama": "kontak_darurat_nama",
      "prof-kontak-darurat-telp": "kontak_darurat_telepon"
    };
    for (const id in map) {
      const el = document.getElementById(id);
      if (!el) continue;
      const val = this.user[map[id]];
      if (id === "prof-tanggal-lahir") el.value = val ? String(val).split(" ")[0] : "";
      else el.value = val || "";
    }
    this.renderBidangKustom();
  },

  renderBidangKustom() {
    const wrap = document.getElementById("profil-bidang-kustom-wrap");
    const list = document.getElementById("profil-bidang-kustom-list");
    if (!wrap || !list) return;
    const kustom = this.user.kustom || {};
    const defs = (this.bidangDefs || []);
    const visible = defs.filter(d => d.aktif !== false);
    if (visible.length === 0) { wrap.style.display = "none"; return; }
    wrap.style.display = "";
    let html = "";
    for (const d of visible) {
      const kunci = d.kunci;
      html += `<div class="form-group"><label>${this.escapeHtml(d.label || kunci)}</label>`;
      html += `<input type="text" class="form-control" data-kunci="${this.escapeHtml(kunci)}" value="${this.escapeHtml(kustom[kunci] || '')}"></div>`;
    }
    list.innerHTML = html;
  },

  async saveProfilData(e) {
    if (e) e.preventDefault();
    if (!this.user) return;
    const gather = id => document.getElementById(id)?.value.trim() || "";
    const tgl = document.getElementById("prof-tanggal-lahir")?.value || "";
    const payload = {
      nama: gather("prof-nama-lengkap") || this.user.nama,
      nama_panggilan: gather("prof-nama-panggilan"),
      tanggal_lahir: tgl ? (tgl + " 00:00:00.000Z") : null,
      whatsapp: gather("prof-whatsapp"),
      kontak: gather("prof-whatsapp") || this.user.kontak,
      domisili: gather("prof-domisili"),
      kontak_darurat_nama: gather("prof-kontak-darurat-nama"),
      kontak_darurat_telepon: gather("prof-kontak-darurat-telp"),
      bio: gather("prof-bio"),
      profil_dilengkapi_pada: new Date().toISOString()
    };
    const kustom = {};
    document.querySelectorAll("#profil-bidang-kustom-list input[data-kunci]").forEach(inp => {
      kustom[inp.getAttribute("data-kunci")] = inp.value;
    });
    if (Object.keys(kustom).length) payload.kustom = kustom;

    try {
      Hero.setExpression("berpikir", "Menyimpan data profil...");
      const res = await fetch(`${this.apiBase}/collections/users/records/${this.user.id}`, {
        method: "PATCH", headers: this.getAuthHeaders(), body: JSON.stringify(payload)
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Gagal simpan"); }
      const updated = await res.json();
      this.user = { ...this.user, ...updated };
      localStorage.setItem("pb_user", JSON.stringify(this.user));
      Hero.setExpression("senang", "Mantap bro, data profil berhasil diperbarui!");
      this.renderProfil();
      alert("Profil berhasil diperbarui!");
    } catch (err) {
      Hero.setExpression("waspada", "Gagal menyimpan profil.");
      alert("Gagal menyimpan profil: " + err.message);
    }
  }
};
