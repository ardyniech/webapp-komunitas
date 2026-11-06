// js/loading.js - Indikator loading real-time anti blank
window.AppModules = window.AppModules || {};

window.AppModules.Loading = {
  _pending: 0,
  _total: 0,
  _startTime: 0,
  _timer: null,

  ensureBar() {
    if (document.getElementById("global-loading-bar")) return;
    const bar = document.createElement("div");
    bar.id = "global-loading-bar";
    bar.style.cssText = "position:fixed;top:0;left:0;height:3px;width:0;background:linear-gradient(90deg, rgba(31,164,99,0.7), var(--warna-utama));z-index:9999;transition:width 0.2s ease-out, opacity 0.3s;opacity:0;pointer-events:none;";
    document.body.prepend(bar);
    const txt = document.createElement("div");
    txt.id = "global-loading-text";
    txt.style.cssText = "position:fixed;top:4px;right:8px;font-size:0.68rem;color:var(--warna-utama);z-index:9998;opacity:0;pointer-events:none;transition:opacity 0.3s;background:rgba(0,0,0,0.35);padding:2px 6px;border-radius:6px;";
    txt.textContent = "Memuat 0%";
    document.body.appendChild(txt);
  },

  start(label) {
    return this.track(() => Promise.resolve(), label);
  },

  track(promise, label) {
    this.ensureBar();
    this._pending++;
    this._total++;
    if (this._pending === 1) {
      this._startTime = Date.now();
      this._timer = setInterval(() => this._update(), 120);
    }
    this._update();
    const done = () => {
      this._pending = Math.max(0, this._pending - 1);
      if (this._pending === 0) {
        this._total = 0;
        this._hide();
      } else {
        this._update();
      }
    };
    if (promise && typeof promise.then === "function") {
      return promise.then(v => { done(); return v; }, e => { done(); throw e; });
    }
    return Promise.resolve().then(() => done());
  },

  _update() {
    const bar = document.getElementById("global-loading-bar");
    const txt = document.getElementById("global-loading-text");
    if (!bar || !txt) return;
    const total = Math.max(1, this._total);
    const selesai = total - this._pending;
    const pct = Math.round((selesai / total) * 100);
    bar.style.opacity = "1";
    txt.style.opacity = "1";
    bar.style.width = pct + "%";
    const detik = ((Date.now() - this._startTime) / 1000).toFixed(1);
    txt.textContent = `Memuat ${pct}% (${selesai}/${total}) ${detik}s`;
    if (navigator.onLine === false) {
      txt.textContent += " · offline";
      bar.style.background = "linear-gradient(90deg, #94a3b8, #f59e0b)";
    } else {
      bar.style.background = "linear-gradient(90deg, rgba(31,164,99,0.7), var(--warna-utama))";
    }
  },

  _hide() {
    const bar = document.getElementById("global-loading-bar");
    const txt = document.getElementById("global-loading-text");
    if (this._timer) clearInterval(this._timer);
    if (bar) { bar.style.width = "100%"; }
    setTimeout(() => {
      if (bar) { bar.style.opacity = "0"; bar.style.width = "0"; }
      if (txt) txt.style.opacity = "0";
    }, 180);
  }
};

// Monkey-patch fetch agar semua request API masuk ke tracker
(function patchFetch() {
  if (typeof window === "undefined" || !window.fetch) return;
  const origFetch = window.fetch.bind(window);
  window.fetch = function (...args) {
    const url = typeof args[0] === "string" ? args[0] : (args[0] && args[0].url) || "";
    if (!url.includes("/api/")) return origFetch(...args);
    const Loading = window.AppModules?.Loading;
    if (!Loading) return origFetch(...args);
    const p = origFetch(...args);
    return Loading.track(p);
  };
})();

// Status online/offline real-time
window.addEventListener("online", () => {
  const txt = document.getElementById("global-loading-text");
  if (txt) txt.textContent = "Online ✅";
  setTimeout(() => { if (txt) txt.style.opacity = "0"; }, 1200);
});
window.addEventListener("offline", () => {
  const txt = document.getElementById("global-loading-text");
  if (!txt) return;
  txt.style.opacity = "1";
  txt.textContent = "Offline ⚠️ — memakai cache terakhir";
  document.getElementById("global-loading-bar").style.background = "linear-gradient(90deg, #94a3b8, #f59e0b)";
});
