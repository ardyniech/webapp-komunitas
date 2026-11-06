// js/notifikasi.js - Pusat notifikasi in-app (bell di header + dropdown inbox).
// Menampilkan notifikasi belum dibaca (badge angka), daftar notifikasi terbaru,
// dan tombol tandai dibaca. Polling 30 detik + refresh saat tab dibuka.
// SENGAJA mandiri (tidak edit file lama); memuat otomatis setelah login.

window.AppModules = window.AppModules || {};

window.AppModules.Notifikasi = {
  _timer: null,

  mulai() {
    if (this._timer) return;
    const cek = () => this.muatBadge();
    cek();
    this._timer = setInterval(cek, 30000);
    // render dropdown saat user klik bell
    setTimeout(() => this._pasangDropdown(), 1000);
  },

  _pasangDropdown() {
    if (document.getElementById("notif-bell")) return;
    const header = document.querySelector(".app-header");
    if (!header) return;
    const wrap = document.createElement("div");
    wrap.style.cssText = "position:relative;margin-left:8px;display:flex;align-items:center;";
    wrap.innerHTML =
      `<button id="notif-bell" class="btn btn-outline" style="width:auto;padding:6px 10px;font-size:1rem;position:relative;" onclick="App.bukaNotifikasi(event)" title="Notifikasi">🔔</button>` +
      `<span id="notif-badge" style="display:none;position:absolute;top:-4px;right:-4px;background:var(--warna-merah);color:#fff;font-size:0.62rem;font-weight:800;border-radius:999px;min-width:18px;height:18px;text-align:center;line-height:18px;padding:0 4px;"></span>` +
      `<div id="notif-dropdown" class="smart-user-card" style="display:none;position:absolute;right:0;top:44px;width:300px;max-height:60vh;overflow:auto;padding:10px;z-index:13000;"></div>`;
    const badge = document.getElementById("user-header-badge");
    if (badge && badge.parentElement === header) header.insertBefore(wrap, badge);
    else header.appendChild(wrap);
  },

  async muatBadge() {
    if (!window.App || !App.user || !App.token) return;
    try {
      const res = await fetch(
        `${App.apiBase}/collections/notifikasi/records?filter=(dibaca=false)&perPage=1`,
        { headers: App.getAuthHeaders(), cache: "no-store" }
      );
      if (!res.ok) return;
      const data = await res.json();
      const jumlah = data.totalItems !== undefined ? data.totalItems : (data.items || []).length;
      const badge = document.getElementById("notif-badge");
      if (badge) {
        badge.textContent = jumlah > 99 ? "99+" : jumlah;
        badge.style.display = jumlah > 0 ? "block" : "none";
      }
    } catch (_) {}
  },

  async bukaNotifikasi(e) {
    if (e) e.stopPropagation();
    const dd = document.getElementById("notif-dropdown");
    if (!dd) return;
    const terbuka = dd.style.display === "block";
    dd.style.display = terbuka ? "none" : "block";
    if (!terbuka) this.renderDaftar(dd);
  },

  async renderDaftar(dd) {
    dd.innerHTML = `<div class="empty-state">Memuat notifikasi...</div>`;
    try {
      const res = await fetch(
        `${App.apiBase}/collections/notifikasi/records?sort=-waktu&perPage=30`,
        { headers: App.getAuthHeaders(), cache: "no-store" }
      );
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const items = data.items || [];
      if (items.length === 0) {
        dd.innerHTML = `<div class="empty-state">Tidak ada notifikasi. Tenang bro.</div>`;
        return;
      }
      dd.innerHTML = items
        .map(
          (n) =>
            `<div style="padding:8px 6px;border-bottom:1px solid var(--border-color);font-size:0.8rem;cursor:pointer;${n.dibaca ? "" : "font-weight:700;background:rgba(31,164,99,0.08);"}">` +
            `<div>${this.esc(n.judul)}</div>` +
            `<div style="font-size:0.72rem;color:var(--text-sub);margin-top:2px;">${this.esc(n.isi || "")}</div>` +
            `<div style="font-size:0.68rem;color:var(--text-muted);margin-top:2px;">${App.formatTanggal ? App.formatTanggal(n.waktu) : n.waktu}${this.esc(n.jenis)}</div></div>`
        )
        .join("") +
        `<button class="btn btn-primary" style="width:100%;margin-top:8px;padding:6px;font-size:0.75rem;" onclick="App.tandaiSemuaDibaca()">Tandai semua dibaca</button>`;
    } catch (err) {
      dd.innerHTML = `<div class="empty-state" style="color:var(--warna-merah);">Gagal memuat: ${this.esc(err.message)}</div>`;
    }
  },

  async tandaiSemuaDibaca() {
    try {
      const res = await fetch(
        `${App.apiBase}/collections/notifikasi/records?filter=(dibaca=false)&perPage=50`,
        { headers: App.getAuthHeaders(), cache: "no-store" }
      );
      const data = await res.json();
      for (const n of data.items || []) {
        await fetch(`${App.apiBase}/collections/notifikasi/records/${n.id}`, {
          method: "PATCH",
          headers: App.getAuthHeaders(),
          body: JSON.stringify({ dibaca: true }),
        });
      }
    } catch (_) {}
    this.muatBadge();
    document.getElementById("notif-dropdown").style.display = "none";
  },

  esc(s) {
    return (window.UIHelpers && UIHelpers.esc ? UIHelpers.esc(s) : String(s == null ? "" : s));
  },
};

(function () {
  const t = setInterval(function () {
    if (window.AppModules && window.AppModules.Notifikasi && window.App && App.user) {
      window.AppModules.Notifikasi.mulai();
      clearInterval(t);
    }
  }, 2000);
})();
