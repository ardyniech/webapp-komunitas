// js/cari-global.js - Pencarian global di header (anggota/kas/forum/panduan).
//
// Kolom "🔍 Cari..." di header app. Menanyakan beberapa koleksi sekaligus
// (list API) dan menampilkan hasil gabungan dengan tab tujuan klik.
// SENGAJA mandiri: polling pasang kolom saat App siap.

window.AppModules = window.AppModules || {};

window.AppModules.CariGlobal = {
  _pasang: false,

  pasang() {
    if (this._pasang) return;
    const header = document.querySelector(".app-header");
    if (!header) return;
    const wrap = document.createElement("div");
    wrap.style.cssText = "position:relative;margin-left:8px;flex:1;max-width:220px;display:flex;";
    wrap.innerHTML =
      `<input id="cari-global-input" type="text" placeholder="🔍 Cari anggota, kas, forum..." ` +
      `style="width:100%;padding:6px 10px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-input);color:var(--text-primary);font-size:0.8rem;">` +
      `<div id="cari-global-drop" style="display:none;position:absolute;top:38px;left:0;right:0;background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;z-index:13000;max-height:60vh;overflow:auto;padding:8px;"></div>`;
    header.insertBefore(wrap, header.firstChild.nextSibling);
    this._pasang = true;

    const inp = document.getElementById("cari-global-input");
    const drop = document.getElementById("cari-global-drop");
    let timer = null;
    inp.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => this.cari(inp.value.trim(), drop), 300);
    });
    document.addEventListener("click", (e) => {
      if (!wrap.contains(e.target)) drop.style.display = "none";
    });
  },

  async cari(q, drop) {
    if (!q || q.length < 2) {
      drop.style.display = "none";
      return;
    }
    drop.style.display = "block";
    drop.innerHTML = `<div class="empty-state">Mencari "${this.esc(q)}"...</div>`;

    const headers = App.getAuthHeaders();
    const enc = encodeURIComponent(q);
    const ambil = async (path) => {
      try {
        const res = await fetch(`${App.apiBase}${path}`, { headers, cache: "no-store" });
        if (!res.ok) return [];
        const data = await res.json();
        return data.items || [];
      } catch (_) {
        return [];
      }
    };

    const [anggota, kas, forum, panduan] = await Promise.all([
      this.ambilProfils(enc),
      ambil(`/collections/kas/records?sort=-tanggal&perPage=5&filter=keterangan~'${enc}'`),
      ambil(`/collections/forum_topik/records?sort=-created&perPage=5&filter=judul~'${enc}'`),
      ambil(`/collections/panduan/records?sort=-created&perPage=5&filter=judul~'${enc}'`),
    ]);

    const baris = (ikon, judul, sub, tab) =>
      `<div style="padding:7px 6px;border-bottom:1px solid var(--border-color);font-size:0.8rem;cursor:pointer;" onclick="App.switchTab('${tab}');document.getElementById('cari-global-drop').style.display='none';">` +
      `<div>${ikon} ${this.esc(judul)}</div><div style="font-size:0.7rem;color:var(--text-muted);">${this.esc(sub)}</div></div>`;

    const html =
      (anggota.length ? `<div style="font-size:0.7rem;font-weight:800;color:var(--warna-utama);margin:4px 0 2px;">ANGGOTA (${anggota.length})</div>` +
        anggota.map((a) => baris("👤", a.nama_tampil || a.nama || "-", (a.bidang_terlihat && a.bidang_terlihat.domisili) || "-", "anggota")).join("") : "") +
      (kas.length ? `<div style="font-size:0.7rem;font-weight:800;color:var(--warna-utama);margin:8px 0 2px;">KAS (${kas.length})</div>` +
        kas.map((t) => baris("📖", t.keterangan || "-", `${t.jenis} Rp ${Number(t.nominal).toLocaleString("id-ID")} · ${String(t.tanggal || "").slice(0, 10)}`, "kas")).join("") : "") +
      (forum.length ? `<div style="font-size:0.7rem;font-weight:800;color:var(--warna-utama);margin:8px 0 2px;">FORUM (${forum.length})</div>` +
        forum.map((f) => baris("💬", f.judul || "-", f.kategori || "", "forum")).join("") : "") +
      (panduan.length ? `<div style="font-size:0.7rem;font-weight:800;color:var(--warna-utama);margin:8px 0 2px;">PANDUAN (${panduan.length})</div>` +
        panduan.map((p) => baris("📚", p.judul || "-", p.kategori || "", "panduan")).join("") : "");

    drop.innerHTML = html || `<div class="empty-state">Tidak ditemukan untuk "${this.esc(q)}".</div>`;
  },

  // Anggota dicari via profil_publik (aman; data sensitif tidak bocor)
  async ambilProfils(enc) {
    try {
      const res = await fetch(
        `${App.apiBase}/collections/profil_publik/records?perPage=5&filter=nama_tampil~'${enc}'`,
        { headers: App.getAuthHeaders(), cache: "no-store" }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return data.items || [];
    } catch (_) {
      return [];
    }
  },

  esc(s) {
    return (window.UIHelpers && UIHelpers.esc ? UIHelpers.esc(s) : String(s == null ? "" : s));
  },
};

(function () {
  const t = setInterval(function () {
    if (window.AppModules && window.AppModules.CariGlobal) {
      window.AppModules.CariGlobal.pasang();
      clearInterval(t);
    }
  }, 800);
})();
