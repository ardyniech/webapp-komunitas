// js/event-lpj.js - Submodul LPJ Event & Banner Panitia
window.AppModules = window.AppModules || {};

window.AppModules.EventLPJ = {
  async bukaSusunLPJ(eventId) {
    const modal = document.getElementById("modal-susun-lpj");
    if (!modal) return;
    document.getElementById("lpj-event-id").value = eventId;
    const infoEl = document.getElementById("lpj-keuangan-otomatis");
    if (infoEl) infoEl.innerHTML = `<div class="empty-state">⏳ Menghitung ringkasan keuangan event...</div>`;
    modal.classList.add("show");

    try {
      const resTx = await fetch(`${this.apiBase}/collections/event_transaksi/records?filter=(event='${eventId}')`, {
        headers: this.getAuthHeaders()
      });
      if (resTx.ok) {
        const txs = (await resTx.json()).items || [];
        let totalMasuk = 0;
        let totalKeluar = 0;
        txs.forEach(t => {
          if (t.jenis === "masuk") totalMasuk += Number(t.nominal || 0);
          else totalKeluar += Number(t.nominal || 0);
        });
        const sisa = totalMasuk - totalKeluar;
        if (infoEl) {
          infoEl.innerHTML = `
            <div style="font-weight:700; margin-bottom:4px;">📊 Ringkasan Otomatis Buku Transaksi Event:</div>
            <div>Pemasukan Diterima: <strong>Rp ${totalMasuk.toLocaleString('id-ID')}</strong></div>
            <div>Realisasi Pengeluaran: <strong>Rp ${totalKeluar.toLocaleString('id-ID')}</strong></div>
            <div style="margin-top:4px; font-weight:700; color:${sisa >= 0 ? 'var(--warna-utama)' : 'var(--warna-merah)'};">
              Sisa Saldo Kas Event: Rp ${sisa.toLocaleString('id-ID')}
            </div>
            <div style="font-size:0.72rem; color:var(--text-sub); margin-top:4px;">
              *Sesuai aturan Plan §6.8 D, sisa dana wajib dikembalikan ke Kas Komunitas sebagai pemasukan 'sisa_dana_event' saat event ditutup.
            </div>
          `;
        }
      }
    } catch (e) {
      console.warn("Could not load lpj summary", e);
    }
  },

  closeSusunLPJModal() {
    const modal = document.getElementById("modal-susun-lpj");
    if (modal) modal.classList.remove("show");
  },

  async submitLPJEvent() {
    const eventId = document.getElementById("lpj-event-id")?.value;
    const jenis = document.getElementById("lpj-jenis")?.value || "lpj_keuangan";
    const isi = document.getElementById("lpj-isi")?.value.trim();

    if (!eventId || !isi) {
      alert("Isi laporan pertanggungjawaban (LPJ) wajib diisi!");
      return;
    }

    try {
      Hero.setExpression("berpikir", Teks.hero.loading);
      const res = await fetch(`${this.apiBase}/collections/event_laporan/records`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          event: eventId,
          jenis: jenis,
          isi: isi,
          status: "diajukan",
          ditulis_oleh: this.user.id
        })
      });

      if (!res.ok) throw new Error("Gagal mengajukan LPJ");
      await fetch(`${this.apiBase}/collections/event/records/${eventId}`, {
        method: "PATCH",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ status: "lpj_diajukan" })
      });

      Hero.setExpression("senang", "Laporan pertanggungjawaban (LPJ) berhasil diajukan!");
      alert("LPJ berhasil diajukan ke pengurus basecamp!");
      this.closeSusunLPJModal();
      this.loadEvents();
    } catch (e) {
      alert("Gagal submit LPJ: " + e.message);
    }
  },

  async loadDashPanitiaBanner() {
    const banner = document.getElementById("dash-panitia-banner");
    if (!banner || !this.user) return;
    try {
      const res = await fetch(`${this.apiBase}/collections/event_panitia/records?filter=(anggota='${this.user.id}'%26%26aktif=true)&expand=event`, {
        headers: this.getAuthHeaders()
      });
      if (res.ok) {
        const items = (await res.json()).items || [];
        if (items.length > 0) {
          const p = items[0];
          banner.innerHTML = `
            <div style="font-weight:700; color:#92400e; font-size:0.85rem;">
              📢 Kamu ditunjuk di event <strong>${this.escapeHtml(p.expand?.event?.judul || 'Komunitas')}</strong>!
            </div>
            <div style="font-size:0.75rem; color:#b45309; margin-top:2px;">
              Posisi: <strong style="text-transform:capitalize;">${this.escapeHtml(p.seksi)}</strong> — Tugas: ${this.escapeHtml(p.tugas || '-')}
            </div>
            <div style="margin-top:6px;">
              <button class="btn btn-outline" style="padding:2px 8px; font-size:0.7rem; background:#fff;" onclick="App.switchTab('event')">
                Lihat Kegiatan Event
              </button>
            </div>
          `;
          banner.style.display = "block";
        } else {
          banner.style.display = "none";
        }
      }
    } catch (e) {
      banner.style.display = "none";
    }
  }
};
