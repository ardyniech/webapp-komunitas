// js/kas.js - Modul Manajemen Dompet Kas & Ekspor CSV
window.AppModules = window.AppModules || {};
window.AppModules.Kas = {
  renderKasCardHtml(t) {
    const isMasuk = t.jenis === "masuk";
    const sign = isMasuk ? "+" : "-";
    const nomStr = `${sign}Rp ${Number(t.nominal).toLocaleString("id-ID")}`;
    const dicatatOleh = t.expand?.dicatat_oleh?.nama || "Pengurus";
    const hasBukti = !!t.bukti;
    const canManageKas = this.user && (this.user.role === "admin" || this.user.role === "bendahara");

    // Kategori badge dengan warna
    const kategoriWarna = {
      iuran: "#10b981",
      donasi: "#3b82f6",
      operasional: "#f59e0b",
      sosial: "#ec4899",
      dana_event: "#8b5cf6",
      sisa_dana_event: "#06b6d4",
      lainnya: "#6b7280"
    };
    const katWarna = kategoriWarna[t.kategori] || "#6b7280";

    return `
      <div class="kas-card dash-card-lift">
        <div class="kas-icon-badge ${t.jenis}" style="background:${isMasuk ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; color:${isMasuk ? '#34d399' : '#f87171'};">
          ${isMasuk ? '🪙' : '🧾'}
        </div>
        <div class="kas-info">
          <div class="kas-keterangan" style="font-weight:700;">
            ${this.escapeHtml(t.keterangan)} ${t.mengoreksi ? `<span style="color:var(--warna-aksen); font-size:0.72rem; font-weight:700; margin-left:6px;">(Koreksi)</span>` : ''}
          </div>
          <div class="kas-sub">
            <span style="background:${katWarna}; color:#fff; font-size:0.65rem; padding:1px 6px; border-radius:6px; font-weight:700;">${t.kategori}</span>
            <span>📅 ${t.tanggal ? t.tanggal.split(" ")[0] : '-'}</span>
            <span>👤 ${dicatatOleh}</span>
          </div>
        </div>
        <div style="text-align:right;">
          <div class="kas-nominal ${t.jenis}" style="font-size:1.05rem;">${nomStr}</div>
          <div style="margin-top:4px; display:flex; justify-content:flex-end; gap:4px;">
            ${hasBukti ? `
              <button class="btn btn-outline" style="padding:2px 8px; font-size:0.7rem;" 
                onclick="App.showBuktiModal('${t.collectionId}', '${t.id}', '${t.bukti}')">
                🖼️ Bukti
              </button>
            ` : ''}
            ${canManageKas ? `
              <button class="btn btn-outline" style="padding:2px 8px; font-size:0.68rem;" onclick="App.openKoreksiKasModal('${t.id}')">
                🔄 Koreksi
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  },
  renderKasTotalBanner(filtered) {
    const banner = document.getElementById("kas-total-banner");
    if (!banner) return;
    let totalMasuk = 0, totalKeluar = 0;
    filtered.forEach(k => {
      if (k.jenis === "masuk") totalMasuk += Number(k.nominal || 0);
      else totalKeluar += Number(k.nominal || 0);
    });
    const selisih = totalMasuk - totalKeluar;
    banner.style.display = "block";
    banner.innerHTML = `
      <div style="background:linear-gradient(135deg, var(--warna-utama), var(--warna-aksen)); color:#fff; border-radius:14px; padding:14px 16px; box-shadow:0 6px 18px rgba(31,164,99,0.35);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:0.75rem; opacity:0.9; text-transform:uppercase; letter-spacing:1px;">Total Bulan Ini</div>
            <div style="font-size:1.25rem; font-weight:800; margin-top:2px;">Rp ${selisih.toLocaleString("id-ID")}</div>
          </div>
          <div style="display:flex; gap:12px; text-align:right;">
            <div>
              <div style="font-size:0.7rem; opacity:0.8;">Pemasukan</div>
              <div style="font-size:0.85rem; font-weight:700; color:#34d399;">+Rp ${totalMasuk.toLocaleString("id-ID")}</div>
            </div>
            <div>
              <div style="font-size:0.7rem; opacity:0.8;">Pengeluaran</div>
              <div style="font-size:0.85rem; font-weight:700; color:#fca5a5;">-Rp ${totalKeluar.toLocaleString("id-ID")}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  },
  renderKasList() {
    const filterJenis = document.getElementById("filter-kas-jenis")?.value || "all";
    const searchVal = (document.getElementById("filter-kas-search")?.value || "").toLowerCase();
    const listEl = document.getElementById("full-kas-list");
    if (!listEl) return;

    let filtered = this.allKas || [];

    if (filterJenis !== "all") {
      filtered = filtered.filter(k => k.jenis === filterJenis);
    }
    if (searchVal) {
      filtered = filtered.filter(k => 
        (k.kategori || "").toLowerCase().includes(searchVal)
      );
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `<div class="empty-state">Tidak ada transaksi yang cocok.</div>`;
      const banner = document.getElementById("kas-total-banner");
      if (banner) banner.style.display = "none";
      return;
    }

    listEl.innerHTML = filtered.map(t => this.renderKasCardHtml(t)).join("");
    this.renderKasTotalBanner(filtered);
  },

  showBuktiModal(collectionId, recordId, filename) {
    const modal = document.getElementById("bukti-modal");
    const img = document.getElementById("bukti-modal-img");
    if (!modal || !img) return;

    img.src = `${this.apiBase}/files/${collectionId}/${recordId}/${filename}`;
    modal.classList.add("show");
  },

  closeBuktiModal() {
    const modal = document.getElementById("bukti-modal");
    if (modal) modal.classList.remove("show");
  },

  exportKasCSV() {
    if (!this.allKas || this.allKas.length === 0) {
      alert("Belum ada data kas untuk diekspor!");
      return;
    }

    const headers = ["Tanggal", "Jenis", "Nominal", "Kategori", "Keterangan", "Pencatat", "Mengoreksi"];
    const rows = this.allKas.map(k => [
      k.tanggal ? k.tanggal.split(" ")[0] : "",
      k.jenis,
      k.nominal,
      k.kategori,
      `"${(k.keterangan || '').replace(/"/g, '""')}"`,
      `"${k.expand?.dicatat_oleh?.nama || ''}"`,
      k.mengoreksi || ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `kas_komunitas_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  cetakLaporanKas() {
    const period = this.currentPeriod;
    const periodKas = (this.allKas || []).filter(k => (k.tanggal || "").startsWith(period));
    let totalMasuk = 0;
    let totalKeluar = 0;
    periodKas.forEach(k => {
      if (k.jenis === "masuk") totalMasuk += Number(k.nominal || 0);
      else totalKeluar += Number(k.nominal || 0);
    });

    const printWin = window.open("", "_blank");
    if (!printWin) { alert("Popup diblokir browser!"); return; }

    const rows = periodKas.map(k => `
      <tr>
        <td style="padding:6px; border:1px solid #ddd;">${(k.tanggal || "").split(" ")[0]}</td>
        <td style="padding:6px; border:1px solid #ddd;">${k.jenis.toUpperCase()}</td>
        <td style="padding:6px; border:1px solid #ddd; text-align:right;">Rp ${Number(k.nominal).toLocaleString('id-ID')}</td>
        <td style="padding:6px; border:1px solid #ddd;">${this.escapeHtml(k.kategori)}</td>
        <td style="padding:6px; border:1px solid #ddd;">${this.escapeHtml(k.keterangan)}</td>
      </tr>
    `).join("");

    printWin.document.write(`
      <html>
        <head><title>Laporan Kas - ${period}</title></head>
        <body style="font-family:sans-serif; padding:20px;">
          <h2>Laporan Kas Basecamp - Periode ${period}</h2>
          <p><strong>Total Pemasukan:</strong> Rp ${totalMasuk.toLocaleString('id-ID')}<br>
          <strong>Total Pengeluaran:</strong> Rp ${totalKeluar.toLocaleString('id-ID')}<br>
          <strong>Selisih Bulan Ini:</strong> Rp ${(totalMasuk - totalKeluar).toLocaleString('id-ID')}</p>
          <table style="width:100%; border-collapse:collapse; font-size:12px;">
            <thead><tr style="background:#eee;"><th>Tanggal</th><th>Jenis</th><th>Nominal</th><th>Kategori</th><th>Keterangan</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWin.document.close();
    printWin.print();
  }
};
