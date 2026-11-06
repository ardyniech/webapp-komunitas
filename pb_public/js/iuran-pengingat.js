// js/iuran-pengingat.js - Pengingat iuran tenggat otomatis (ATOMIK).
//
// Membaca konfigurasi 'iuran_jatuh_tempo_tgl' dan status lunas bulan berjalan.
// Jika hari ini melewati tanggal tenggat dan belum lunas → banner kuning di
// panel Iuran: "Belum lunas, tenggat tgl X". Jika lunas → hijau (ingatkan anak).
// SENGAJA mandiri: polling saat tab iuran dibuka (hook core-events switchTab).

window.AppModules = window.AppModules || {};

window.AppModules.IuranPengingat = {
  async cekPengingatIuran() {
    if (!window.App || !App.user) return;
    const panel = document.getElementById("panel-iuran");
    if (!panel) return;

    let tenggat = 10;
    try {
      const res = await fetch(
        `${App.apiBase}/collections/konfigurasi/records?filter=(kunci='iuran_jatuh_tempo_tgl')`,
        { headers: App.getAuthHeaders(), cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        const rec = (data.items || [])[0];
        if (rec) {
          let v = rec.nilai;
          try { v = JSON.parse(v); } catch (_) {}
          if (!isNaN(Number(v))) tenggat = Number(v);
        }
      }
    } catch (_) {}

    const sekarang = new Date();
    const periode = sekarang.getFullYear() + "-" + String(sekarang.getMonth() + 1).padStart(2, "0");
    const lewatTenggat = sekarang.getDate() > tenggat;
    const sudahLunas = (App.allIuran || []).some(
      (i) => i.anggota === App.user.id && i.periode === periode && i.status === "lunas"
    );

    let banner = document.getElementById("iuran-pengingat-banner");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "iuran-pengingat-banner";
      panel.insertBefore(banner, panel.firstChild);
    }

    if (sudahLunas) {
      banner.style.display = "";
      banner.style.cssText =
        "margin-bottom:12px;padding:10px 12px;border-radius:10px;font-size:0.82rem;" +
        "background:rgba(31,164,99,0.12);border:1px solid var(--warna-utama);";
      banner.innerHTML =
        `✅ <b>Iuran bulan ${periode} sudah lunas.</b> Terima kasih sudah isi bensin pangkalan, bro!`;
    } else if (lewatTenggat) {
      banner.style.display = "";
      banner.style.cssText =
        "margin-bottom:12px;padding:10px 12px;border-radius:10px;font-size:0.82rem;" +
        "background:rgba(255,176,32,0.15);border:1px solid var(--warna-aksen);";
      banner.innerHTML =
        `⏰ <b>Iuran bulan ${periode} belum lunas.</b> Lewat tenggat tgl ${tenggat}. ` +
        `Denda: ${App.komunitas && App.komunitas.iuran_denda ? App.komunitas.iuran_denda : "sesuai ketentuan pangkalan"}. ` +
        `<button class="btn btn-primary" style="width:auto;padding:4px 10px;font-size:0.75rem;margin-left:6px;" onclick="App.switchTab('kas')">Catat Kas Sekarang</button>`;
    } else {
      banner.style.display = "none";
    }
  },
};

(function () {
  // Hubungkan ke switchTab tanpa mengedit core-events
  const t = setInterval(function () {
    if (window.App && App.switchTab && !App.switchTab._pengingatHook) {
      const orig = App.switchTab.bind(App);
      App.switchTab = function (tab) {
        const r = orig(tab);
        if (tab === "iuran" && window.AppModules.IuranPengingat) {
          AppModules.IuranPengingat.cekPengingatIuran();
        }
        return r;
      };
      App.switchTab._pengingatHook = true;
      clearInterval(t);
    }
  }, 500);
})();
