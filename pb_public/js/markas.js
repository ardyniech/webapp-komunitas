// js/markas.js - Modul Dashboard Markas Pangkalan Ojol
window.AppModules = window.AppModules || {};

window.AppModules.Markas = {
  renderMarkas() {
    let totalSaldo = 0;
    let masukBulan = 0;
    let keluarBulan = 0;

    (this.allKas || []).forEach(t => {
      const nom = Number(t.nominal || 0);
      if (t.jenis === "masuk") totalSaldo += nom;
      else if (t.jenis === "keluar") totalSaldo -= nom;

      if (t.tanggal && t.tanggal.startsWith(this.currentPeriod)) {
        if (t.jenis === "masuk") masukBulan += nom;
        else if (t.jenis === "keluar") keluarBulan += nom;
      }
    });

    const saldoEl = document.getElementById("dash-total-saldo");
    const masukEl = document.getElementById("dash-masuk-bulan");
    const keluarEl = document.getElementById("dash-keluar-bulan");

    if (saldoEl) saldoEl.innerText = totalSaldo.toLocaleString("id-ID");
    if (masukEl) masukEl.innerText = `+Rp ${masukBulan.toLocaleString("id-ID")}`;
    if (keluarEl) keluarEl.innerText = `-Rp ${keluarBulan.toLocaleString("id-ID")}`;

    const totalAnggota = (this.allUsers || []).filter(u => u.status === "aktif" && u.role !== "admin").length;
    const lunasList = (this.allIuran || []).filter(i => i.periode === this.currentPeriod && i.status === "lunas");
    const lunasCount = lunasList.length;
    const pct = totalAnggota > 0 ? Math.round((lunasCount / totalAnggota) * 100) : 0;

    const bensinBar = document.getElementById("dash-bensin-bar");
    const pctLabel = document.getElementById("dash-iuran-pct");
    const countLabel = document.getElementById("dash-iuran-count");

    if (bensinBar) bensinBar.style.width = `${pct}%`;
    if (pctLabel) pctLabel.innerText = `${pct}% Terisi`;
    if (countLabel) countLabel.innerText = `${lunasCount} dari ${totalAnggota} anggota lunas`;

    const grid = document.getElementById("dash-driver-grid");
    if (grid) {
      const nonAdminUsers = (this.allUsers || []).filter(u => u.status === "aktif" && u.role !== "admin");
      if (nonAdminUsers.length === 0) {
        grid.innerHTML = `<div class="empty-state">Belum ada anggota terdaftar.</div>`;
      } else {
        grid.innerHTML = nonAdminUsers.map(u => {
          const isLunas = lunasList.some(i => i.anggota === u.id);
          return `
            <div class="driver-item ${isLunas ? 'lunas' : 'belum'}" title="${u.nama || u.username}: ${isLunas ? 'Iuran Lunas' : 'Belum Lunas'}">
              <div class="driver-icon">${isLunas ? '⛽' : '🛵'}</div>
              <div class="driver-name">${this.escapeHtml(u.nama_panggilan || u.nama || u.username)}</div>
            </div>
          `;
        }).join("");
      }
    }

    const txList = document.getElementById("dash-recent-tx");
    if (txList) {
      const recent = (this.allKas || []).slice(0, 5);
      if (recent.length === 0) {
        txList.innerHTML = `<div class="empty-state">Belum ada transaksi kas tercatat.</div>`;
      } else {
        txList.innerHTML = recent.map(t => this.renderKasCardHtml(t)).join("");
      }
    }
  }
};
