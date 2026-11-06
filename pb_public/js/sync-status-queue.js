// js/sync-status-queue.js - Antrean mutasi & kirim ulang (atomik, <200 baris, lanjutan SyncStatus).
// Perluasan objek yang sama (AppModules.SyncStatus) — bukan modul terpisah —
// agar `this` (state/antrean/tampilkan/bungkus) tetap satu objek seperti sebelumnya.
window.AppModules = window.AppModules || {};
window.AppModules.SyncStatus = window.AppModules.SyncStatus || {};

Object.assign(window.AppModules.SyncStatus, {
  // ── Bungkus fetch: tangkap mutasi gagal jaringan ke antrean ─────────
  bungkusFetch() {
    if (this._wrappedFetch) return;
    this._wrappedFetch = true;
    const self = this;
    const origFetch = window.fetch.bind(window);
    window.fetch = async function (input, init) {
      const url = typeof input === "string" ? input : input && input.url ? input.url : "";
      const method = (init && init.method) || (input && input.method) || "GET";
      const mutasi = /^(POST|PUT|PATCH|DELETE)$/i.test(method) && (/\/collections\//.test(url) || /\/api\//.test(url) || /\/komunitas\//.test(url));
      let res;
      try {
        res = await origFetch(input, init);
      } catch (e) {
        if (mutasi) self.masukAntrean(url, method, init && init.body ? String(init.body) : "");
        throw e;
      }
      if (mutasi && res && res.status >= 500) self.masukAntrean(url, method, init && init.body ? String(init.body) : "");
      return res;
    };
  },

  masukAntrean(url, method, body) {
    const list = this.antrean();
    list.push({ url, method, body, waktu: new Date().toISOString() });
    this.simpanAntrean(list);
    this.tampilkan();
  },

  // ── Kirim ulang antrean (server <- device) ─────────────────────────
  async drainAntrean() {
    const list = this.antrean();
    if (list.length === 0) return;
    let sisa = 0;
    for (const item of list) {
      try {
        const res = await fetch(item.url, {
          method: item.method,
          headers: window.App && App.getAuthHeaders ? App.getAuthHeaders() : { "Content-Type": "application/json" },
          body: item.body || undefined,
        });
        if (!res.ok) sisa++;
      } catch (_) {
        sisa++;
      }
    }
    // simpan hanya yang masih gagal (tetap menunggu)
    this.simpanAntrean(sisa > 0 ? list : []);
    this.tampilkan();
  },

  async syncSekarang() {
    await this.drainAntrean();
    if (window.App && App.refreshData) await App.refreshData();
  },
});
