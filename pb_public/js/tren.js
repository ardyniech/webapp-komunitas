// js/tren.js - Dasbor tren kas & iuran 6 bulan terakhir (CSS murni, tanpa library).
//
// Agregasi read-only dari App.allKas / App.allIuran yang sudah termuat.
// Menampilkan: bar kas masuk vs keluar per bulan + persentase iuran lunas per bulan.
// Render di panel Markas saat switchTab('markas') — di-hook mandiri (tanpa edit markas.js).

window.AppModules = window.AppModules || {};

window.AppModules.Tren = {
  renderTren() {
    const el = document.getElementById("tren-card");
    if (!el || !window.App) return;
    el.style.display = "";

    // 6 bulan terakhir (termasuk bulan berjalan)
    const bulan = [];
    const nowDate = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 1);
      const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      const label = d.toLocaleDateString("id-ID", { month: "short" }) + " " + String(d.getFullYear()).slice(2);
      bulan.push({ key, label });
    }

    const kasByBulan = {};
    (App.allKas || []).forEach((t) => {
      const k = String(t.tanggal || "").slice(0, 7);
      if (!kasByBulan[k]) kasByBulan[k] = { masuk: 0, keluar: 0 };
      if (t.jenis === "masuk") kasByBulan[k].masuk += Number(t.nominal) || 0;
      else kasByBulan[k].keluar += Number(t.nominal) || 0;
    });

    const iuranByBulan = {};
    (App.allIuran || []).forEach((t) => {
      const k = String(t.periode || "");
      if (!iuranByBulan[k]) iuranByBulan[k] = { lunas: 0, total: 0 };
      iuranByBulan[k].total++;
      if (t.status === "lunas") iuranByBulan[k].lunas++;
    });

    const kasRows = bulan
      .map((b) => {
        const v = kasByBulan[b.key] || { masuk: 0, keluar: 0 };
        const max = Math.max(v.masuk, v.keluar, 1);
        const hIn = Math.max(2, Math.round((v.masuk / max) * 40));
        const hOut = Math.max(2, Math.round((v.keluar / max) * 40));
        return (
          `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;">` +
          `<div style="display:flex;gap:3px;align-items:flex-end;height:48px;">` +
          `<div title="Masuk Rp${v.masuk.toLocaleString("id-ID")}" style="width:12px;height:${hIn}px;background:#10b981;border-radius:3px;"></div>` +
          `<div title="Keluar Rp${v.keluar.toLocaleString("id-ID")}" style="width:12px;height:${hOut}px;background:#ef4444;border-radius:3px;"></div>` +
          `</div>` +
          `<div style="font-size:0.65rem;color:var(--text-muted);text-align:center;">${b.label}<br>+${Math.round(v.masuk / 1000)}k/-${Math.round(v.keluar / 1000)}k</div></div>`
        );
      })
      .join("");

    const iuranRows = bulan
      .map((b) => {
        const v = iuranByBulan[b.key] || { lunas: 0, total: 0 };
        const pct = v.total > 0 ? Math.round((v.lunas / v.total) * 100) : 0;
        return (
          `<div style="flex:1;text-align:center;">` +
          `<div style="height:8px;background:var(--bg-input);border-radius:4px;overflow:hidden;">` +
          `<div style="height:100%;width:${pct}%;background:${pct >= 90 ? "#10b981" : pct >= 50 ? "#FFB020" : "#ef4444"};"></div></div>` +
          `<div style="font-size:0.65rem;color:var(--text-muted);margin-top:3px;">${b.label}<br><b>${pct}%</b></div></div>`
        );
      })
      .join("");

    el.innerHTML =
      `<div style="font-size:0.85rem;font-weight:700;color:var(--text-sub);margin-bottom:8px;">📊 TREN 6 BULAN TERAKHIR</div>` +
      `<div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:4px;">Kas (hijau=masuk, merah=keluar)</div>` +
      `<div style="display:flex;gap:8px;align-items:flex-start;">${kasRows}</div>` +
      `<div style="font-size:0.72rem;color:var(--text-muted);margin:10px 0 4px;">Iuran lunas per bulan</div>` +
      `<div style="display:flex;gap:8px;">${iuranRows}</div>`;
  },
};

(function () {
  // Hook ke switchTab tanpa mengedit core-events/markas
  const t = setInterval(function () {
    if (window.App && App.switchTab && !App.switchTab._trenHook) {
      const orig = App.switchTab.bind(App);
      App.switchTab = function (tab) {
        const r = orig(tab);
        if (tab === "markas" && window.AppModules.Tren) {
          // tunggu sedikit agar renderMarkas selesai dulu
          setTimeout(() => AppModules.Tren.renderTren(), 300);
        }
        return r;
      };
      App.switchTab._trenHook = true;
      clearInterval(t);
    }
  }, 500);
})();
