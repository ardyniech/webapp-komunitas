// js/profil.js - Modul Tampilan Profil dengan Sub-tab (Plan §6.11, <200 baris)
window.AppModules = window.AppModules || {};

window.AppModules.Profil = {
  profilSubAktif: "ringkasan",

  profilSwitchSub(sub) {
    this.profilSubAktif = sub;
    // Aktifkan tombol sub-tab berdasarkan data-sub atribut (lebih andal dari cocokan teks)
    document.querySelectorAll(".sub-tab").forEach(b => {
      b.classList.toggle("active", b.getAttribute("data-sub") === sub);
    });
    document.querySelectorAll(".sub-tab-panel").forEach(p => p.classList.remove("active"));
    const el = document.getElementById("profil-sub-" + sub);
    if (el) el.classList.add("active");
    if (sub === "aktivitas" && this.renderAktivitas) this.renderAktivitas();
    if (sub === "privasi") this.renderPrivasi();
  },

  subLabel(sub) {
    const map = { ringkasan: "Ringkasan", datapribadi: "Data Pribadi", privasi: "Privasi", aktivitas: "Aktivitas", keamanan: "Keamanan" };
    return map[sub] || sub;
  },

  renderProfil() {
    if (!this.user) return;
    this.renderRingkasan();
    if (this.renderDataPribadi) this.renderDataPribadi();
    this.renderPrivasi();
    if (this.profilSubAktif === "aktivitas" && this.renderAktivitas) this.renderAktivitas();
    const fotoEl = document.getElementById("profil-foto-img");
    if (fotoEl) {
      if (this.user.foto) {
        const fotoUrl = `${this.apiBase}/files/${this.user.collectionId}/${this.user.id}/${this.user.foto}`;
        fotoEl.innerHTML = `<img src="${fotoUrl}" style="width:100%; height:100%; object-fit:cover;">`;
      } else {
        fotoEl.innerHTML = `🛵`;
      }
    }
  },

  renderRingkasan() {
    const nama = this.user.nama || this.user.nama_panggilan || this.user.username;
    const namaEl = document.getElementById("profil-nama-display");
    const roleEl = document.getElementById("profil-role-display");
    const waEl = document.getElementById("profil-wa-display");
    if (namaEl) namaEl.textContent = nama;
    if (roleEl) roleEl.textContent = `${(this.user.role || 'anggota').toUpperCase()} • ${this.user.status || 'aktif'}`;
    if (waEl) waEl.textContent = `📱 ${this.user.whatsapp || this.user.kontak || 'Belum ada kontak'}`;

    const badgeContainer = document.getElementById("profil-badges-container");
    if (badgeContainer) {
      const badges = [];
      const isLunas = (this.allIuran || []).some(i => i.anggota === this.user.id && i.periode === this.currentPeriod && i.status === "lunas");
      if (isLunas) badges.push('<span class="badge" style="background:#10b981; color:#fff; font-size:0.7rem; padding:2px 8px; border-radius:10px;">⛽ Pejuang Tertib</span>');
      if (this.user.role === "admin" || this.user.role === "pengurus" || this.user.role === "bendahara") {
        badges.push('<span class="badge" style="background:var(--warna-aksen); color:#000; font-size:0.7rem; padding:2px 8px; border-radius:10px;">🛡️ Pengawal Aspal</span>');
      }
      badges.push('<span class="badge" style="background:var(--bg-input); color:var(--text-primary); font-size:0.7rem; padding:2px 8px; border-radius:10px; border:1px solid var(--border-color);">🛵 Rider Satu Aspal</span>');

      // Pangkat & badge ringan (Plan §6.6-7): berdasarkan tanggal gabung
      const tglGabung = this.user.tanggal_gabung;
      if (tglGabung) {
        const hari = Math.floor((Date.now() - new Date(tglGabung).getTime()) / (1000*60*60*24));
        if (hari >= 180) {
          badges.push('<span class="badge" style="background:#6366f1; color:#fff; font-size:0.7rem; padding:2px 8px; border-radius:10px;">🏆 Anggora Setia ('+hari+' hari)</span>');
        } else if (hari >= 90) {
          badges.push('<span class="badge" style="background:#a855f7; color:#fff; font-size:0.7rem; padding:2px 8px; border-radius:10px;">🌙 Setia ('+hari+' hari)</span>');
        }
      }

      badgeContainer.innerHTML = badges.join("");
    }

    const checks = [
      !!(this.user.nama), !!(this.user.nama_panggilan), !!(this.user.tanggal_lahir),
      !!(this.user.foto), !!(this.user.whatsapp || this.user.kontak), !!this.user.domisili,
      !!this.user.bio, !!this.user.kontak_darurat_nama, !!this.user.kontak_darurat_telepon
    ];
    const pct = Math.round((checks.filter(Boolean).length / checks.length) * 100);
    const pctText = document.getElementById("profil-pct-text");
    const barFill = document.getElementById("profil-bar-fill");
    if (pctText) pctText.textContent = `${pct}%`;
    if (barFill) barFill.style.width = `${pct}%`;

    if (this.renderKarakterAstrologi) this.renderKarakterAstrologi(this.user.tanggal_lahir);
  },

  renderPrivasi() {
    const rowsEl = document.getElementById("privasi-rows");
    if (!rowsEl) return;
    const vis = this.user.visibilitas || {};
    const defs = (this.bidangDefs || []);
    const standar = ["whatsapp", "domisili", "bio", "foto"];
    let html = "";
    for (const k of standar) {
      const nilai = vis[k] || "anggota";
      html += `<div class="form-group"><label>${this.labelPrivasi(k)}</label>
        <select class="form-control" data-vis="${this.escapeHtml(k)}">
          <option value="anggota" ${nilai === "anggota" || nilai === "semua" ? "selected" : ""}>Anggota Basecamp</option>
          <option value="pengurus" ${nilai === "pengurus" ? "selected" : ""}>Hanya Pengurus</option>
          <option value="pribadi" ${nilai === "pribadi" ? "selected" : ""}>Hanya Saya (Pribadi)</option>
        </select></div>`;
    }
    for (const d of defs) {
      const kunci = d.kunci;
      if (!kunci) continue;
      const batas = d.terlihat_oleh || "pribadi";
      const nilai = vis[kunci] || "pribadi";
      html += `<div class="form-group"><label>${this.escapeHtml(d.label || kunci)} <span style="font-size:0.7rem;color:var(--text-sub);">(maks: ${batas})</span></label>
        <select class="form-control" data-vis="${this.escapeHtml(kunci)}">${this.opsiPrivasi(batas).map(o => `<option value="${o.v}" ${nilai === o.v ? "selected" : ""}>${o.t}</option>`).join("")}</select></div>`;
    }
    rowsEl.innerHTML = html;
  },

  labelPrivasi(k) {
    const m = { whatsapp: "WhatsApp", domisili: "Domisili", bio: "Bio", foto: "Foto Profil" };
    return m[k] || k;
  },

  opsiPrivasi(batas) {
    const all = [
      { v: "pribadi", t: "Hanya Saya (Pribadi)" },
      { v: "pengurus", t: "Hanya Pengurus" },
      { v: "anggota", t: "Anggota Basecamp" }
    ];
    const rank = { pribadi: 0, pengurus: 1, anggota: 2 };
    return all.filter(o => rank[o.v] <= rank[batas]);
  },

  async simpanPrivasi() {
    if (!this.user) return;
    const vis = {};
    document.querySelectorAll("#privasi-rows select[data-vis]").forEach(sel => {
      vis[sel.getAttribute("data-vis")] = sel.value;
    });
    try {
      const res = await fetch(`${this.apiBase}/collections/users/records/${this.user.id}`, {
        method: "PATCH", headers: this.getAuthHeaders(),
        body: JSON.stringify({ visibilitas: vis })
      });
      if (!res.ok) throw new Error("Gagal menyimpan privasi");
      this.user.visibilitas = vis;
      localStorage.setItem("pb_user", JSON.stringify(this.user));
      Hero.setExpression("senang", "Pengaturan privasi tersimpan bro!");
      alert("Pengaturan privasi berhasil disimpan!");
    } catch (err) {
      alert("Gagal simpan privasi: " + err.message);
    }
  },
};
