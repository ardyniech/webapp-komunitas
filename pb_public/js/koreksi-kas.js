// js/koreksi-kas.js - Submodul Koreksi Transaksi Kas Komunitas
window.AppModules = window.AppModules || {};

window.AppModules.KoreksiKas = {
  openKoreksiKasModal(txId) {
    const tx = (this.allKas || []).find(x => x.id === txId);
    if (!tx) return;
    const modal = document.getElementById("modal-koreksi-kas");
    if (!modal) return;

    document.getElementById("koreksi-target-id").value = tx.id;
    const oppositeJenis = tx.jenis === "masuk" ? "keluar" : "masuk";
    document.getElementById("koreksi-jenis-kebalikan").value = oppositeJenis;
    document.getElementById("koreksi-nominal").value = tx.nominal;
    document.getElementById("koreksi-alasan").value = "";

    const infoEl = document.getElementById("koreksi-target-info");
    if (infoEl) {
      infoEl.innerHTML = `
        <div style="font-weight:700; color:var(--text-main); margin-bottom:4px;">${this.escapeHtml(tx.keterangan)}</div>
        <div style="font-size:0.75rem; color:var(--text-sub);">
          Jenis: <strong>${tx.jenis.toUpperCase()}</strong> | 
          Nominal: <strong>Rp ${Number(tx.nominal).toLocaleString('id-ID')}</strong> | 
          Kategori: ${tx.kategori}
        </div>
      `;
    }
    modal.classList.add("show");
  },

  closeKoreksiKasModal() {
    const modal = document.getElementById("modal-koreksi-kas");
    if (modal) modal.classList.remove("show");
  },

  async submitKoreksiKas() {
    const targetId = document.getElementById("koreksi-target-id")?.value;
    const jenisKebalikan = document.getElementById("koreksi-jenis-kebalikan")?.value;
    const nominal = Number(document.getElementById("koreksi-nominal")?.value) || 0;
    const alasan = document.getElementById("koreksi-alasan")?.value.trim();

    if (!alasan) {
      alert("Alasan koreksi transaksi wajib diisi!");
      return;
    }

    try {
      Hero.setExpression("berpikir", Teks.hero.loading);
      const res = await fetch(`${this.apiBase}/collections/kas/records`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          tanggal: new Date().toISOString().split("T")[0] + " 12:00:00.000Z",
          jenis: jenisKebalikan,
          nominal: nominal,
          kategori: "lainnya",
          keterangan: `[KOREKSI] ${alasan}`,
          dicatat_oleh: this.user.id,
          mengoreksi: targetId
        })
      });

      if (!res.ok) throw new Error("Gagal menyimpan koreksi");
      this.closeKoreksiKasModal();
      Hero.setExpression("senang", "Transaksi koreksi berhasil dicatat!");
      await this.refreshData();
    } catch (e) {
      alert("Gagal memproses koreksi: " + e.message);
    }
  }
};
