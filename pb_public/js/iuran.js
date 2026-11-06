// js/iuran.js - Modul Setoran Iuran Pangkalan Ojol
window.AppModules = window.AppModules || {};

window.AppModules.Iuran = {
  renderIuran() {
    const period = this.currentPeriod;
    const periodInput = document.getElementById("iuran-period-select");
    if (periodInput) periodInput.value = period;

    const listEl = document.getElementById("iuran-member-checklist") || document.getElementById("iuran-list");
    if (listEl) listEl.innerHTML = ""; // di-render di bawah sesuai data
    const canManage = this.user && (this.user.role === "admin" || this.user.role === "bendahara");

    const totalAnggota = (this.sumberAnggota() || []).filter(u => u.status === "aktif" && u.role !== "admin").length;
    const lunasList = (this.allIuran || []).filter(i => i.periode === period && i.status === "lunas");
    const lunasCount = lunasList.length;
    const pct = totalAnggota > 0 ? Math.round((lunasCount / totalAnggota) * 100) : 0;

    this.renderIuranRekap(period, totalAnggota, lunasCount);

    // Sinkron bensin bar di markas juga
    const bensinFill = document.getElementById("bensin-fill-bar");
    const bensinTxt = document.getElementById("bensin-status-text");
    if (bensinFill) bensinFill.style.width = `${pct}%`;
    if (bensinTxt) bensinTxt.innerText = `${pct}%`;

    if (!listEl) return;
    const nonAdminUsers = this.sumberAnggota().filter(u => u.status === "aktif" && u.role !== "admin");

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
    const targetUser = this.sumberAnggota().find(u => u.id === userId);
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
  },

  // ── Rekap belum lunas (bantuan bendahara) ──────────────────────────────
  renderIuranRekap(period, totalAnggota, lunasCount) {
    const wrap = document.getElementById("iuran-rekap-wrap");
    if (!wrap) return;
    const belum = Math.max(totalAnggota - lunasCount, 0);
    const anggotaMap = {};
    (this.sumberAnggota() || []).forEach(u => { anggotaMap[u.id] = u; });
    const belumList = (this.allIuran || []).filter(i => i.periode === period && i.status !== "lunas");
    const belumNominal = belumList.reduce((s, i) => s + Number(i.nominal || 0), 0);

    let html = `
      <div class="stat-tile" style="flex:1; min-width:120px; border:1px solid var(--border-color); border-radius:10px; padding:8px; background:var(--bg-card);">
        <div class="stat-nilai" style="font-size:1.25rem; font-weight:700;">${belum}</div>
        <div class="stat-label" style="font-size:0.7rem;">Belum Lunas</div>
      </div>
      <div class="stat-tile" style="flex:1; min-width:140px; border:1px solid var(--border-color); border-radius:10px; padding:8px; background:var(--bg-card);">
        <div class="stat-nilai" style="font-size:1.25rem; font-weight:700;">Rp ${belumNominal.toLocaleString("id-ID")}</div>
        <div class="stat-label" style="font-size:0.7rem;">Nominal Belum Dibayar</div>
      </div>
      <div class="stat-tile" style="flex:1; min-width:120px; border:1px solid var(--border-color); border-radius:10px; padding:8px; background:var(--bg-card);">
        <div class="stat-nilai" style="font-size:1.25rem; font-weight:700;">${lunasCount}/${totalAnggota}</div>
        <div class="stat-label" style="font-size:0.7rem;">Lunas / Total</div>
      </div>
    `;

    if (belumList.length > 0) {
      html += `<div style="margin-top:8px; font-size:0.78rem; color:var(--text-sub);"><strong>Belum lunas:</strong> ${belumList.map(i => {
        const u = anggotaMap[i.anggota] || {};
        return `${this.escapeHtml(u.nama || u.username)} (Rp ${Number(i.nominal||0).toLocaleString("id-ID")})`;
      }).join(" · ")}</div>`;
    }

    wrap.innerHTML = html;
  },

  // ── Ekspor CSV iuran periode aktif ────────────────────────────────────
  async exportIuranCSV() {
    const period = this.currentPeriod;
    const anggotaMap = {};
    (this.sumberAnggota() || []).forEach(u => { anggotaMap[u.id] = u; });

    const list = (this.allIuran || [])
      .filter(i => i.periode === period)
      .map(i => {
        const u = anggotaMap[i.anggota] || {};
        return {
          nama: u.nama || u.username || "-",
          nominal: i.nominal || 0,
          status: i.status,
          tanggal: (i.tanggal || "").split(" ")[0],
          keterangan: (i.keterangan || "")
        };
      });

    if (list.length === 0) {
      alert("Belum ada data iuran untuk diekspor periode ini!");
      return;
    }

    const esc = s => `"${String(s || "").replace(/"/g, '""')}"`;
    const rows = list.map(r => [esc(r.nama), esc(r.nominal), esc(r.status), esc(r.tanggal), esc(r.keterangan)].join(","));
    const csv = ["Nama,Nominal,Status,Tanggal,Keterangan", ...rows].join("\n");
    const link = document.createElement("a");
    link.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    link.download = `iuran_komunitas_${period.replace("-", "_")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    Hero.setExpression("senang", "CSV iuran berhasil diunduh!");
  }
};
