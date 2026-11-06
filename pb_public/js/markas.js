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

    const totalAnggota = this.sumberAnggota().filter(u => u.status === "aktif" && u.role !== "admin").length;
    const lunasList = (this.allIuran || []).filter(i => i.periode === this.currentPeriod && i.status === "lunas");
    const lunasCount = lunasList.length;
    const pct = totalAnggota > 0 ? Math.round((lunasCount / totalAnggota) * 100) : 0;

    // HTML pakai: bensin-fill-bar / bensin-status-text / dash-members-chips / dash-latest-kas
    const bensinBar = document.getElementById("bensin-fill-bar") || document.getElementById("dash-bensin-bar");
    const pctLabel = document.getElementById("bensin-status-text");
    if (bensinBar) bensinBar.style.width = `${pct}%`;
    if (pctLabel) pctLabel.innerText = `${pct}%`;

    const grid = document.getElementById("dash-members-chips") || document.getElementById("dash-driver-grid");
    if (grid) {
      const nonAdminUsers = this.sumberAnggota().filter(u => u.status === "aktif" && u.role !== "admin");
      if (nonAdminUsers.length === 0) {
        grid.innerHTML = `<div class="empty-state">Belum ada anggota terdaftar.</div>`;
      } else {
        grid.innerHTML = nonAdminUsers.map(u => {
          const isLunas = lunasList.some(i => i.anggota === u.id);
          return `
            <div class="driver-item ${isLunas ? 'lunas' : 'belum'}" title="${this.escapeHtml(u.nama || u.username)}: ${isLunas ? 'Iuran Lunas' : 'Belum Lunas'}">
              <div class="driver-icon">${isLunas ? '⛽' : '🛵'}</div>
              <div class="driver-name">${this.escapeHtml(u.nama_panggilan || u.nama || u.username)}</div>
            </div>
          `;
        }).join("");
      }
    }

    const txList = document.getElementById("dash-latest-kas") || document.getElementById("dash-recent-tx");
    if (txList) {
      const recent = (this.allKas || []).slice(0, 5);
      if (recent.length === 0) {
        txList.innerHTML = `<div class="empty-state">Belum ada transaksi kas tercatat.</div>`;
      } else {
        txList.innerHTML = recent.map(t => this.renderKasCardHtml(t)).join("");
      }
    }

    // ── Hero Welcome Banner dinamis ──
    const sapaanEl = document.getElementById("dash-hero-sapaan");
    const ucapanEl = document.getElementById("dash-hero-ucapan");
    if (sapaanEl && ucapanEl && this.user) {
      const nama = this.user.nama_panggilan || this.user.nama || this.user.username || "bro";
      const jam = new Date().getHours();
      let sapaan, ucapan;
      if (jam < 10) { sapaan = "Pagi, " + nama + "!"; ucapan = "Yuk cek kondisi pangkalan hari ini."; }
      else if (jam < 15) { sapaan = "Siang, " + nama + "!"; ucapan = "Semoga harimu lancar dan penuh rezeki."; }
      else if (jam < 18) { sapaan = "Sore, " + nama + "!"; ucapan = "Cek saldo kas sebelum berangkat lapangan."; }
      else { sapaan = "Malam, " + nama + "!"; ucapan = "Selesaikan catatan kas hari ini ya bos."; }
      sapaanEl.textContent = sapaan;
      ucapanEl.textContent = ucapan;
    }

    // ── Pengumuman Penting di Dashboard (di-sematkan) ───────────────────
    const pinEl = document.getElementById("dash-pengumuman-container");
    const pinList = document.getElementById("dash-pengumuman-list");
    const pin = (this._allPengumuman || []).filter(p => p.disematkan === true || p.disematkan === "true").slice(0, 3);
    if (pinEl && pinList) {
      if (pin.length === 0) {
        pinEl.style.display = "none";
      } else {
        pinEl.style.display = "block";
        pinList.innerHTML = pin.map(p => `
          <div class="kas-card" style="flex-direction:column; align-items:stretch; margin-bottom:8px; border-left:3px solid var(--warna-aksen);">
            <div style="font-weight:700; font-size:0.88rem; margin-bottom:4px;">
              ${p.penting ? '📌 ' : ''}${this.escapeHtml(p.judul)}
              ${p.penting ? '<span style="font-size:0.68rem; margin-left:6px; background:var(--warna-merah); color:#fff; padding:1px 6px; border-radius:4px;">PENTING</span>' : ''}
            </div>
            <div style="font-size:0.78rem; color:var(--text-main); line-height:1.35;">${this.escapeHtml(p.isi)}</div>
            <div style="font-size:0.68rem; color:var(--text-sub); margin-top:4px;">📅 ${(p.created || '').split(' ')[0]}</div>
          </div>
        `).join("");
      }
    }
  }
};
