// js/event-peta-dana.js - Submodul Peta Dana & Susun Panitia Event
window.AppModules = window.AppModules || {};

window.AppModules.EventPetaDana = {
  _allEvents: [],
  _selectedEventId: null,

  async bukaPetaDanaEvent(eventId) {
    const modal = document.getElementById("modal-peta-dana");
    if (!modal) return;
    this._selectedEventId = eventId;
    const ev = (this._allEvents || []).find(x => x.id === eventId);

    const titleEl = document.getElementById("peta-dana-event-title");
    if (titleEl && ev) titleEl.innerText = `PETA DANA: ${ev.judul}`;

    const contentEl = document.getElementById("peta-dana-content");
    if (contentEl) contentEl.innerHTML = `<div class="empty-state">⏳ Menghitung aliran dana event...</div>`;
    modal.classList.add("show");

    try {
      const [resAnggaran, resDana, resTx] = await Promise.all([
        fetch(`${this.apiBase}/collections/event_anggaran/records?filter=(event='${eventId}')`, { headers: this.getAuthHeaders() }),
        fetch(`${this.apiBase}/collections/event_dana/records?filter=(event='${eventId}')`, { headers: this.getAuthHeaders() }),
        fetch(`${this.apiBase}/collections/event_transaksi/records?filter=(event='${eventId}')&sort=-tanggal`, { headers: this.getAuthHeaders() })
      ]);

      const anggaran = (await resAnggaran.json()).items || [];
      const dana = (await resDana.json()).items || [];
      const txs = (await resTx.json()).items || [];

      let totalRencanaAnggaran = 0;
      anggaran.forEach(a => totalRencanaAnggaran += Number(a.total_rencana || (a.volume * a.harga_satuan) || 0));

      let totalDanaDiterima = 0;
      let totalKeluar = 0;
      txs.forEach(t => {
        if (t.jenis === "masuk") totalDanaDiterima += Number(t.nominal || 0);
        else totalKeluar += Number(t.nominal || 0);
      });
      const sisaSaldo = totalDanaDiterima - totalKeluar;

      if (contentEl) {
        contentEl.innerHTML = `
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px;">
            <div class="kas-card" style="margin:0; flex-direction:column; align-items:flex-start;">
              <span class="stat-label">Total Dana Diterima</span>
              <div class="stat-val masuk" style="font-size:1.05rem;">+Rp ${totalDanaDiterima.toLocaleString('id-ID')}</div>
            </div>
            <div class="kas-card" style="margin:0; flex-direction:column; align-items:flex-start;">
              <span class="stat-label">Total Pengeluaran</span>
              <div class="stat-val keluar" style="font-size:1.05rem;">-Rp ${totalKeluar.toLocaleString('id-ID')}</div>
            </div>
          </div>
          <div class="kas-card" style="margin-bottom:12px; background:rgba(0,0,0,0.2);">
            <div>
              <div style="font-size:0.75rem; color:var(--text-sub);">Sisa Saldo Kas Event:</div>
              <div style="font-size:1.1rem; font-weight:800; color:${sisaSaldo >= 0 ? 'var(--warna-utama)' : 'var(--warna-merah)'};">
                Rp ${sisaSaldo.toLocaleString('id-ID')}
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:0.7rem; color:var(--text-sub);">Rencana Anggaran (RAB):</div>
              <div style="font-size:0.85rem; font-weight:700;">Rp ${totalRencanaAnggaran.toLocaleString('id-ID')}</div>
            </div>
          </div>
          <div style="font-size:0.8rem; font-weight:700; color:var(--text-sub); margin-bottom:6px;">RIWAYAT TRANSAKSI EVENT:</div>
          <div style="max-height:200px; overflow-y:auto;">
            ${txs.length === 0 ? `<div class="empty-state">Belum ada transaksi di event ini.</div>` : txs.map(t => `
              <div style="display:flex; justify-content:space-between; padding:6px 0; border-top:1px solid rgba(255,255,255,0.06); font-size:0.78rem;">
                <div>
                  <div style="font-weight:600;">${t.jenis === 'masuk' ? '🪙' : '🧾'} ${this.escapeHtml(t.keterangan)}</div>
                  <div style="font-size:0.7rem; color:var(--text-sub);">${(t.tanggal || '').split(' ')[0]}</div>
                </div>
                <div style="font-weight:700; color:${t.jenis === 'masuk' ? 'var(--warna-utama)' : 'var(--warna-merah)'};">
                  ${t.jenis === 'masuk' ? '+' : '-'}Rp ${Number(t.nominal).toLocaleString('id-ID')}
                </div>
              </div>
            `).join("")}
          </div>
        `;
      }
    } catch (err) {
      console.warn("Could not load peta dana", err);
      if (contentEl) contentEl.innerHTML = `<div class="empty-state">Gagal menghitung peta dana event.</div>`;
    }
  },

  closePetaDanaModal() {
    const modal = document.getElementById("modal-peta-dana");
    if (modal) modal.classList.remove("show");
  },

  async bukaSusunPanitia(eventId) {
    const modal = document.getElementById("modal-susun-panitia");
    if (!modal) return;
    this._selectedEventId = eventId;
    document.getElementById("panitia-event-id").value = eventId;

    const selectUser = document.getElementById("panitia-anggota-select");
    if (selectUser) {
      selectUser.innerHTML = (this.allUsers || []).map(u => `
        <option value="${u.id}">${this.escapeHtml(u.nama || u.username)} (${u.role})</option>
      `).join("");
    }

    this.loadPanitiaList(eventId);
    modal.classList.add("show");
  },

  closeSusunPanitiaModal() {
    const modal = document.getElementById("modal-susun-panitia");
    if (modal) modal.classList.remove("show");
  },

  async loadPanitiaList(eventId) {
    const listEl = document.getElementById("panitia-current-list");
    if (!listEl) return;
    listEl.innerHTML = `<div class="empty-state">⏳ Memuat panitia...</div>`;
    try {
      const res = await fetch(`${this.apiBase}/collections/event_panitia/records?filter=(event='${eventId}')&expand=anggota`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) throw new Error("Gagal");
      const items = (await res.json()).items || [];
      if (items.length === 0) {
        listEl.innerHTML = `<div class="empty-state">Belum ada susunan panitia.</div>`;
        return;
      }
      listEl.innerHTML = items.map(p => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-top:1px solid rgba(255,255,255,0.06); font-size:0.78rem;">
          <div>
            <span style="font-weight:700; color:var(--warna-utama); text-transform:capitalize;">${this.escapeHtml(p.seksi)}:</span>
            <span>${this.escapeHtml(p.expand?.anggota?.nama || p.expand?.anggota?.username || 'Anggota')}</span>
          </div>
          <span style="font-size:0.7rem; color:var(--text-sub);">${this.escapeHtml(p.tugas || '-')}</span>
        </div>
      `).join("");
    } catch (e) {
      listEl.innerHTML = `<div class="empty-state">Gagal memuat panitia.</div>`;
    }
  },

  async submitPanitiaEvent() {
    const eventId = document.getElementById("panitia-event-id")?.value;
    const anggotaId = document.getElementById("panitia-anggota-select")?.value;
    const seksi = document.getElementById("panitia-seksi-select")?.value;
    const tugas = document.getElementById("panitia-tugas")?.value.trim();

    if (!eventId || !anggotaId || !seksi) return;

    try {
      Hero.setExpression("berpikir", Teks.hero.loading);
      const res = await fetch(`${this.apiBase}/collections/event_panitia/records`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          event: eventId,
          anggota: anggotaId,
          seksi: seksi,
          tugas: tugas || `Seksi ${seksi}`,
          ditunjuk_oleh: this.user.id,
          aktif: true
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal menyimpan panitia");
      }
      Hero.setExpression("senang", "Panitia berhasil ditambahkan!");
      document.getElementById("panitia-tugas").value = "";
      this.loadPanitiaList(eventId);
    } catch (e) {
      alert("Gagal menambahkan panitia: " + e.message);
    }
  }
};
