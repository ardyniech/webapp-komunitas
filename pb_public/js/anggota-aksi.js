// js/anggota-aksi.js - Tindakan Manajemen Anggota (detail, ubah role/status, <200 baris)
window.AppModules = window.AppModules || {};

window.AppModules.AnggotaAksi = {
  async openMemberDetail(userId) {
    if (!this.bolehKelolaAnggota()) return;
    const modal = document.getElementById("modal-member-detail");
    const body = document.getElementById("member-detail-body");
    const actions = document.getElementById("member-detail-actions");
    const idEl = document.getElementById("member-detail-id");
    if (!modal || !body) return;
    idEl.value = userId;
    body.innerHTML = `<div class="empty-state">Memuat detail...</div>`;
    actions.innerHTML = "";
    modal.classList.add("show");
    try {
      const res = await fetch(`${this.apiBase}/collections/users/records/${userId}`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) throw new Error("Gagal memuat detail");
      const u = await res.json();
      const status = u.status || (u.aktif === false ? "nonaktif" : "aktif");
      body.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
          <div style="width:44px;height:44px;border-radius:50%;background:var(--warna-utama);display:flex;align-items:center;justify-content:center;font-size:20px;">🛵</div>
          <div>
            <div style="font-weight:700;">${this.escapeHtml(u.nama || u.username)}</div>
            <div style="font-size:0.75rem;color:var(--text-sub);">${u.whatsapp || u.kontak || '-'} • ${this.escapeHtml(u.domisili || '-')}</div>
          </div>
        </div>
        <div style="font-size:0.78rem; margin-bottom:8px;"><strong>Role:</strong> <span class="role-pill role-${u.role}">${u.role}</span></div>
        <div style="font-size:0.78rem; margin-bottom:8px;"><strong>Status:</strong> ${status}</div>
        <div style="font-size:0.78rem; margin-bottom:8px;"><strong>Username:</strong> ${this.escapeHtml(u.username || '-')}</div>
        <div style="font-size:0.78rem;"><strong>Terdaftar:</strong> ${u.created || '-'}</div>
      `;
      actions.innerHTML = `
        <button class="btn btn-primary" onclick="App.openEditMember('${this.escapeJs(u.id)}'); App.closeMemberDetailModal();">Ubah Data</button>
        <button class="btn btn-outline" onclick="App.closeMemberDetailModal()">Tutup</button>
      `;
    } catch (err) {
      body.innerHTML = `<div class="empty-state">Gagal memuat detail: ${err.message}</div>`;
    }
  },

  closeMemberDetailModal() {
    const m = document.getElementById("modal-member-detail");
    if (m) m.classList.remove("show");
  },

  async openEditMember(userId) {
    if (!this.bolehKelolaAnggota()) return;
    const modal = document.getElementById("modal-edit-member");
    const idEl = document.getElementById("edit-member-id");
    if (!modal || !idEl) return;
    idEl.value = userId;
    // Isi dari data yang sudah ada (allUsers)
    const u = this.sumberAnggota().find(x => x.id === userId) || {};
    document.getElementById("edit-member-nama").value = u.nama || u.nama_lengkap || "";
    document.getElementById("edit-member-whatsapp").value = u.whatsapp || u.kontak || "";
    document.getElementById("edit-member-domisili").value = u.domisili || "";
    document.getElementById("edit-member-role").value = u.role || "anggota";
    document.getElementById("edit-member-status").value = u.status || "aktif";
    modal.classList.add("show");
  },

  closeEditMemberModal() {
    const m = document.getElementById("modal-edit-member");
    if (m) m.classList.remove("show");
  },

  async submitEditMember() {
    if (!this.bolehKelolaAnggota()) return;
    const userId = document.getElementById("edit-member-id")?.value;
    if (!userId) return;
    const payload = {
      nama: document.getElementById("edit-member-nama")?.value.trim(),
      whatsapp: document.getElementById("edit-member-whatsapp")?.value.trim(),
      domisili: document.getElementById("edit-member-domisili")?.value.trim(),
      role: document.getElementById("edit-member-role")?.value || "anggota",
      status: document.getElementById("edit-member-status")?.value || "aktif"
    };
    try {
      Hero.setExpression("berpikir", "Menyimpan perubahan anggota...");
      const res = await fetch(`${this.apiBase}/collections/users/records/${userId}`, {
        method: "PATCH", headers: this.getAuthHeaders(), body: JSON.stringify(payload)
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Gagal update"); }
      Hero.setExpression("senang", "Data anggota berhasil diperbarui!");
      this.closeEditMemberModal();
      await this.segarkanAnggota();
    } catch (err) {
      alert("Gagal update anggota: " + err.message);
    }
  },

  escapeJs(s) {
    return String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  }
};
