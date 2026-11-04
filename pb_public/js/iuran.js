// js/iuran.js - Modul Setoran Iuran Pangkalan Ojol
window.AppModules = window.AppModules || {};

window.AppModules.Iuran = {
  renderIuran() {
    const period = this.currentPeriod;
    const periodInput = document.getElementById("iuran-period-select");
    if (periodInput) periodInput.value = period;

    const listEl = document.getElementById("iuran-list");
    const barFill = document.getElementById("iuran-bensin-bar");
    const pctVal = document.getElementById("iuran-pct-val");
    const countVal = document.getElementById("iuran-count-val");
    const canManage = this.user && (this.user.role === "admin" || this.user.role === "bendahara");

    const totalAnggota = (this.allUsers || []).filter(u => u.status === "aktif" && u.role !== "admin").length;
    const lunasList = (this.allIuran || []).filter(i => i.periode === period && i.status === "lunas");
    const lunasCount = lunasList.length;
    const pct = totalAnggota > 0 ? Math.round((lunasCount / totalAnggota) * 100) : 0;

    if (pctVal) pctVal.innerText = `${pct}%`;
    if (barFill) barFill.style.width = `${pct}%`;
    if (countVal) countVal.innerText = `${lunasCount} dari ${totalAnggota} anggota lunas`;

    if (!listEl) return;
    const nonAdminUsers = (this.allUsers || []).filter(u => u.status === "aktif" && u.role !== "admin");

    if (nonAdminUsers.length === 0) {
      listEl.innerHTML = `<div class="empty-state">Belum ada data anggota aktif.</div>`;
      return;
    }

    listEl.innerHTML = nonAdminUsers.map(u => {
      const iuranRec = (this.allIuran || []).find(i => i.anggota === u.id && i.periode === period);
      const isLunas = iuranRec && iuranRec.status === "lunas";

      return `
        <div class="iuran-item ${isLunas ? 'lunas' : 'belum'}">
          <div class="iuran-avatar">
            ${isLunas ? '⛽' : '🛵'}
          </div>
          <div class="iuran-user-info">
            <div class="iuran-user-name">${this.escapeHtml(u.nama || u.username)}</div>
            <div class="iuran-user-sub">${u.kontak || u.domisili || 'Anggota Basecamp'} • ${u.role}</div>
          </div>
          <div>
            ${isLunas ? `
              <span class="status-pill status-lunas">LUNAS</span>
            ` : `
              ${canManage ? `
                <button class="btn btn-primary" style="padding:4px 10px; font-size:0.75rem;" 
                  onclick="App.bayarIuran('${u.id}', '${period}')">
                  Isi Bensin
                </button>
              ` : `
                <span class="status-pill status-belum">BELUM</span>
              `}
            `}
          </div>
        </div>
      `;
    }).join("");
  },

  async bayarIuran(userId, periode) {
    if (!this.user || (this.user.role !== "admin" && this.user.role !== "bendahara")) {
      alert("Hanya admin atau bendahara yang bisa menandai lunas iuran!");
      return;
    }

    const defaultNominal = (this.komunitas && this.komunitas.iuran_default) ? this.komunitas.iuran_default : 20000;
    const targetUser = (this.allUsers || []).find(u => u.id === userId);
    const namaUser = targetUser ? (targetUser.nama || targetUser.username) : "Anggota";

    if (!confirm(`Konfirmasi pelunasan iuran ${namaUser} periode ${periode} sebesar Rp ${defaultNominal.toLocaleString('id-ID')}?`)) {
      return;
    }

    try {
      Hero.setExpression("berpikir", Teks.hero.loading);

      const kasRes = await fetch(`${this.apiBase}/collections/kas/records`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          tanggal: new Date().toISOString().split("T")[0] + " 12:00:00.000Z",
          jenis: "masuk",
          nominal: defaultNominal,
          kategori: "iuran",
          keterangan: `Iuran ${periode} - ${namaUser}`,
          dicatat_oleh: this.user.id
        })
      });

      if (!kasRes.ok) throw new Error("Gagal mencatat transaksi kas");
      const kasData = await kasRes.json();

      const existingIuran = (this.allIuran || []).find(i => i.anggota === userId && i.periode === periode);
      if (existingIuran) {
        await fetch(`${this.apiBase}/collections/iuran/records/${existingIuran.id}`, {
          method: "PATCH",
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            status: "lunas",
            kas: kasData.id
          })
        });
      } else {
        await fetch(`${this.apiBase}/collections/iuran/records`, {
          method: "POST",
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            anggota: userId,
            periode: periode,
            nominal: defaultNominal,
            status: "lunas",
            kas: kasData.id
          })
        });
      }

      Hero.setExpression("senang", `Mantap! Iuran ${namaUser} lunas dan tercatat di kas!`);
      await this.refreshData();
    } catch (e) {
      console.error(e);
      Hero.setExpression("waspada", "Gagal memperbarui iuran.");
      alert("Terjadi kesalahan saat memproses pelunasan iuran.");
    }
  }
};
