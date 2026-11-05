// js/progres.js - Pelacakan Progres Pengembangan Berbasis Hasil Uji (jujur & auto-update + auto-deteksi tahap maturitas)
window.AppModules = window.AppModules || {};

window.AppModules.Progres = {
  escapeHtml(s) {
    if (!s) return "";
    return String(s).replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t));
  },

  // Tahap maturitas fitur:
  // benih   = belum ada uji (status belum_mulai)
  // anak    = ada uji tapi belum semua lulus (status dalam_pengerjaan)
  // matur   = semua uji lulus (status berfungsi)
  tahapBadge(status, auto_detected) {
    if (status === "berfungsi") {
      return `<span class="badge" style="background:#10b981; color:#fff; font-size:0.7rem; padding:2px 8px; border-radius:10px;">MATUR (Lulus Uji)</span>`;
    }
    if (status === "dalam_pengerjaan") {
      return `<span class="badge" style="background:var(--warna-aksen); color:#000; font-size:0.7rem; padding:2px 8px; border-radius:10px;">ANAK (Dalam Pengerjaan)</span>`;
    }
    // belum_mulai
    return `<span class="badge" style="background:var(--bg-input); color:var(--text-muted); font-size:0.7rem; padding:2px 8px; border-radius:10px; border:1px solid var(--border-color);">BENIH (Belum Dimulai)</span>`;
  },

  async loadProgres() {
    try {
      const res = await fetch(`${this.apiBase}/komunitas/progres`);
      if (!res.ok) return;
      const data = await res.json();

      const pctHeadline = document.getElementById("progres-pct-headline");
      const barFill = document.getElementById("progres-bar-fill");
      const summarySub = document.getElementById("progres-summary-sub");
      const roadmapWrap = document.getElementById("progres-roadmap-wrap");
      const accordionWrap = document.getElementById("progres-fase-accordion");

      if (pctHeadline) pctHeadline.innerText = `${data.persen_total || 0}%`;
      if (barFill) barFill.style.width = `${data.persen_total || 0}%`;

      const selesaiFase = (data.fase || []).filter(f => f.status === "selesai").length;
      const autoInfo = data.auto_detected_count
        ? ` • ${data.auto_detected_count} fitur baru terdeteksi otomatis (benih/anak/matur)`
        : "";
      const ujiInfo = data.uji_belum_diuji ? ` • ${data.uji_belum_diuji} uji belum diuji` : "";
      if (summarySub) {
        summarySub.innerHTML =
          `${data.fitur_berfungsi || 0} dari ${data.total_fitur || 0} fitur lulus uji ` +
          `(${selesaiFase} dari ${(data.fase || []).length} fase komplit)${autoInfo}${ujiInfo} ` +
          `<span style="font-size:0.7rem; color:var(--text-muted);">(sumber: ${data.sumber || "evaluasi_otomatis"})</span>`;
      }

      if (roadmapWrap && data.fase) {
        roadmapWrap.innerHTML = data.fase.map(f => {
          const isDone = f.status === "selesai";
          const isCurrent = f.status === "berjalan";
          const icon = isDone ? "🏁" : (isCurrent ? "⛽" : "🚧");
          const cls = isDone ? "selesai" : (isCurrent ? "aktif" : "antre");
          return `
            <div class="roadmap-pos ${cls}">
              <div class="pos-dot">${icon}</div>
              <div class="pos-info">
                <div class="pos-title">${f.kode}: ${this.escapeHtml(f.nama)}${f.auto_detected ? ' <span style="font-size:0.7rem;color:var(--warna-aksen);">★Otomatis</span>' : ''}</div>
                <div class="pos-sub">${f.jumlah_berfungsi}/${f.jumlah_fitur} fitur • ${f.persen}%</div>
              </div>
            </div>
          `;
        }).join("");
      }

      if (accordionWrap && data.fase) {
        accordionWrap.innerHTML = data.fase.map(f => {
          const isDone = f.status === "selesai";
          const statusBadge = isDone
            ? `<span class="badge" style="background:#10b981; color:#fff; font-size:0.7rem; padding:2px 8px; border-radius:10px;">LULUS UJI</span>`
            : f.status === "berjalan"
              ? `<span class="badge" style="background:var(--warna-aksen); color:#000; font-size:0.7rem; padding:2px 8px; border-radius:10px;">PENGERJAAN</span>`
              : `<span class="badge" style="background:var(--bg-input); color:var(--text-muted); font-size:0.7rem; padding:2px 8px; border-radius:10px; border:1px solid var(--border-color);">BELUM DIMULAI</span>`;

          const fiturRows = (f.fitur || []).map(fit => {
            const isFiturDone = fit.status === "berfungsi";
            const fiturIcon = isFiturDone ? "✅" : "⏳";
            const ujiText = fit.jumlah_uji !== undefined
              ? ` (${fit.uji_lulus}/${fit.jumlah_uji} uji lulus)`
              : "";
            const autoBadge = fit.auto_detected
              ? ` <span class="badge" style="background:var(--warna-aksen); color:#fff; font-size:0.65rem; padding:1px 6px; border-radius:10px; margin-left:6px;">OTOMATIS</span>`
              : "";
            const tahapBadge = this.tahapBadge(fit.status, fit.auto_detected);

            return `
              <div style="padding:10px; border-top:1px solid rgba(255,255,255,0.06); font-size:0.8rem;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-weight:600;">${fiturIcon} ${fit.kode}: ${this.escapeHtml(fit.nama)}${autoBadge}${ujiText}</span>
                  <span style="font-size:0.72rem; color:var(--text-sub);">${fit.status}</span>
                </div>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${this.escapeHtml(fit.deskripsi || '')}</div>
                <div style="font-size:0.72rem; color:var(--warna-utama); margin-top:4px; font-style:italic;">💬 ${this.escapeHtml(fit.catatan_publik || '')}</div>
                <div style="margin-top:4px;">${tahapBadge}</div>
              </div>
            `;
          }).join("");

          return `
            <details class="kas-card" style="margin-bottom:10px; display:block; padding:0; overflow:hidden;" ${isDone ? '' : 'open'}>
              <summary style="padding:14px; cursor:pointer; font-weight:700; display:flex; justify-content:space-between; align-items:center; list-style:none;">
                <div>
                  <div style="font-size:0.9rem;">${f.kode} — ${this.escapeHtml(f.nama)}${f.auto_detected ? ' <span style="font-size:0.7rem;color:var(--warna-aksen);">★Otomatis</span>' : ''}</div>
                  <div style="font-size:0.72rem; color:var(--text-sub); font-weight:normal; margin-top:2px;">${this.escapeHtml(f.deskripsi)}</div>
                </div>
                <div>${statusBadge}</div>
              </summary>
              <div style="background:rgba(0,0,0,0.15); padding:4px 8px;">
                ${fiturRows}
              </div>
            </details>
          `;
        }).join("");
      }
    } catch (e) {
      console.warn("Could not load progres", e);
    }
  }
};
