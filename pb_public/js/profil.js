// js/profil.js - Modul Tampilan & Simpan Data Profil Anggota
window.AppModules = window.AppModules || {};

window.AppModules.Profil = {
  renderProfil() {
    if (!this.user) return;
    const namaEl = document.getElementById("profil-nama-display");
    const roleEl = document.getElementById("profil-role-display");
    const waEl = document.getElementById("profil-wa-display");
    const pctText = document.getElementById("profil-pct-text");
    const barFill = document.getElementById("profil-bar-fill");

    const nama = this.user.nama || this.user.nama_panggilan || this.user.username;
    if (namaEl) namaEl.innerText = nama;
    if (roleEl) roleEl.innerText = `${(this.user.role || 'anggota').toUpperCase()} • ${this.user.status || 'aktif'}`;
    if (waEl) waEl.innerText = `📱 ${this.user.whatsapp || this.user.kontak || 'Belum ada kontak'}`;

    const fotoEl = document.getElementById("profil-foto-img");
    if (fotoEl) {
      if (this.user.foto) {
        const fotoUrl = `${this.apiBase}/files/${this.user.collectionId}/${this.user.id}/${this.user.foto}`;
        fotoEl.innerHTML = `<img src="${fotoUrl}" style="width:100%; height:100%; object-fit:cover;">`;
      } else {
        fotoEl.innerHTML = `🛵`;
      }
    }

    const fNamaLengkap = document.getElementById("prof-nama-lengkap");
    const fNama = document.getElementById("prof-nama-panggilan");
    const fTglLahir = document.getElementById("prof-tanggal-lahir");
    const fWa = document.getElementById("prof-whatsapp");
    const fDomisili = document.getElementById("prof-domisili");
    const fBio = document.getElementById("prof-bio");
    const fDaruratNama = document.getElementById("prof-kontak-darurat-nama");
    const fDaruratTelp = document.getElementById("prof-kontak-darurat-telp");

    if (fNamaLengkap) fNamaLengkap.value = this.user.nama || "";
    if (fNama) fNama.value = this.user.nama_panggilan || "";
    if (fTglLahir) fTglLahir.value = this.user.tanggal_lahir ? this.user.tanggal_lahir.split(" ")[0] : "";
    if (fWa) fWa.value = this.user.whatsapp || this.user.kontak || "";
    if (fDomisili) fDomisili.value = this.user.domisili || "";
    if (fBio) fBio.value = this.user.bio || "";
    if (fDaruratNama) fDaruratNama.value = this.user.kontak_darurat_nama || "";
    if (fDaruratTelp) fDaruratTelp.value = this.user.kontak_darurat_telepon || "";

    if (this.renderKarakterAstrologi) this.renderKarakterAstrologi(this.user.tanggal_lahir);
    if (this.loadUserDokumenList) this.loadUserDokumenList();

    const checks = [
      !!(this.user.nama),
      !!(this.user.nama_panggilan),
      !!(this.user.tanggal_lahir),
      !!(this.user.foto),
      !!(this.user.whatsapp || this.user.kontak),
      !!this.user.domisili,
      !!this.user.bio,
      !!this.user.kontak_darurat_nama,
      !!this.user.kontak_darurat_telepon
    ];
    const filledCount = checks.filter(Boolean).length;
    const pct = Math.round((filledCount / checks.length) * 100);

    if (pctText) pctText.innerText = `${pct}%`;
    if (barFill) barFill.style.width = `${pct}%`;

    const badgeContainer = document.getElementById("profil-badges-container");
    if (badgeContainer) {
      const badges = [];
      const isLunas = (this.allIuran || []).some(i => i.anggota === this.user.id && i.periode === this.currentPeriod && i.status === "lunas");
      if (isLunas) {
        badges.push('<span class="badge" style="background:#10b981; color:#fff; font-size:0.7rem; padding:2px 8px; border-radius:10px;">⛽ Pejuang Tertib</span>');
      }
      if (this.user.role === "admin" || this.user.role === "pengurus" || this.user.role === "bendahara") {
        badges.push('<span class="badge" style="background:var(--warna-aksen); color:#000; font-size:0.7rem; padding:2px 8px; border-radius:10px;">🛡️ Pengawal Aspal</span>');
      }
      badges.push('<span class="badge" style="background:var(--bg-input); color:var(--text-primary); font-size:0.7rem; padding:2px 8px; border-radius:10px; border:1px solid var(--border-color);">🛵 Rider Satu Aspal</span>');
      badgeContainer.innerHTML = badges.join("");
    }
  },

  async saveProfilData(e) {
    if (e) e.preventDefault();
    if (!this.user) return;

    const nama = document.getElementById("prof-nama-lengkap")?.value.trim() || "";
    const nama_panggilan = document.getElementById("prof-nama-panggilan")?.value.trim() || "";
    const tanggal_lahir = document.getElementById("prof-tanggal-lahir")?.value || "";
    const whatsapp = document.getElementById("prof-whatsapp")?.value.trim() || "";
    const domisili = document.getElementById("prof-domisili")?.value.trim() || "";
    const kontak_darurat_nama = document.getElementById("prof-kontak-darurat-nama")?.value.trim() || "";
    const kontak_darurat_telepon = document.getElementById("prof-kontak-darurat-telp")?.value.trim() || "";
    const bio = document.getElementById("prof-bio")?.value.trim() || "";

    try {
      Hero.setExpression("berpikir", Teks.hero.loading);
      const res = await fetch(`${this.apiBase}/collections/users/records/${this.user.id}`, {
        method: "PATCH",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          nama: nama || this.user.nama,
          nama_panggilan,
          tanggal_lahir: tanggal_lahir ? (tanggal_lahir + " 00:00:00.000Z") : null,
          whatsapp,
          kontak: whatsapp || this.user.kontak,
          domisili,
          kontak_darurat_nama,
          kontak_darurat_telepon,
          bio,
          profil_dilengkapi_pada: new Date().toISOString()
        })
      });

      if (!res.ok) {
        const err = await res.json();
        Hero.setExpression("waspada", "Gagal menyimpan profil.");
        alert("Gagal menyimpan profil: " + JSON.stringify(err.data || err.message));
        return;
      }

      const updated = await res.json();
      this.user = { ...this.user, ...updated };
      localStorage.setItem("pb_user", JSON.stringify(this.user));

      Hero.setExpression("senang", "Mantap bro, data profil kamu berhasil diperbarui!");
      this.renderProfil();
      alert("Profil berhasil diperbarui!");
    } catch (err) {
      console.error(err);
      Hero.setExpression("waspada", "Terjadi kendala jaringan saat simpan profil.");
      alert("Terjadi kendala jaringan saat menyimpan profil!");
    }
  },

  async handleUploadFotoProfil(e) {
    const file = e.target.files[0];
    if (!file || !this.user) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran foto maksimal 2MB!");
      e.target.value = "";
      return;
    }

    const fd = new FormData();
    fd.append("foto", file);

    try {
      Hero.setExpression("berpikir", "Mengunggah foto profil...");
      const res = await fetch(`${this.apiBase}/collections/users/records/${this.user.id}`, {
        method: "PATCH",
        headers: this.getAuthHeaders(true),
        body: fd
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal upload foto profil");
      }
      const updated = await res.json();
      this.user = { ...this.user, ...updated };
      localStorage.setItem("pb_user", JSON.stringify(this.user));
      Hero.setExpression("senang", "Foto profil berhasil diperbarui!");
      this.renderProfil();
    } catch (err) {
      console.error(err);
      alert("Gagal mengunggah foto profil: " + err.message);
    }
  },

  handleTanggalLahirChange(e) {
    const val = e.target.value;
    if (this.renderKarakterAstrologi) this.renderKarakterAstrologi(val);
  }
};
