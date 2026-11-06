// js/pelengkap-kehadiran.js - Absensi & Notulen Agenda (atomik, <200 baris).
// Perluasan AppModules.Pelengkap untuk fitur absensi hadir/izin/tidak_hadir
// pada setiap agenda, menggunakan koleksi `kehadiran` yang sudah ada.

window.AppModules = window.AppModules || {};
window.AppModules.Pelengkap = window.AppModules.Pelengkap || {};

Object.assign(window.AppModules.Pelengkap, {
  // Cache data kehadiran per agendaId
  _kehadiranCache: {},

  // ── Muat semua data kehadiran (sekali per render agenda) ──────────────
  async loadKehadiranSemua() {
    try {
      const res = await fetch(`${this.apiBase}/collections/kehadiran/records?perPage=200`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) return {};
      const items = (await res.json()).items || [];
      const byAgenda = {};
      for (const it of items) {
        if (!byAgenda[it.agenda]) byAgenda[it.agenda] = [];
        byAgenda[it.agenda].push(it);
      }
      this._kehadiranCache = byAgenda;
      return byAgenda;
    } catch (e) {
      this._kehadiranCache = {};
      return {};
    }
  },

  // ── Hitung ringkasan kehadiran per agenda ─────────────────────────────
  hitungRekapKehadiran(agendaId) {
    const list = this._kehadiranCache[agendaId] || [];
    const hadir = list.filter(i => i.status === "hadir").length;
    const izin = list.filter(i => i.status === "izin").length;
    const tidakHadir = list.filter(i => i.status === "tidak_hadir").length;
    return { hadir, izin, tidakHadir, total: list.length };
  },

  // ── Status kehadiran anggota sendiri pada agenda ──────────────────────
  statusKehadiranSaya(agendaId) {
    const list = this._kehadiranCache[agendaId] || [];
    const me = list.find(i => i.anggota === this.user.id);
    return me ? me.status : null;
  },

  // ── Tandai kehadiran satu anggota (create atau update) ────────────────
  async tandaiKehadiran(agendaId, anggotaId, status) {
    const existing = (this._kehadiranCache[agendaId] || []).find(i => i.anggota === anggotaId);
    if (existing) {
      const res = await fetch(`${this.apiBase}/collections/kehadiran/records/${existing.id}`, {
        method: "PATCH",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error("Gagal update kehadiran");
    } else {
      const res = await fetch(`${this.apiBase}/collections/kehadiran/records`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ agenda: agendaId, anggota: anggotaId, status })
      });
      if (!res.ok) throw new Error("Gagal buat kehadiran");
    }
    await this.loadKehadiranSemua(); // refresh cache
  },

  // ── Render modal penandaan kehadiran (admin/pengurus) ─────────────────
  bukaModalKehadiran(agendaId) {
    const anggotaList = this.sumberAnggota() || [];
    const rekap = this.hitungRekapKehadiran(agendaId);
    let rows = "";
    for (const u of anggotaList) {
      const existing = (this._kehadiranCache[agendaId] || []).find(i => i.anggota === u.id);
      const statusSaatIni = existing ? existing.status : "";
      rows += `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 8px; border-bottom:1px solid var(--border-color); font-size:0.85rem;">
          <div>
            <div style="font-weight:600;">${this.escapeHtml(u.nama || u.username)}</div>
            <div style="font-size:0.72rem; color:var(--text-sub);">${u.role || "anggota"}</div>
          </div>
          <div style="display:flex; gap:4px;">
            <label style="display:flex; align-items:center; gap:4px; cursor:pointer; margin:0;">
              <input type="radio" name="khs_${u.id}" value="hadir" ${statusSaatIni === "hadir" ? "checked" : ""} onchange="App.tandaiKehadiranSekarang('${agendaId}','${u.id}','hadir')"> Hadir
            </label>
            <label style="display:flex; align-items:center; gap:4px; cursor:pointer; margin:0;">
              <input type="radio" name="khs_${u.id}" value="izin" ${statusSaatIni === "izin" ? "checked" : ""} onchange="App.tandaiKehadiranSekarang('${agendaId}','${u.id}','izin')"> Izin
            </label>
            <label style="display:flex; align-items:center; gap:4px; cursor:pointer; margin:0;">
              <input type="radio" name="khs_${u.id}" value="tidak_hadir" ${statusSaatIni === "tidak_hadir" ? "checked" : ""} onchange="App.tandaiKehadiranSekarang('${agendaId}','${u.id}','tidak_hadir')"> Tidak Hadir
            </label>
          </div>
        </div>
      `;
    }

    const el = document.getElementById("kehadiran-modal");
    if (!el) {
      const modal = document.createElement("div");
      modal.id = "kehadiran-modal";
      modal.className = "modal-overlay";
      modal.innerHTML = `
        <div class="modal-content" style="max-width:520px; padding:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h3 style="margin:0; font-size:1.1rem;">Tandai Kehadiran</h3>
            <button onclick="App.tutupModalKehadiran()" style="background:none; border:none; font-size:1.2rem; cursor:pointer;">&times;</button>
          </div>
          <div id="kehadiran-modal-stat" style="margin-bottom:10px; font-size:0.8rem; color:var(--text-sub);"></div>
          <div id="kehadiran-modal-list" style="max-height:40vh; overflow-y:auto; border:1px solid var(--border-color); border-radius:8px; background:var(--bg-card);">${rows}</div>
          <div style="margin-top:10px; text-align:right;">
            <button class="btn btn-outline" onclick="App.tutupModalKehadiran()">Selesai</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    } else {
      el.querySelector("#kehadiran-modal-stat").innerHTML = `Hadir ${rekap.hadir} · Izin ${rekap.izin} · Tidak Hadir ${rekap.tidakHadir}`;
      el.querySelector("#kehadiran-modal-list").innerHTML = rows;
    }
    el.style.display = "flex";
  },

  tutupModalKehadiran() {
    const el = document.getElementById("kehadiran-modal");
    if (el) el.style.display = "none";
  },

  async tandaiKehadiranSekarang(agendaId, anggotaId, status) {
    await this.tandaiKehadiran(agendaId, anggotaId, status);
    this.bukaModalKehadiran(agendaId); // refresh tampilan modal
  },

  // ── Tampilkan badge rekap kehadiran pada kartu agenda ─────────────────
  badgeKehadiran(agendaId) {
    const r = this.hitungRekapKehadiran(agendaId);
    const saya = this.statusKehadiranSaya(agendaId);
    let teks = `H${r.hadir} I${r.izin} T${r.tidakHadir}`;
    if (saya) teks += ` (Anda: ${saya})`;
    return `<span class="role-pill role-anggota" style="font-size:0.7rem;">${teks}</span>`;
  }
});
