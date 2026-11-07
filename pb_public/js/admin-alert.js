// js/admin-alert.js - Peringatan pendaftaran menunggu untuk admin/superadmin (ATOMIK).
//
// Polling tiap 15 detik: menghitung pendaftaran status 'menunggu' yang bisa
// dibaca admin (rule: pemegang sahkan_pendaftaran). Jika jumlah naik dibanding
// terakhir dilihat → bunyi (Web Audio, 2 beep) + badge angka di nav Anggota
// + banner di panel Anggota + ekspresi Hero.
//
// SENGAJA mandiri: polling sendiri, tanpa edit auth.js. Bunyi butuh interaksi
// pengguna pertama (login klik sudah memenuhi syarat audio context browser).

window.AppModules = window.AppModules || {};

window.AppModules.AdminAlert = {
  _timer: null,
  _terakhir: null,
  _audioCtx: null,

  mulai() {
    if (this._timer) return;
    const cek = () => this.cekPending();
    cek();
    this._timer = setInterval(cek, 15000);
  },

  async cekPending() {
    if (!window.App || !App.user) return;
    const role = App.user.role || "";
    if (role !== "admin" && role !== "superadmin") return;
    if (!App.token || !App.getAuthHeaders) return;
    try {
      const res = await fetch(
        `${App.apiBase}/collections/pendaftaran/records?filter=(status='menunggu')&perPage=1`,
        { headers: App.getAuthHeaders(), cache: "no-store" }
      );
      if (!res.ok) return;
      const data = await res.json();
      const jumlah = data.totalItems !== undefined ? data.totalItems : (data.items || []).length;
      this.tandai(jumlah);
      if (this._terakhir !== null && jumlah > this._terakhir) {
        this.berbunyi();
        window.Hero && Hero.setExpression("senang", `Ada ${jumlah} pendaftaran menunggu verifikasi bro!`);
      }
      this._terakhir = jumlah;
    } catch (_) {}
  },

  tandai(jumlah) {
    // badge angka di tombol nav Anggota
    document.querySelectorAll(".nav-btn-anggota").forEach((btn) => {
      let badge = btn.querySelector(".admin-alert-badge");
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "admin-alert-badge";
        badge.style.cssText =
          "position:absolute;top:2px;right:4px;background:var(--warna-merah);color:#fff;font-size:0.62rem;font-weight:800;border-radius:999px;min-width:18px;height:18px;display:flex;align-items:center;justify-content:center;padding:0 4px;";
        btn.style.position = "relative";
        btn.appendChild(badge);
      }
      badge.textContent = jumlah;
      badge.style.display = jumlah > 0 ? "flex" : "none";
    });
    // banner di panel Anggota
    const panel = document.getElementById("panel-anggota");
    let banner = document.getElementById("admin-alert-banner");
    if (!banner && panel) {
      banner = document.createElement("div");
      banner.id = "admin-alert-banner";
      banner.style.cssText =
        "margin-bottom:12px;padding:10px 12px;border-radius:10px;font-size:0.82rem;" +
        "background:rgba(255,176,32,0.15);border:1px solid var(--warna-aksen);display:none;";
      panel.insertBefore(banner, panel.firstChild);
    }
    if (banner) {
      banner.style.display = jumlah > 0 ? "" : "none";
      if (jumlah > 0) {
        banner.innerHTML =
          `🔔 <b>${jumlah} pendaftaran menunggu verifikasi!</b> ` +
          `<button class="btn btn-primary" style="width:auto;padding:4px 10px;font-size:0.75rem;margin-left:6px;" onclick="App.switchTab('anggota')">Lihat Sekarang</button>`;
      }
    }
  },

  bunyi() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this._audioCtx = this._audioCtx || new Ctx();
      const ctx = this._audioCtx;
      if (ctx.state === "suspended") ctx.resume();
      [0, 0.18].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.12, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.15);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.16);
      });
    } catch (_) {}
  },
};

(function () {
  // Auto-mulai setelah modul termuat; polling berhenti sendiri bila belum login
  const t = setInterval(function () {
    if (window.AppModules && window.AppModules.AdminAlert && window.App && App.user) {
      window.AppModules.AdminAlert.mulai();
      clearInterval(t);
    }
  }, 2000);
})();
