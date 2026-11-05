// js/devtools-info.js - Tampilan Info: Drift, Inventory, Releases + Feature Flag console.
window.AppModules = window.AppModules || {};

const MODUL_KNOWN = ["kas", "iuran", "struktur", "profil", "aturan", "pendaftaran", "forum", "panduan", "kuesioner", "event", "progres"];

window.AppModules.DevToolsInfo = {
  async renderInfo() {
    this.renderDrift();
    this.renderInventory();
    this.renderReleases();
    this.renderLinks();
    this.renderSecurity();
    this.renderFlags();
  },

  // Audit tautan hidup: file statis + route hook + builtin PocketBase
  async renderLinks() {
    const el = document.getElementById("devtools-links-list");
    if (!el) return;
    el.innerHTML = `<div class="empty-state">Memuat audit tautan...</div>`;
    try {
      const d = await this.devtoolsFetch("devtools-links.json");
      const dead = (d.total_dead || 0) === 0;
      const routeBadges = (d.route_checks || [])
        .map(
          (r) =>
            `<span class="badge" style="background:${r.hidup ? "var(--warna-utama)" : "var(--warna-merah)"};color:#fff;font-size:0.68rem;margin:1px;padding:2px 7px;border-radius:10px;" title="${r.test_url || ""}">${this.esc(r.method)} ${this.esc(r.route)} · ${r.http}</span>`
        )
        .join("");
      el.innerHTML =
        `<div style="font-size:0.82rem;margin-bottom:6px;">` +
        (dead
          ? `<b style="color:var(--warna-utama);">✅ Semua tautan hidup</b> — ${d.static_total} file statis + ${d.routes_total} route hook merespons.`
          : `<b style="color:var(--warna-merah);">${d.total_dead} tautan MATI</b> (lihat bawah).`) +
        ` <span style="color:var(--text-muted);font-size:0.75rem;">Live curl, ${this.esc(d.generated_at)}</span></div>` +
        `<div style="font-weight:700;font-size:0.78rem;margin:6px 0 3px;">Route API (live)</div>${routeBadges}` +
        (d.routes_dead && d.routes_dead.length
          ? `<div style="font-weight:700;font-size:0.78rem;margin:8px 0 3px;color:var(--warna-merah);">Mati (${d.routes_dead.length})</div>` +
            d.routes_dead.map((r) => `<div style="font-size:0.78rem;color:var(--warna-merah);">${this.esc(r.route)} → HTTP ${r.http}</div>`).join("")
          : ``);
    } catch (e) {
      el.innerHTML = `<div class="empty-state" style="color:var(--warna-merah);">${this.esc(e.message)}</div>`;
    }
  },

  async renderDrift() {
    const el = document.getElementById("devtools-drift-list");
    if (!el) return;
    el.innerHTML = `<div class="empty-state">Memuat drift...</div>`;
    try {
      const d = await this.devtoolsFetch("devtools-drift.json");
      el.innerHTML =
        `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;">` +
        `<div class="stat-tile"><div class="stat-nilai">${d.plan_sections_count}</div><div class="stat-label">Bagian PLAN.md (§5/§6)</div></div>` +
        `<div class="stat-tile"><div class="stat-nilai">${d.registry_fase.length}</div><div class="stat-label">Fase di registry</div></div>` +
        `<div class="stat-tile"><div class="stat-nilai">${d.registry_fitur_count}</div><div class="stat-label">Fitur di registry</div></div>` +
        `<div class="stat-tile"><div class="stat-nilai">${d.hooks_count}</div><div class="stat-label">File hook</div></div>` +
        `<div class="stat-tile"><div class="stat-nilai">${d.js_count}</div><div class="stat-label">File JS frontend</div></div>` +
        `</div><div style="font-size:0.72rem;color:var(--text-muted);margin-top:6px;">${this.esc(d.catatan || "")}</div>`;
    } catch (e) {
      el.innerHTML = `<div class="empty-state" style="color:var(--warna-merah);">${this.esc(e.message)}</div>`;
    }
  },

  async renderInventory() {
    const el = document.getElementById("devtools-inventory-list");
    if (!el) return;
    el.innerHTML = `<div class="empty-state">Memuat inventaris...</div>`;
    try {
      const d = await this.devtoolsFetch("devtools-inventory.json");
      const routes = (d.routes || [])
        .map((r) => `<span class="badge" style="background:var(--bg-input);color:var(--text-sub);font-size:0.68rem;margin:1px;padding:2px 7px;border-radius:10px;">${this.esc(r.method)} ${this.esc(r.route)}</span>`)
        .join("");
      const cols = (d.collections || [])
        .map((c) => `<span class="badge" style="background:var(--warna-utama);color:#fff;font-size:0.68rem;margin:1px;padding:2px 7px;border-radius:10px;">${this.esc(c)}</span>`)
        .join("");
      const js = (d.js_files || [])
        .map((j) => `<span class="badge" style="background:var(--bg-input);color:var(--text-muted);font-size:0.68rem;margin:1px;padding:2px 7px;border-radius:10px;">${this.esc(j.file.split("/").pop())} ${j.kb}KB</span>`)
        .join("");
      el.innerHTML =
        `<div style="font-size:0.8rem;margin-bottom:6px;"><b>${d.routes_count}</b> route hook · <b>${d.collections_count}</b> koleksi · <b>${d.js_count}</b> file JS (${d.js_total_kb}KB total)</div>` +
        `<div style="font-weight:700;font-size:0.78rem;margin:6px 0 3px;">Route API</div>${routes}` +
        `<div style="font-weight:700;font-size:0.78rem;margin:8px 0 3px;">Koleksi Database</div>${cols}` +
        `<div style="font-weight:700;font-size:0.78rem;margin:8px 0 3px;">File JS Frontend</div>${js}`;
    } catch (e) {
      el.innerHTML = `<div class="empty-state" style="color:var(--warna-merah);">${this.esc(e.message)}</div>`;
    }
  },

  async renderReleases() {
    const el = document.getElementById("devtools-releases-list");
    if (!el) return;
    el.innerHTML = `<div class="empty-state">Memuat rilis...</div>`;
    try {
      const d = await this.devtoolsFetch("devtools-releases.json");
      el.innerHTML =
        `<div style="font-size:0.8rem;margin-bottom:6px;">Branch <code>${this.esc(d.branch)}</code> · total <b>${d.total_commits}</b> commit</div>` +
        (d.last_30 || [])
          .map(
            (x) =>
              `<div style="display:flex;justify-content:space-between;padding:5px 8px;border-bottom:1px solid var(--border-color);font-size:0.78rem;">` +
              `<span><code>${this.esc(x.hash)}</code> ${this.esc(x.subject.slice(0, 60))}</span>` +
              `<span style="color:var(--text-muted);">${this.esc(x.date)} · ${x.files_changed} file</span></div>`
          )
          .join("");
    } catch (e) {
      el.innerHTML = `<div class="empty-state" style="color:var(--warna-merah);">${this.esc(e.message)}</div>`;
    }
  },

  // Audit keamanan: secret bocor + versi + paparan file publik
  async renderSecurity() {
    const el = document.getElementById("devtools-security-list");
    if (!el) return;
    el.innerHTML = `<div class="empty-state">Memuat audit keamanan...</div>`;
    try {
      const d = await this.devtoolsFetch("devtools-security.json");
      const clean = d.secret_count === 0;
      el.innerHTML =
        `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;">` +
        `<div class="stat-tile"><div class="stat-nilai" style="color:${clean ? "var(--warna-utama)" : "var(--warna-merah)"};">${d.secret_count}</div><div class="stat-label">Secret bocor (repo)</div></div>` +
        `<div class="stat-tile"><div class="stat-nilai" style="font-size:0.85rem;">${this.esc(d.pocketbase_version.replace("pocketbase version ", ""))}</div><div class="stat-label">PocketBase</div></div>` +
        `<div class="stat-tile"><div class="stat-nilai">${(d.public_json_files || []).length}</div><div class="stat-label">File JSON publik</div></div>` +
        `</div>` +
        `<div style="font-size:0.72rem;color:var(--text-muted);margin-top:6px;">${this.esc(d.catatan_paparan || "")}</div>` +
        ((d.secret_findings || [])
          .map(
            (f) =>
              `<div style="padding:5px 8px;border-bottom:1px solid var(--border-color);font-size:0.78rem;color:var(--warna-merah);"><code>${this.esc(f.file)}</code> — ${this.esc(f.message)}</div>`
          )
          .join("") || `<div style="font-size:0.78rem;color:var(--warna-utama);margin-top:6px;">Tidak ada secret terdeteksi di ${d.tracked_files_checked} file ter-commit.</div>`);
    } catch (e) {
      el.innerHTML = `<div class="empty-state" style="color:var(--warna-merah);">${this.esc(e.message)}</div>`;
    }
  },

  // Feature flag console: baca/tulis konfigurasi modul_aktif (update hanya admin)
  async renderFlags() {
    const el = document.getElementById("devtools-flags-list");
    const note = document.getElementById("devtools-flags-note");
    if (!el) return;
    el.innerHTML = `<div class="empty-state">Memuat modul aktif...</div>`;
    const isAdmin = this.user && this.user.role === "admin";
    if (note) note.innerText = isAdmin ? "Sebagai admin, toggle langsung mengubah konfigurasi modul_aktif." : "Mode baca saja — toggle mengubah hanya untuk admin.";
    try {
      const res = await fetch(`${this.apiBase}/collections/konfigurasi/records?filter=(kunci='modul_aktif')`, { headers: this.getAuthHeaders() });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const rec = (data.items || [])[0];
      let aktif = [];
      if (rec) {
        try { aktif = JSON.parse(rec.nilai); } catch (_) { aktif = rec.nilai || []; }
      }
      el.innerHTML = MODUL_KNOWN.map((m) => {
        const on = aktif.includes(m);
        return (
          `<label style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;border-bottom:1px solid var(--border-color);font-size:0.82rem;">` +
          `<span style="font-family:monospace;">${this.esc(m)}</span>` +
          `<input type="checkbox" data-modul="${this.esc(m)}" ${on ? "checked" : ""} ${isAdmin ? "" : "disabled"} onchange="App.toggleModul(this)">` +
          `</label>`
        );
      }).join("");
      el.dataset.recId = rec ? rec.id : "";
    } catch (e) {
      el.innerHTML = `<div class="empty-state" style="color:var(--warna-merah);">${this.esc(e.message)}</div>`;
    }
  },

  async toggleModul(checkbox) {
    const listEl = document.getElementById("devtools-flags-list");
    const recId = listEl && listEl.dataset.recId;
    const checked = [];
    document.querySelectorAll("#devtools-flags-list input[data-modul]").forEach((i) => {
      if (i.checked) checked.push(i.getAttribute("data-modul"));
    });
    try {
      const res = await fetch(`${this.apiBase}/collections/konfigurasi/records/${recId}`, {
        method: "PATCH",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ nilai: JSON.stringify(checked) }),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Gagal simpan");
      Hero.setExpression("senang", "Modul aktif diperbarui!");
      this.renderFlags();
    } catch (e) {
      alert("Gagal mengubah modul: " + e.message);
      this.renderFlags();
    }
  },
};
