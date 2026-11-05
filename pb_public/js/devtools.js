// js/devtools.js - Loader halaman Dev Tools (sub-tab) — ATOMIK, terpisah dari Bug Hunter.
// Berisi: Git, Diagnosa, Monitor (heartbeat+log), Info (drift+inventory+releases+flag).
window.AppModules = window.AppModules || {};

window.AppModules.DevTools = {
  async devtoolsLoadAll() {
    if (this.renderGit) this.renderGit();
    if (this.renderDiagnose) this.renderDiagnose();
    if (this.renderMonitor) this.renderMonitor();
    if (this.renderInfo) this.renderInfo();
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
