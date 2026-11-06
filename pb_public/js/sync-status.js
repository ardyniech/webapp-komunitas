// js/sync-status.js - Status sinkronisasi jujur + overlay progres (dev/sync tools, ATOMIK).
//
// Menjawab: "data server vs device user ada yang belum sync / masih jalan?"
// - Overlay fixed di layer paling atas (di bawah header): tampil saat sync
//   berjalan / ada antrean, hilang otomatis setelah selesai (dengan delay).
// - Mutasi (PATCH/POST/PUT/DELETE) yang gagal jaringan masuk antrean
//   localStorage, diputar ulang saat online / refresh berikutnya.
// - Stempel teks: tanggal terakhir data tersinkron.
//
// SENGAJA mandiri (tidak mengedit app.js/auth.js). Membungkus dari luar:
// App.refreshData (tahap awal) dan window.fetch (antrean mutasi).

window.AppModules = window.AppModules || {};

const SYNC_Q_KEY = "sync_queue_v1";

window.AppModules.SyncStatus = {
  state: { aktif: false, langkah: [], selesai: 0, total: 0, mulai: null, terakhir: localStorage.getItem("sync_terakhir") || "-" },
  _overlay: null,
  _wrappedRefresh: false,
  _wrappedFetch: false,

  // ── Overlay (layer paling atas) ─────────────────────────────────────
  overlay() {
    if (this._overlay) return this._overlay;
    let el = document.getElementById("sync-overlay");
    if (!el) {
      el = document.createElement("div");
      el.id = "sync-overlay";
      el.style.cssText =
        "position:fixed;top:0;left:0;right:0;z-index:12000;display:none;" +
        "background:rgba(10,15,10,0.92);color:#fff;padding:8px 14px;font-size:0.8rem;" +
        "border-bottom:2px solid var(--warna-utama,#1FA463);backdrop-filter:blur(4px);";
      document.body.appendChild(el);
    }
    this._overlay = el;
    return el;
  },

  tampil(html) {
    const el = this.overlay();
    el.innerHTML = html;
    el.style.display = "block";
  },

  tampilkan() {
    const s = this.state;
    const pct = s.total > 0 ? Math.round((s.selesai / s.total) * 100) : 0;
    const antrean = this.antrean().length;
    const langkahTerakhir = s.langkah.length ? s.langkah[s.langkah.length - 1] : "";
    let html;
    if (s.aktif) {
      html =
        `<div style="display:flex;justify-content:space-between;align-items:center;">` +
        `<span>🔄 <b>Sinkronisasi… ${s.selesai}/${s.total} (${pct}%)</b> ${langkahTerakhir ? "— " + this.esc(langkahTerakhir) : ""}</span>` +
        `<span style="font-size:0.72rem;opacity:0.8;">mulai ${s.mulai || ""}</span></div>` +
        `<div style="height:6px;background:rgba(255,255,255,0.2);border-radius:3px;margin-top:6px;">` +
        `<div style="height:100%;width:${pct}%;background:var(--warna-utama,#1FA463);border-radius:3px;transition:width 0.3s;"></div></div>` +
        (antrean ? `<div style="font-size:0.72rem;margin-top:4px;opacity:0.85;">${antrean} perubahan menunggu dikirim ke server</div>` : "");
    } else if (antrean > 0) {
      html = `⏳ <b>${antrean} perubahan</b> belum tersinkron ke server. <button style="margin-left:6px;background:var(--warna-utama,#1FA463);color:#fff;border:none;border-radius:6px;padding:3px 10px;font-size:0.75rem;cursor:pointer;" onclick="App.syncSekarang()">Kirim sekarang</button>`;
    } else {
      html = `✅ <b>Tersinkron</b> · terakhir ${this.esc(s.terakhir)}`;
    }
    this.tampilkan(html);
  },

  sembunyikanSetelah(ms) {
    setTimeout(() => {
      if (!this.state.aktif && this.antrean().length === 0) {
        this.overlay().style.display = "none";
      }
    }, ms || 4000);
  },

  // ── Antrean mutasi (device -> server) ───────────────────────────────
  antrean() {
    try { return JSON.parse(localStorage.getItem(SYNC_Q_KEY)) || []; } catch (_) { return []; }
  },
  simpanAntrean(list) {
    try { localStorage.setItem(SYNC_Q_KEY, JSON.stringify(list.slice(-50))); } catch (_) {}
  },

  // ── Bungkus refreshData: lacak langkah sinkronisasi nyata ──────────
  bungkusRefresh() {
    if (this._wrappedRefresh || !window.App || typeof App.refreshData !== "function") return;
    this._wrappedRefresh = true;
    const self = this;
    const orig = App.refreshData.bind(App);
    App.refreshData = async function () {
      self.state.aktif = true;
      self.state.selesai = 0;
      self.state.mulai = new Date().toLocaleTimeString("id-ID");
      // langkah dari fetcher yang dikenal; urutan sesuai app.js
      const langkah = ["fetchKas", "fetchAnggotaData", "fetchIuran", "loadProgres"];
      self.state.langkah = [];
      self.state.total = langkah.length;
      self.tampilkan();
      // bungkus tiap fetcher untuk menandai selesai satu per satu
      const wrapped = [];
      langkah.forEach((name) => {
        if (typeof App[name] === "function" && !App[name]._syncWrapped) {
          const f = App[name];
          const wf = async function (...args) {
            try { return await f.apply(App, args); }
            finally {
              self.state.langkah = [name];
              self.state.selesai = Math.min(self.state.total, self.state.selesai + 1);
              self.tampilkan();
            }
          };
          wf._syncWrapped = true;
          App[name] = wf;
          wrapped.push([name, f]);
        }
      });
      try {
        await orig();
      } finally {
        wrapped.forEach(([name, f]) => { App[name] = f; });
        self.state.aktif = false;
        self.state.selesai = self.state.total;
        const now = new Date().toLocaleString("id-ID");
        self.state.terakhir = now;
        try { localStorage.setItem("sync_terakhir", now); } catch (_) {}
        self.tampilkan();
        self.sembunyikanSetelah();
        self.drainAntrean();
      }
    };
  },

  // ── Bungkus fetch: tangkap mutasi gagal jaringan ke antrean ─────────
  bungkusFetch() {
    if (this._wrappedFetch) return;
    this._wrappedFetch = true;
    const self = this;
    const origFetch = window.fetch.bind(window);
    window.fetch = async function (input, init) {
      const url = typeof input === "string" ? input : input && input.url ? input.url : "";
      const method = (init && init.method) || (input && input.method) || "GET";
      const mutasi = /^(POST|PUT|PATCH|DELETE)$/i.test(method) && (/\/collections\//.test(url) || /\/api\//.test(url) || /\/komunitas\//.test(url));
      let res;
      try {
        res = await origFetch(input, init);
      } catch (e) {
        if (mutasi) self.masukAntrean(url, method, init && init.body ? String(init.body) : "");
        throw e;
      }
      if (mutasi && res && res.status >= 500) self.masukAntrean(url, method, init && init.body ? String(init.body) : "");
      return res;
    };
  },

  masukAntrean(url, method, body) {
    const list = this.antrean();
    list.push({ url, method, body, waktu: new Date().toISOString() });
    this.simpanAntrean(list);
    this.tampilkan();
  },

  // ── Kirim ulang antrean (server <- device) ─────────────────────────
  async drainAntrean() {
    const list = this.antrean();
    if (list.length === 0) return;
    let sisa = 0;
    for (const item of list) {
      try {
        const res = await fetch(item.url, {
          method: item.method,
          headers: window.App && App.getAuthHeaders ? App.getAuthHeaders() : { "Content-Type": "application/json" },
          body: item.body || undefined,
        });
        if (!res.ok) sisa++;
      } catch (_) {
        sisa++;
      }
    }
    // simpan hanya yang masih gagal (tetap menunggu)
    this.simpanAntrean(sisa > 0 ? list : []);
    this.tampilkan();
  },

  async syncSekarang() {
    await this.drainAntrean();
    if (window.App && App.refreshData) await App.refreshData();
  },

  // delegasi ke helper bersama
  esc(s) {
    if (window.UIHelpers && UIHelpers.esc) return UIHelpers.esc(s);
    if (!s) return "";
    return String(s).replace(/[&<>'"]/g, (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[t] || t));
  },
};

// Auto-init: bungkus + dengarkan reconnect
(function () {
  let attempts = 0;
  const timer = setInterval(function () {
    attempts++;
    if (window.AppModules && window.AppModules.SyncStatus) {
      const S = window.AppModules.SyncStatus;
      S.bungkusRefresh();
      S.bungkusFetch();
      if (S.antrean().length > 0) S.tampilkan();
    }
    if (attempts > 60) clearInterval(timer);
  }, 2000);
  window.addEventListener("online", function () {
    if (window.AppModules && window.AppModules.SyncStatus) {
      window.AppModules.SyncStatus.drainAntrean();
      if (window.App && App.refreshData) App.refreshData();
    }
  });
})();
