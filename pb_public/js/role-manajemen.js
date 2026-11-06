// js/role-manajemen.js - Halaman khusus Role & Manajemen Anggota (admin/superadmin saja).
// Fitur: matriks peran (hitung per role), ubah role/status/tim inline per anggota.
// Guard ganda: UI disembunyikan + switchTab diblokir; backend memvalidasi lagi.
window.AppModules = window.AppModules || {};

const ROLE_LIST = ["superadmin", "admin", "pengurus", "bendahara", "anggota"];
const TIM_LIST = ["dewan_etik", "satgas", "pengurus_tetap", "pengurus_harian", "lainnya"];
const STATUS_LIST = ["aktif", "nonaktif", "menunggu", "ditolak"];

window.AppModules.RoleManajemen = {
  bolehRoleManajemen() {
    const r = (this.user && this.user.role) || "";
    return r === "admin" || r === "superadmin";
  },

  async renderRole() {
    const el = document.getElementById("role-matrix");
    const listEl = document.getElementById("role-users-list");
    if (!el) return;
    if (!this.bolehRoleManajemen()) {
      el.innerHTML = "";
      if (listEl) listEl.innerHTML = `<div class="empty-state">Halaman ini khusus admin/superadmin.</div>`;
      return;
    }
    const list = this.bolehKelolaAnggota() && this.allUsers && this.allUsers.length
      ? this.allUsers
      : this.sumberAnggota();

    // Matriks hitung per role
    el.innerHTML = ROLE_LIST.map((r) => {
      const n = list.filter((u) => (u.role || "") === r).length;
      return (
        `<div class="stat-tile"><div class="stat-nilai">${n}</div>` +
        `<div class="stat-label" style="text-transform:capitalize;">${this.esc(r)}</div></div>`
      );
    }).join("");

    if (listEl) {
      listEl.innerHTML = list
        .map((u) => {
          const opts = (vals, cur) =>
            vals.map((v) => `<option value="${v}" ${v === cur ? "selected" : ""}>${v}</option>`).join("");
          const tim = Array.isArray(u.tim) ? u.tim : [u.tim].filter(Boolean);
          return (
            `<div class="kas-card" style="align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px;">` +
            `<div style="min-width:140px;flex:1;">` +
            `<div style="font-weight:700;font-size:0.88rem;">${this.esc(u.nama || u.username)}</div>` +
            `<div style="font-size:0.72rem;color:var(--text-sub);">${this.esc(u.username || "")} · ${this.esc(u.whatsapp || u.kontak || "-")}</div></div>` +
            `<select class="form-control" style="width:auto;" onchange="App.ubahRoleUbah('${u.id}', this.value)">` +
            opts(ROLE_LIST, u.role) +
            `</select>` +
            `<select class="form-control" style="width:auto;" onchange="App.ubahStatusUbah('${u.id}', this.value)">` +
            opts(STATUS_LIST, (u.status || "aktif")) +
            `</select>` +
            `<span style="font-size:0.7rem;color:var(--text-muted);">tim: ${tim.join(", ") || "-"}</span>` +
            `</div>`
          );
        })
        .join("");
    }
  },

  async ubahRoleUbah(userId, roleBaru) {
    return this._ubahUser(userId, { role: roleBaru });
  },

  async ubahStatusUbah(userId, statusBaru) {
    return this._ubahUser(userId, { status: statusBaru });
  },

  async _ubahUser(userId, payload) {
    if (!this.bolehRoleManajemen()) {
      alert("Hanya admin/superadmin yang bisa mengubah data ini.");
      return;
    }
    try {
      Hero.setExpression("berpikir", "Menyimpan perubahan...");
      const res = await fetch(`${this.apiBase}/collections/users/records/${userId}`, {
        method: "PATCH",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal update");
      }
      Hero.setExpression("senang", "Data diperbarui!");
      await this.fetchAnggotaData();
      this.renderRole();
    } catch (e) {
      alert("Gagal update (mungkin proteksi admin terakhir / superadmin): " + e.message);
      this.renderRole();
    }
  },

  esc(s) {
    return (window.UIHelpers && UIHelpers.esc) || String(s == null ? "" : s);
  },
};
