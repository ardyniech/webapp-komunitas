// js/progres.js - Pelacakan Progres Pengembangan Berbasis Hasil Uji
window.AppModules = window.AppModules || {};

window.AppModules.Progres = {
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
      if (summarySub) {
        const selesaiFase = (data.fase || []).filter(f => f.status === "selesai").length;
        summarySub.innerText = `${data.fitur_berfungsi || 0} dari ${data.total_fitur || 0} fitur lulus uji (${selesaiFase} dari ${(data.fase || []).length} fase komplit)`;
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
                <div class="pos-title">${f.kode}: ${this.escapeHtml(f.nama)}</div>
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
            : `<span class="badge" style="background:var(--warna-aksen); color:#000; font-size:0.7rem; padding:2px 8px; border-radius:10px;">PENGERJAAN</span>`;

          const fiturRows = (f.fitur || []).map(fit => {
            const isFiturDone = fit.status === "berfungsi";
            const fiturIcon = isFiturDone ? "✅" : "⏳";
            return `
              <div style="padding:10px; border-top:1px solid rgba(255,255,255,0.06); font-size:0.8rem;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-weight:600;">${fiturIcon} ${fit.kode}: ${this.escapeHtml(fit.nama)}</span>
                  <span style="font-size:0.72rem; color:var(--text-sub);">${fit.uji_lulus}/${fit.jumlah_uji} uji</span>
                </div>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${this.escapeHtml(fit.deskripsi || '')}</div>
                <div style="font-size:0.72rem; color:var(--warna-utama); margin-top:4px; font-style:italic;">💬 ${this.escapeHtml(fit.catatan_publik || '')}</div>
              </div>
            `;
          }).join("");

          return `
            <details class="kas-card" style="margin-bottom:10px; display:block; padding:0; overflow:hidden;" ${isDone ? '' : 'open'}>
              <summary style="padding:14px; cursor:pointer; font-weight:700; display:flex; justify-content:space-between; align-items:center; list-style:none;">
                <div>
                  <div style="font-size:0.9rem;">${f.kode} — ${this.escapeHtml(f.nama)}</div>
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
