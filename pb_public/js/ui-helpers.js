// js/ui-helpers.js - Helper UI bersama untuk modul frontend (dev tools & sync).
// Dipakai modul-modul dev tools agar tidak menduplikasi esc/badge/tile di tiap file.
// Pendaftaran: window.UIHelpers (global, bukan lewat AppModules).
window.UIHelpers = {
  esc(s) {
    if (!s) return "";
    return String(s).replace(/[&<>'"]/g, (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[t] || t));
  },

  badge(color, label) {
    return (
      `<span class="badge" style="background:${color || "var(--text-sub)"};color:#fff;` +
      `font-size:0.7rem;font-weight:700;padding:2px 8px;border-radius:10px;">${this.esc(label)}</span>`
    );
  },

  tile(label, val, color) {
    return (
      `<div class="stat-tile">` +
      `<div class="stat-nilai"${color ? ` style="color:${color};"` : ""}>${this.esc(String(val))}</div>` +
      `<div class="stat-label">${this.esc(label)}</div>` +
      `</div>`
    );
  },
};
