// js/panel-admin-tambah.js - Buat komunitas baru dari Panel Admin (atomik, standalone).
// Hanya untuk halaman panel-admin.html. Komunitas baru otomatis dapat identitas:
// komunitas_id = PK record (disiapkan via PATCH setelah create), slug dari nama,
// aktif = true. Setelah buat, picker di panel refresh otomatis.
window.AppModules = window.AppModules || {};

window.AppModules.PanelAdminTambah = {
  apiBase: "/api",
  get token() { return localStorage.getItem("pb_token") || ""; },
  get user() { try { return JSON.parse(localStorage.getItem("pb_user") || "null"); } catch (_) { return null; } },

  authHeaders(json) {
    const h = {};
    if (this.token) h["Authorization"] = this.token;
    if (json) h["Content-Type"] = "application/json";
    return h;
  },

  showMsg(tex, ok) {
    const el = document.getElementById("msg");
    el.className = "msg show " + (ok ? "ok" : "err");
    el.textContent = tex;
  },

  // slug identik dgn migrasi 1730000014 (lowercase, non-alphanum jadi '-')
  slugOf(nama) {
    return (nama || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  },

  async buatKomunitasBaru(e) {
    e.preventDefault();
    const u = this.user;
    if (!u || !this.token) { this.showMsg("Login dulu sebagai admin di webapp utama.", false); return; }
    if (u.role !== "admin") { this.showMsg("Hanya admin yang bisa membuat komunitas. Role Anda: " + (u.role || "-"), false); return; }

    const get = (id) => (document.getElementById(id)?.value || "").trim();
    const nama = get("t-nama");
    if (!nama) { this.showMsg("Nama komunitas baru tidak boleh kosong!", false); return; }
    const slug = this.slugOf(nama);
    if (!slug) { this.showMsg("Nama komunitas harus mengandung huruf/angka untuk slug.", false); return; }

    const btn = document.getElementById("btn-buat");
    btn.disabled = true;
    try {
      const res = await fetch(this.apiBase + "/collections/komunitas/records", {
        method: "POST", headers: this.authHeaders(true),
        body: JSON.stringify({
          nama, tagline: get("t-tagline"), sapaan: get("t-sapaan"),
          warna_utama: get("t-warna-utama"), warna_aksen: get("t-warna-aksen"),
          tentang: get("t-tentang"), aktif: true,
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || "HTTP " + res.status); }
      const rec = await res.json();

      // Isi identitas server-side yg belum ada di create: komunitas_id = PK, slug.
      await fetch(this.apiBase + "/collections/komunitas/records/" + rec.id, {
        method: "PATCH", headers: this.authHeaders(true),
        body: JSON.stringify({ komunitas_id: rec.id, slug }),
      });

      ["t-nama", "t-tagline", "t-sapaan", "t-warna-utama", "t-warna-aksen", "t-tentang"].forEach((id) => {
        const el = document.getElementById(id); if (el) el.value = "";
      });
      // Refresh picker di panel utama
      if (window.AppModules.PanelAdmin) await window.AppModules.PanelAdmin.muatKomunitas();
      this.showMsg("✓ Komunitas \"" + nama + "\" dibuat (slug: " + slug + "). Pilih di daftar di atas untuk personalisasi.", true);
    } catch (e) { this.showMsg("Gagal membuat komunitas: " + e.message, false); }
    finally { btn.disabled = false; }
  },

  init() {
    const form = document.getElementById("form-tambah-komunitas");
    if (!form) return; // hanya di panel-admin.html
    this.apiBase = location.pathname.includes("/drg") ? "/drg/api" : "/api";
    form.addEventListener("submit", (e) => this.buatKomunitasBaru(e));
  },
};

document.addEventListener("DOMContentLoaded", () => window.AppModules.PanelAdminTambah.init());
