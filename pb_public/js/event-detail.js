// js/event-detail.js - Halaman detail event (tabs tersendiri, bukan modal overlay yang nyangkut)
// Dipakai tombol LPJ & Panitia agar jelas arahnya.
window.AppModules = window.AppModules || {};

window.AppModules.EventDetail = {
  _currentEventId: null,
  _detailTab: "ringkasan",

  // Entry point utama: kartu event diklik
  async bukaDetailEvent(eventId, tab) {
    return this._renderDetailEvent(eventId, tab || "ringkasan");
  },

  backToEvents() {
    this._currentEventId = null;
    this.loadEvents();
  },

  setDetailTab(eventId, tab) {
    this._detailTab = tab;
    return this._renderDetailEvent(eventId, tab);
  },

  _ev(eventId) {
    return (this._allEvents || []).find(x => x.id === eventId) || null;
  },

  async _renderDetailEvent(eventId, tab) {
    const listEl = document.getElementById("events-list");
    if (!listEl) return;
    this._currentEventId = eventId;
    this._detailTab = tab || this._detailTab || "ringkasan";
    const ev = this._ev(eventId);
    listEl.innerHTML = `<div class="empty-state">⏳ Memuat detail event...</div>`;
    let evData = ev;
    if (!evData) {
      try {
        const r = await fetch(`${this.apiBase}/collections/event/records/${eventId}`, { headers: this.getAuthHeaders() });
        if (r.ok) evData = await r.json();
      } catch (_) {}
    }
    const judul = evData ? evData.judul : "Event";
    const status = evData ? evData.status : "-";
    const tabAktif = this._detailTab;
    const tabs = ["ringkasan", "panitia", "dana", "transaksi", "peserta", "laporan"];
    const labels = { ringkasan: "📋 Ringkasan", panitia: "👥 Panitia", dana: "🗺️ Dana & RAB", transaksi: "💰 Transaksi", peserta: "🧍 Peserta", laporan: "📑 Laporan" };
    listEl.innerHTML = `
      <button onclick="App.backToEvents()" style="background:none;border:none;color:var(--warna-utama);font-size:0.9rem;cursor:pointer;padding:0;margin-bottom:12px;">← Kembali ke daftar event</button>
      <div class="kas-card" style="flex-direction:column;align-items:stretch;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="font-weight:800;font-size:1.05rem;">${this.escapeHtml(judul)}</div>
          <span class="role-pill">${this.escapeHtml(status).toUpperCase()}</span>
        </div>
        <div style="font-size:0.75rem;color:var(--text-sub);margin-top:4px;">${this.escapeHtml(evData?.jenis||'')} · ${this.escapeHtml(evData?.lokasi||'Basecamp')} · ${(evData?.tanggal_mulai||'').split(' ')[0]}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">
          ${tabs.map(t => `<button class="btn ${t===tabAktif?'btn-primary':'btn-outline'}" style="padding:4px 8px;font-size:0.75rem;" onclick="App.setDetailTab('${eventId}','${t}')">${labels[t]}</button>`).join("")}
          ${(this.user?.role==='admin'||this.user?.role==='pengurus') ? `<button class="btn btn-primary" style="padding:4px 8px;font-size:0.75rem;background:#8b5cf6;" onclick="App.bukaSusunLPJ('${eventId}')">📑 Susun LPJ</button>` : ''}
        </div>
      </div>
      <div id="event-detail-body"><div class="empty-state">⏳ Memuat ${tabAktif}...</div></div>`;
    // dispatch ke loader sesuai tab
    const loaders = { ringkasan: this._loadRingkasan, panitia: this._loadPanitiaTab, dana: this._loadDanaTab, transaksi: this._loadTransaksiTab, peserta: this._loadPesertaTab, laporan: this._loadLaporanTab };
    try { await loaders[tabAktif].call(this, eventId, evData); } catch (e) { document.getElementById("event-detail-body").innerHTML = `<div class="empty-state">Gagal memuat: ${this.escapeHtml(e.message||'error')}</div>`; }
  },

  async _loadRingkasan(eventId, ev) {
    const el = document.getElementById("event-detail-body");
    const [tx, lapor] = await Promise.all([
      fetch(`${this.apiBase}/collections/event_transaksi/records?filter=(event='${eventId}')`, { headers: this.getAuthHeaders() }).then(r => r.ok ? r.json() : { items: [] }),
      fetch(`${this.apiBase}/collections/event_laporan/records?filter=(event='${eventId}')`, { headers: this.getAuthHeaders() }).then(r => r.ok ? r.json() : { items: [] })
    ]);
    const txs = tx.items || [];
    let masuk = 0, keluar = 0;
    txs.forEach(t => { if (t.jenis === "masuk") masuk += Number(t.nominal||0); else keluar += Number(t.nominal||0); });
    el.innerHTML = `
      <div class="kas-card" style="flex-direction:column;align-items:stretch;">
        <div style="font-size:0.8rem;line-height:1.5;">${this.escapeHtml(ev?.deskripsi || ev?.tujuan || "Belum ada deskripsi.")}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;">
          <div><div style="font-size:0.7rem;color:var(--text-sub);">Total Masuk</div><div style="font-weight:800;color:var(--warna-utama);">Rp ${masuk.toLocaleString('id-ID')}</div></div>
          <div><div style="font-size:0.7rem;color:var(--text-sub);">Total Keluar</div><div style="font-weight:800;color:var(--warna-merah);">Rp ${keluar.toLocaleString('id-ID')}</div></div>
        </div>
        <div style="margin-top:8px;font-weight:700;">Saldo: Rp ${(masuk-keluar).toLocaleString('id-ID')} · Laporan: ${(lapor.items||[]).length} berkas</div>
        <div style="display:flex;gap:6px;margin-top:10px;">
          <button class="btn btn-outline" style="padding:4px 8px;font-size:0.75rem;" onclick="App.setDetailTab('${eventId}','dana')">🗺️ Peta Dana</button>
          <button class="btn btn-outline" style="padding:4px 8px;font-size:0.75rem;" onclick="App.setDetailTab('${eventId}','panitia')">👥 Panitia</button>
        </div>
      </div>`;
  },

  async _loadPanitiaTab(eventId) {
    const el = document.getElementById("event-detail-body");
    const res = await fetch(`${this.apiBase}/collections/event_panitia/records?filter=(event='${eventId}')&expand=anggota`, { headers: this.getAuthHeaders() });
    const items = res.ok ? ((await res.json()).items || []) : [];
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div style="font-weight:700;">Panitia (${items.length})</div>
        <button class="btn btn-primary" style="padding:4px 8px;font-size:0.75rem;" onclick="App.bukaSusunPanitia('${eventId}')">+ Tunjuk Panitia</button>
      </div>
      ${items.length ? items.map(p => `<div class="kas-card" style="margin-bottom:8px;"><div><span style="font-weight:700;color:var(--warna-utama);text-transform:capitalize;">${this.escapeHtml(p.seksi)}:</span> ${this.escapeHtml(p.expand?.anggota?.nama || p.expand?.anggota?.username || 'Anggota')}</div><div style="font-size:0.72rem;color:var(--text-sub);">${this.escapeHtml(p.tugas||'')}</div></div>`).join("") : `<div class="empty-state">Belum ada panitia. Ketua menyusun panitia.</div>`}`;
  },

  async _loadDanaTab(eventId) {
    const el = document.getElementById("event-detail-body");
    const [ra, rd, rtx] = await Promise.all([
      fetch(`${this.apiBase}/collections/event_anggaran/records?filter=(event='${eventId}')`, { headers: this.getAuthHeaders() }).then(r => r.ok ? r.json() : { items: [] }),
      fetch(`${this.apiBase}/collections/event_dana/records?filter=(event='${eventId}')`, { headers: this.getAuthHeaders() }).then(r => r.ok ? r.json() : { items: [] }),
      fetch(`${this.apiBase}/collections/event_transaksi/records?filter=(event='${eventId}')&sort=-tanggal`, { headers: this.getAuthHeaders() }).then(r => r.ok ? r.json() : { items: [] })
    ]);
    const anggaran = ra.items || [], dana = rd.items || [], txs = rtx.items || [];
    let rencana = 0; anggaran.forEach(a => rencana += Number(a.total_rencana || (Number(a.volume||0)*Number(a.harga_satuan||0)) || 0));
    let masuk = 0, keluar = 0; txs.forEach(t => { if (t.jenis==="masuk") masuk+=Number(t.nominal||0); else keluar+=Number(t.nominal||0); });
    el.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
        <div class="kas-card" style="margin:0;flex-direction:column;align-items:flex-start;"><span class="stat-label">Dana Diterima</span><div class="stat-val masuk">+Rp ${masuk.toLocaleString('id-ID')}</div></div>
        <div class="kas-card" style="margin:0;flex-direction:column;align-items:flex-start;"><span class="stat-label">Pengeluaran</span><div class="stat-val keluar">-Rp ${keluar.toLocaleString('id-ID')}</div></div>
      </div>
      <div class="kas-card" style="margin-bottom:12px;"><span style="font-size:0.75rem;color:var(--text-sub);">RAB: Rp ${rencana.toLocaleString('id-ID')} · Saldo: <strong>Rp ${(masuk-keluar).toLocaleString('id-ID')}</strong></span></div>
      <div style="font-weight:700;font-size:0.8rem;color:var(--text-sub);margin-bottom:6px;">Sumber Dana (${dana.length}) · Anggaran (${anggaran.length}) · Transaksi (${txs.length})</div>`;
  },

  async _loadTransaksiTab(eventId) {
    const el = document.getElementById("event-detail-body");
    const res = await fetch(`${this.apiBase}/collections/event_transaksi/records?filter=(event='${eventId}')&sort=-tanggal`, { headers: this.getAuthHeaders() });
    const items = res.ok ? ((await res.json()).items || []) : [];
    el.innerHTML = items.length ? items.map(t => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid rgba(255,255,255,0.06);font-size:0.78rem;"><div><div style="font-weight:600;">${t.jenis==='masuk'?'🪙':'🧾'} ${this.escapeHtml(t.keterangan)}</div><div style="font-size:0.7rem;color:var(--text-sub);">${(t.tanggal||'').split(' ')[0]} · verifikasi:${this.escapeHtml(t.verifikasi||'-')}</div></div><div style="font-weight:700;color:${t.jenis==='masuk'?'var(--warna-utama)':'var(--warna-merah)'};">${t.jenis==='masuk'?'+':'-'}Rp ${Number(t.nominal).toLocaleString('id-ID')}</div></div>`).join("") : `<div class="empty-state">Belum ada transaksi event.</div>`;
  },

  async _loadPesertaTab(eventId) {
    const el = document.getElementById("event-detail-body");
    const res = await fetch(`${this.apiBase}/collections/event_peserta/records?filter=(event='${eventId}')&expand=anggota`, { headers: this.getAuthHeaders() });
    const items = res.ok ? ((await res.json()).items || []) : [];
    el.innerHTML = items.length ? items.map(p => `<div style="padding:6px 0;border-top:1px solid rgba(255,255,255,0.06);font-size:0.8rem;">${this.escapeHtml(p.expand?.anggota?.nama || p.expand?.anggota?.username || 'Anggota')} — <strong>${this.escapeHtml(p.status)}</strong></div>`).join("") : `<div class="empty-state">Belum ada peserta terdaftar.</div>`;
  },

  async _loadLaporanTab(eventId) {
    const el = document.getElementById("event-detail-body");
    const res = await fetch(`${this.apiBase}/collections/event_laporan/records?filter=(event='${eventId}')&sort=-created`, { headers: this.getAuthHeaders() });
    const items = res.ok ? ((await res.json()).items || []) : [];
    const isManager = this.user && (this.user.role === "admin" || this.user.role === "pengurus");
    el.innerHTML = `
      ${isManager ? `<button class="btn btn-primary" style="padding:4px 8px;font-size:0.75rem;margin-bottom:10px;" onclick="App.bukaSusunLPJ('${eventId}')">📑 Susun LPJ Baru</button>` : ''}
      ${items.length ? items.map(l => `<div class="kas-card" style="flex-direction:column;align-items:stretch;margin-bottom:8px;"><div style="font-weight:700;">📑 ${this.escapeHtml(l.jenis||'LPJ')} — ${this.escapeHtml(l.status||'')}</div><div style="font-size:0.78rem;white-space:pre-wrap;margin-top:4px;">${this.escapeHtml(l.isi||'')}</div></div>`).join("") : `<div class="empty-state">Belum ada laporan/LPJ.</div>`}`;
  }
};
