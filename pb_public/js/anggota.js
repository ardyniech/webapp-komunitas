// js/anggota.js - Direktori & Manajemen Anggota (Plan §5.9, §6.11, <200 baris)
window.AppModules = window.AppModules || {};

window.AppModules.Anggota = {
  async renderAnggota() {
    const canManage = this.bolehKelolaAnggota();
    const btnTambah = document.getElementById("btn-tambah-anggota");
    const btnBidang = document.getElementById("btn-kelola-bidang");
    if (btnTambah) btnTambah.style.display = canManage ? "inline-flex" : "none";
    if (btnBidang) btnBidang.style.display = canManage ? "inline-flex" : "none";
    this.hitungStat();
    this.renderList();
  },

  segarkanAnggota() {
    Hero.setExpression("berpikir", "Mengambil data anggota...");
    return this.fetchAnggotaData().then(() => this.renderAnggota());
  },

  hitungStat() {
    const list = this.daftarAnggota();
    const elTotal = document.getElementById("anggota-stat-total");
    const elAktif = document.getElementById("anggota-stat-aktif");
    const elPending = document.getElementById("anggota-stat-pending");
    const elPengurus = document.getElementById("anggota-stat-pengurus");
    if (elTotal) elTotal.textContent = list.length;
    if (elAktif) elAktif.textContent = list.filter(a => a.status === "aktif").length;
    if (elPending) elPending.textContent = list.filter(a => a.status === "menunggu").length;
    if (elPengurus) elPengurus.textContent = list.filter(a => a.role === "pengurus" || a.role === "bendahara" || a.role === "admin").length;
  },

  daftarAnggota() {
    return this.sumberAnggota ? this.sumberAnggota() : (this.bolehKelolaAnggota() ? this.allUsers || [] : this.allProfilPublik || []);
  },

  renderList() {
    const listEl = document.getElementById("anggota-list");
    const emptyEl = document.getElementById("anggota-empty");
    if (!listEl) return;
    const cari = (document.getElementById("anggota-search")?.value || "").toLowerCase();
    const fRole = document.getElementById("anggota-filter-role")?.value || "all";
    const fStatus = document.getElementById("anggota-filter-status")?.value || "all";

    const list = this.daftarAnggota().filter(a => {
      const nama = (a.nama || a.nama_lengkap || a.nama_tampil || a.username || "").toLowerCase();
      const wa = (a.whatsapp || a.kontak || "").toLowerCase();
      const role = (a.role || a.role_ringkas || "").toLowerCase();
      const status = (a.status || a.aktif === false ? "nonaktif" : "aktif").toLowerCase();
      const cocokCari = !cari || nama.includes(cari) || wa.includes(cari) || role.includes(cari);
      const cocokRole = fRole === "all" || role === fRole;
      const cocokStatus = fStatus === "all" || status === fStatus;
      return cocokCari && cocokRole && cocokStatus;
    });

    const wrap = document.getElementById("anggota-list-wrap");
    const canManage = this.bolehKelolaAnggota();

    if (list.length === 0) {
      listEl.innerHTML = `<div class="empty-state">Tidak ada anggota yang cocok.</div>`;
      if (wrap) wrap.style.display = "none";
      if (emptyEl) emptyEl.style.display = "block";
      return;
    }
    if (wrap) wrap.style.display = "";
    if (emptyEl) emptyEl.style.display = "none";

    listEl.innerHTML = list.map(a => this.anggotaItemHTML(a, canManage)).join("");
  },

  anggotaItemHTML(a, canManage) {
    const nama = a.nama || a.nama_lengkap || a.nama_tampil || a.username || "Anggota";
    const role = a.role || a.role_ringkas || "anggota";
    const status = a.status !== undefined ? a.status : (a.aktif === false ? "nonaktif" : "aktif");
    const wa = a.whatsapp || a.kontak || "-";
    const domisili = a.domisili || "-";
    const roleBadge = `<span class="role-pill role-${role}">${role}</span>`;
    const statusBadge = status === "aktif" ? '<span class="badge" style="background:#10b981;color:#fff;font-size:0.7rem;padding:2px 8px;border-radius:10px;">Aktif</span>' : `<span class="badge" style="background:var(--bg-input);color:var(--text-primary);font-size:0.7rem;padding:2px 8px;border-radius:10px;border:1px solid var(--border-color);">${status}</span>`;

    let aksi = "";
    if (canManage) {
      aksi = `
        <button class="btn btn-outline" style="padding:4px 8px;font-size:0.72rem;" onclick="App.openMemberDetail('${this.escapeJs(a.id)}')">Detail</button>
        <button class="btn btn-primary" style="padding:4px 8px;font-size:0.72rem;" onclick="App.openEditMember('${this.escapeJs(a.id)}')">Ubah</button>
      `;
    }
    return `
      <div class="anggota-item" style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-bottom:1px solid var(--border-color);">
        <div style="display:flex; align-items:center; gap:10px; min-width:0;">
          <div style="font-size:20px;">🛵</div>
          <div style="min-width:0;">
            <div style="font-weight:700; font-size:0.88rem;">${this.escapeHtml(nama)}</div>
            <div style="font-size:0.72rem; color:var(--text-sub);">📱 ${this.escapeHtml(wa)} • ${this.escapeHtml(domisili)}</div>
            <div style="font-size:0.72rem; color:var(--text-sub); margin-top:2px;">${roleBadge} ${statusBadge}</div>
          </div>
        </div>
        <div style="display:flex; gap:6px;">${aksi}</div>
      </div>
    `;
  },

  escapeJs(s) {
    return String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  },

  openAddAnggotaModal() {
    const modal = document.getElementById("modal-add-anggota");
    if (modal) modal.classList.add("show");
  },

  closeAddAnggotaModal() {
    const modal = document.getElementById("modal-add-anggota");
    if (modal) modal.classList.remove("show");
  },

  async submitAddAnggota() {
    const nama = document.getElementById("add-anggota-nama")?.value.trim();
    const email = document.getElementById("add-anggota-email")?.value.trim();
    const kontak = document.getElementById("add-anggota-kontak")?.value.trim();
    const password = document.getElementById("add-anggota-pass")?.value;
    const role = document.getElementById("add-anggota-role")?.value || "anggota";

    if (!nama || !password) {
      alert("Harap lengkapi nama dan password!");
      return;
    }

    try {
      Hero.setExpression("berpikir", "Membuat akun anggota baru...");
      const res = await fetch(`${this.apiBase}/collections/users/records`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          email: email || (kontak + "@komunitas.local"),
          username: "usr_" + (kontak || nama).replace(/[^a-zA-Z0-9]/g, "").slice(-6) + "_" + Math.floor(Math.random() * 1000),
          nama,
          kontak,
          whatsapp: kontak,
          role,
          status: "aktif",
          password,
          passwordConfirm: password,
          tanggal_gabung: new Date().toISOString()
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || JSON.stringify(err.data));
      }

      Hero.setExpression("senang", "Akun anggota baru berhasil dibuat!");
      this.closeAddAnggotaModal();
      const inputs = document.querySelectorAll("#modal-add-anggota input, #modal-add-anggota select");
      inputs.forEach(i => { if (i.type !== "hidden") i.value = ""; });
      await this.segarkanAnggota();
    } catch (e) {
      alert("Gagal menambahkan anggota: " + e.message);
    }
  }
};
