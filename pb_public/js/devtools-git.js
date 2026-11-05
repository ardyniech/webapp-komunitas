// js/devtools-git.js - Tampilan Git watcher (status kotor + commit per direktori).
window.AppModules = window.AppModules || {};

window.AppModules.DevToolsGit = {
  async renderGit() {
    const el = document.getElementById("devtools-git-list");
    if (!el) return;
    el.innerHTML = `<div class="empty-state">Memuat status git...</div>`;
    try {
      const d = await this.devtoolsFetch("devtools-git.json");
      const dirtyRows = (d.dirty || [])
        .map(
          (x) =>
            `<div style="display:flex;justify-content:space-between;padding:5px 8px;border-bottom:1px solid var(--border-color);font-size:0.78rem;">` +
            `<span style="font-family:monospace;">${this.esc(x.file)}</span>` +
            `<span style="color:var(--warna-aksen);font-weight:700;">${this.esc(x.code)}</span></div>`
        )
        .join("");
      const dirRows = (d.last_commit_per_dir || [])
        .map(
          (x) =>
            `<div style="display:flex;justify-content:space-between;padding:5px 8px;border-bottom:1px solid var(--border-color);font-size:0.78rem;">` +
            `<span style="font-family:monospace;">${this.esc(x.dir)}</span>` +
            `<span><code>${this.esc(x.hash)}</code> ${this.esc(x.subject.slice(0, 48))}</span></div>`
        )
        .join("");
      const recentRows = (d.recent || [])
        .map(
          (x) =>
            `<div style="display:flex;justify-content:space-between;padding:5px 8px;border-bottom:1px solid var(--border-color);font-size:0.78rem;">` +
            `<span><code>${this.esc(x.hash)}</code> ${this.esc(x.subject.slice(0, 60))}</span>` +
            `<span style="color:var(--text-muted);">${this.esc(x.date)}</span></div>`
        )
        .join("");
      el.innerHTML =
        `<div style="font-size:0.8rem;margin-bottom:8px;">Branch <code>${this.esc(d.branch)}</code> · ` +
        `<b>${d.dirty_count}</b> file kotor (uncommitted) · ${this.esc(d.generated_at)}</div>` +
        `<div style="font-weight:700;font-size:0.78rem;margin:8px 0 4px;">File kotor (waspada konflik antar-agen)</div>` +
        (dirtyRows || `<div class="empty-state">Bersih. Tidak ada perubahan belum commit.</div>`) +
        `<div style="font-weight:700;font-size:0.78rem;margin:10px 0 4px;">Commit terakhir per direktori</div>` +
        dirRows +
        `<div style="font-weight:700;font-size:0.78rem;margin:10px 0 4px;">5 commit terakhir</div>` +
        recentRows;
    } catch (e) {
      el.innerHTML = `<div class="empty-state" style="color:var(--warna-merah);">Gagal memuat data git: ${this.esc(e.message)}</div>`;
    }
  },
};
