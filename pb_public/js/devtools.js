// js/devtools.js - Loader halaman Dev Tools (sub-tab) — ATOMIK, terpisah dari Bug Hunter.
// Berisi: Git, Diagnosa, Monitor (heartbeat+log), Info (drift+inventory+releases+flag).
window.AppModules = window.AppModules || {};

window.AppModules.DevTools = {
  async devtoolsLoadAll() {
    if (this.renderGit) this.renderGit();
    if (this.renderDiagnose) this.renderDiagnose();
    if (this.renderMonitor) this.renderMonitor();
    if (this.renderInfo) this.renderInfo();
    this.tandaiAlert();
  },

  // Badge merah di tombol nav Bug Hunter bila ada bug kritikal/tinggi.
  async tandaiAlert() {
    try {
      const d = await this.devtoolsFetch("scan-report.json");
      const k = (d.by_severity && d.by_severity.critical) || 0;
      const t = (d.by_severity && d.by_severity.high) || 0;
      document.querySelectorAll(".nav-item[data-tab='bug-hunter']").forEach((btn) => {
        btn.style.position = "relative";
        const old = btn.querySelector(".bug-alert-badge");
        if (old) old.remove();
        if (k + t > 0) {
          const b = document.createElement("span");
          b.className = "bug-alert-badge";
          b.textContent = k + t;
          b.style.cssText =
            "position:absolute;top:2px;right:6px;background:var(--warna-merah);color:#fff;font-size:0.62rem;font-weight:800;border-radius:999px;min-width:18px;height:18px;display:flex;align-items:center;justify-content:center;padding:0 4px;";
          btn.appendChild(b);
        }
      });
    } catch (_) {}
  },

  devtoolsSwitchSub(sub) {
    document.querySelectorAll(".devtools-sub-tab").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-sub") === sub);
    });
    document.querySelectorAll(".devtools-sub-panel").forEach((p) => {
      p.style.display = "none";
    });
    const el = document.getElementById("devtools-sub-" + sub);
    if (el) el.style.display = "block";
  },

  // Ambil JSON devtools dengan fallback path (root & /drg/)
  async devtoolsFetch(name) {
    const ts = Date.now();
    const candidates = [
      `${name}?t=${ts}`,
      `/${name}?t=${ts}`,
      `/drg/${name}?t=${ts}`,
    ];
    let lastErr = null;
    for (const u of candidates) {
      try {
        const res = await fetch(u, { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const text = await res.text();
        return JSON.parse(text);
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("Gagal memuat " + name);
  },

  esc(s) {
    if (!s) return "";
    return String(s).replace(/[&<>'"]/g, (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[t] || t));
  },
};

// Auto-alert: periksa scan-report saat login (tanpa harus buka Dev Tools)
(function () {
  let n = 0;
  const timer = setInterval(function () {
    n++;
    if (window.AppModules && window.AppModules.DevTools && localStorage.getItem("pb_token")) {
      window.AppModules.DevTools.tandaiAlert();
    }
    if (n > 30) clearInterval(timer); // ~1 menit sekali cukup, lalu cek manual via reload
  }, 2000);
})();
