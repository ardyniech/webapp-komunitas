// js/modul-flag.js - Penegakan feature flag modul_aktif (dev tools, ATOMIK).
//
// Membaca konfigurasi 'modul_aktif' dari PocketBase (sudah ada) dan:
// - menyembunyikan tab/nav untuk modul yang dimatikan
// - memblokir switchTab ke modul yang dimatikan (dengan pesan jelas)
//
// SENGAJA mandiri: tidak mengedit auth.js / core-events.js / app.js.
// Bekerja dengan polling ringan sampai App dan sesi login siapkan.
// CATATAN: penegakan ini di level UI. Penegakan di level API
// (collection rules per modul) adalah pekerjaan lanjut terpisah.

window.AppModules = window.AppModules || {};

// dst tab -> nama modul di modul_aktif
const MODUL_MAP = {
  kas: "kas",
  iuran: "iuran",
  struktur: "struktur",
  profil: "profil",
  aturan: "aturan",
  pendaftaran: "pendaftaran",
  forum: "forum",
  panduan: "panduan",
  kuesioner: "kuesioner",
  event: "event",
  progres: "progres",
};

window.AppModules.ModulFlag = {
  modulAktif: null,
  _wrapped: false,
  _tried: false,

  async muatModulFlag() {
    if (this._tried) return;
    const token = localStorage.getItem("pb_token");
    if (!token) return; // belum login, coba lagi nanti
    this._tried = true;
    try {
      const apiBase = window.App && App.apiBase ? App.apiBase : "/api";
      const res = await fetch(
        `${apiBase}/collections/konfigurasi/records?filter=(kunci='modul_aktif')`,
        { headers: { Authorization: token } }
      );
      if (!res.ok) return;
      const data = await res.json();
      const rec = (data.items || [])[0];
      if (!rec) return;
      let aktif;
      try {
        aktif = JSON.parse(rec.nilai);
      } catch (_) {
        aktif = rec.nilai || [];
      }
      if (Array.isArray(aktif)) this.terapkanModulFlag(aktif);
    } catch (_) {}
  },

  terapkanModulFlag(aktif) {
    this.modulAktif = aktif;
    const disabled = Object.keys(MODUL_MAP).filter((tab) => !aktif.includes(MODUL_MAP[tab]));

    // sembunyikan nav bawah & item dropdown untuk modul yang dimatikan
    document.querySelectorAll(".nav-item").forEach((btn) => {
      const tab = btn.getAttribute("data-tab");
      if (tab && disabled.includes(tab)) btn.style.display = "none";
    });
    document.querySelectorAll(".dropdown-item").forEach((btn) => {
      const onclick = btn.getAttribute("onclick") || "";
      const m = onclick.match(/switchTab\('([^']+)'\)/);
      if (m && disabled.includes(m[1])) btn.style.display = "none";
    });

    // bungkus switchTab: tolak tab yang dimatikan
    this.bungkusSwitchTab(disabled);
  },

  bungkusSwitchTab(disabled) {
    if (this._wrapped || !window.App || !App.switchTab) return;
    this._wrapped = true;
    const orig = App.switchTab.bind(App);
    App.switchTab = function (tab) {
      if (disabled.includes(tab)) {
        alert(`Modul "${tab}" sedang dinonaktifkan oleh admin basecamp.`);
        return;
      }
      return orig(tab);
    };
  },
};

// Auto-init mandiri: polling ringan sampai App + sesi login siap
(function () {
  let attempts = 0;
  const timer = setInterval(function () {
    attempts++;
    if (window.AppModules && window.AppModules.ModulFlag) {
      window.AppModules.ModulFlag.muatModulFlag();
    }
    if (attempts > 60) clearInterval(timer); // ~2 menit, cukup
  }, 2000);
})();
