// js/anggota.js - Manajemen Anggota Basecamp & Verifikasi Pendaftaran
window.AppModules = window.AppModules || {};

window.AppModules.Anggota = {
  async renderAnggota() {
    if (this.user.role !== "admin") return;
    const listEl = document.getElementById("anggota-list");
    if (listEl) {
      if ((this.allUsers || []).length === 0) {
        listEl.innerHTML = `<div class="empty-state">Belum ada anggota.</div>`;
      } else {
        listEl.innerHTML = this.allUsers.map(u => `
          <div class="anggota-item">
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="font-size:24px;">🛵</div>
              <div>
                <div style="font-weight:700; font-size:0.9rem;">${this.escapeHtml(u.nama || u.username)}</div>
                <div style="font-size:0.75rem; color:var(--text-sub);">
                  ${u.whatsapp || u.kontak || '-'} • <span class="role-pill role-${u.role}">${u.role}</span>
                </div>
              </div>
            </div>
            <div>
              <button class="btn btn-outline" style="padding:4px 8px; font-size:0.75rem;" 
                onclick="App.openEditRoleModal('${u.id}', '${u.role}')">
                Ubah Role
              </button>
            </div>
          </div>
        `).join("");
      }
    }

    const pendingWrap = document.getElementById("pendaftaran-pending-container");
    const pendingListEl = document.getElementById("pendaftaran-pending-list");
    if (pendingWrap && pendingListEl) {
      try {
        const res = await fetch(`${this.apiBase}/collections/pendaftaran/records?filter=(status='menunggu')&sort=-created`, {
          headers: this.getAuthHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          const items = data.items || [];
          if (items.length > 0) {
            pendingWrap.style.display = "block";
            pendingListEl.innerHTML = items.map(p => `
              <div class="anggota-item" style="border-left:3px solid var(--warna-aksen);">
                <div>
                  <div style="font-weight:700; font-size:0.9rem;">${this.escapeHtml(p.nama_lengkap)}</div>
                  <div style="font-size:0.75rem; color:var(--text-sub);">
                    📱 ${this.escapeHtml(p.whatsapp)} | 📍 ${this.escapeHtml(p.domisili || '-')}
                  </div>
                  <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">
                    Alasan: "${this.escapeHtml(p.alasan_bergabung || '-')}"
                  </div>
                </div>
                <div style="display:flex; gap:6px;">
                  <button class="btn btn-primary" style="padding:4px 8px; font-size:0.75rem;" onclick="App.verifikasiPendaftaran('${p.id}', 'setujui')">
                    ✓ Terima
                  </button>
                  <button class="btn btn-danger" style="padding:4px 8px; font-size:0.75rem;" onclick="App.verifikasiPendaftaran('${p.id}', 'tolak')">
                    ✕ Tolak
                  </button>
                </div>
              </div>
            `).join("");
          } else {
            pendingWrap.style.display = "none";
          }
        }
      } catch (e) {
        console.warn("Could not load pending pendaftaran", e);
      }
    }
  },

  async verifikasiPendaftaran(pendaftaranId, tindakan) {
    if (!confirm(`Konfirmasi untuk ${tindakan.toUpperCase()} pendaftaran ini?`)) return;
    try {
      Hero.setExpression("berpikir", Teks.hero.loading);
      const res = await fetch(`${this.apiBase}/komunitas/verifikasi-pendaftaran`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ pendaftaran_id: pendaftaranId, tindakan: tindakan })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal verifikasi");
      Hero.setExpression("senang", `Pendaftaran berhasil di-${tindakan}!`);
      await this.refreshData();
    } catch (err) {
      console.error(err);
      Hero.setExpression("waspada", "Terjadi kendala saat verifikasi pendaftaran.");
      alert("Gagal memproses verifikasi: " + err.message);
    }
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
    const username = document.getElementById("add-username")?.value.trim();
    const nama = document.getElementById("add-nama")?.value.trim();
    const kontak = document.getElementById("add-kontak")?.value.trim();
    const password = document.getElementById("add-password")?.value;
    const role = document.getElementById("add-role")?.value || "anggota";

    if (!username || !nama || !password) {
      alert("Harap lengkapi username, nama, dan password!");
      return;
    }

    try {
      Hero.setExpression("berpikir", Teks.hero.loading);
      const res = await fetch(`${this.apiBase}/collections/users/records`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          username,
          nama,
          kontak,
          password,
          passwordConfirm: password,
          role,
          status: "aktif",
          tanggal_gabung: new Date().toISOString()
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || JSON.stringify(err.data));
      }

      Hero.setExpression("senang", "Akun anggota baru berhasil dibuat!");
      this.closeAddAnggotaModal();
      document.getElementById("form-add-anggota")?.reset();
      await this.refreshData();
    } catch (e) {
      alert("Gagal menambahkan anggota: " + e.message);
    }
  },

  openEditRoleModal(userId, currentRole) {
    const modal = document.getElementById("modal-edit-role");
    if (!modal) return;
    document.getElementById("edit-role-user-id").value = userId;
    document.getElementById("edit-role-select").value = currentRole;
    modal.classList.add("show");
  },

  closeEditRoleModal() {
    const modal = document.getElementById("modal-edit-role");
    if (modal) modal.classList.remove("show");
  },

  async submitEditRole() {
    const userId = document.getElementById("edit-role-user-id")?.value;
    const newRole = document.getElementById("edit-role-select")?.value;
    if (!userId || !newRole) return;

    try {
      Hero.setExpression("berpikir", Teks.hero.loading);
      const res = await fetch(`${this.apiBase}/collections/users/records/${userId}`, {
        method: "PATCH",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ role: newRole })
      });

      if (!res.ok) throw new Error("Gagal mengubah role");
      Hero.setExpression("senang", "Role anggota berhasil diperbarui!");
      this.closeEditRoleModal();
      await this.refreshData();
    } catch (e) {
      alert("Gagal update role: " + e.message);
    }
  }
};
