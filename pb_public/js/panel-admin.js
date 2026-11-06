// js/panel-admin.js - Panel Admin Dedicated: Personalisasi Komunitas (atomik).
// Edit record 'komunitas' (first record) — sudah ada koleksi, tidak ada migrasi baru.
// File upload logo (max 500KB) + info pengurus read-only dari unit/jabatan.
// Multi-komunitas (Fase 2): panel ini masih single-komunitas, tapi mengambil
// record pertama sebagai "komunitas aktif" — nanti ganti selector berdasarkan
// komunitas_id user. Data sudah terstruktur sprat per record komunitas.
window.AppModules = window.AppModules || {};

window.AppModules.PanelAdmin = {
  recKomunitas: null,
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

  async init() {
    const form = document.getElementById("form-personalisasi");
    if (!form) return; // hanya di halaman panel-admin.html (standalone)
    this.apiBase = location.pathname.includes("/drg") ? "/drg/api" : "/api";

    const u = this.user;
    const banner = document.getElementById("admin-banner");
    if (!u || !this.token) {
      banner.className = "banner show";
      banner.innerHTML = "⚠️ <b>Belum login.</b> Buka webapp utama, login sebagai admin, lalu kembali ke halaman ini.";
    } else if (u.role !== "admin") {
      banner.className = "banner show";
      banner.innerHTML = "⛔ <b>Hanya admin</b> yang bisa menyimpan personalisasi. Anda login sebagai role <b>" + (u.role || "-") + "</b> (mode baca saja).";
    }

    document.getElementById("btn-muat-ulang").addEventListener("click", () => this.muatSemua());
    form.addEventListener("submit", (e) => { e.preventDefault(); this.simpa(); });
    document.getElementById("f-logo").addEventListener("change", (e) => this.previewLogo(e));
    await this.muatSemua();
  },

  async muatSemua() {
    await this.muatKomunitas();
    await this.muatPengurus();
  },

  async muatKomunitas() {
    try {
      const res = await fetch(this.apiBase + "/collections/komunitas/records?perPage=1");
      const data = await res.json();
      const rec = (data.items || [])[0] || null;
      this.recKomunitas = rec;
      if (!rec) { this.showMsg("Belum ada record komunitas. Hubungi admin teknis.", false); return; }
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ""; };
      set("f-nama", rec.nama); set("f-sapaan", rec.sapaan); set("f-tagline", rec.tagline);
      set("f-nama-hero", rec.nama_hero); set("f-tentang", rec.tentang); set("f-visi-misi", rec.visi_misi);
      set("f-kontak", rec.kontak); set("f-warna-utama", rec.warna_utama); set("f-warna-aksen", rec.warna_aksen);
      set("f-iuran-default", rec.iuran_default);
      const pv = document.getElementById("logo-preview");
      if (rec.logo) {
        const url = this.apiBase + "/files/" + rec.collectionId + "/" + rec.id + "/" + rec.logo;
        pv.innerHTML = '<img src="' + url + '" alt="Logo komunitas">';
      } else pv.textContent = "🛵";
      document.getElementById("footer-meta").textContent =
        "Panel Admin Personalisasi · " + rec.nama + " · terakhir diperbarui " + (rec.updated || "-");
    } catch (e) { this.showMsg("Gagal memuat komunitas: " + e.message, false); }
  },

  previewLogo(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) { this.showMsg("Ukuran file logo maksimal 500KB!", false); e.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = (evt) => { document.getElementById("logo-preview").innerHTML = '<img src="' + evt.target.result + '">'; };
    reader.readAsDataURL(file);
  },

  esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); },

  async muatPengurus() {
    try {
      const h = { headers: this.authHeaders() };
      const [ru, rj] = await Promise.all([
        fetch(this.apiBase + "/collections/unit/records?perPage=30", h),
        fetch(this.apiBase + "/collections/jabatan/records?filter=(aktif=true)&expand=unit,anggota&perPage=30", h),
      ]);
      const du = ru.ok ? await ru.json() : { items: [] };
      const dj = rj.ok ? await rj.json() : { items: [] };
      const units = du.items || [], jabs = dj.items || [];
      const tiles = document.getElementById("pengurus-tiles");
      tiles.innerHTML =
        "<div class='tile'><b>" + units.length + "</b><span>Unit struktur</span></div>" +
        "<div class='tile'><b>" + jabs.length + "</b><span>Jabatan aktif</span></div>";
      const ul = document.getElementById("pengurus-list");
      ul.innerHTML = jabs.length
        ? jabs.map((j) => {
            const unitName = j.expand && j.expand.unit ? j.expand.unit.nama : "-";
            const anggotaName = j.expand && j.expand.anggota ? (j.expand.anggota.nama || j.expand.anggota.email) : "-";
            return "<li><span class='jabatan'>" + this.esc(j.jabatan) + "</span> · " + this.esc(unitName) +
              " — " + this.esc(anggotaName) + "</li>";
          }).join("")
        : "<li>Belum ada jabatan aktif yang ditunjuk.</li>";
    } catch (e) {
      document.getElementById("pengurus-list").innerHTML = "<li>Gagal memuat pengurus: " + this.esc(e.message) + "</li>";
    }
  },

  async simpa() {
    const u = this.user;
    if (!u || !this.token) { this.showMsg("Login dulu sebagai admin di webapp utama.", false); return; }
    if (u.role !== "admin") { this.showMsg("Hanya admin yang bisa menyimpan. Role Anda: " + (u.role || "-"), false); return; }
    if (!this.recKomunitas) { this.showMsg("Record komunitas belum termuat.", false); return; }

    const get = (id) => (document.getElementById(id)?.value || "").trim();
    const nama = get("f-nama");
    if (!nama) { this.showMsg("Nama komunitas tidak boleh kosong!", false); return; }

    const btn = document.getElementById("btn-simpa");
    btn.disabled = true;
    try {
      const logoInput = document.getElementById("f-logo");
      let res;
      if (logoInput.files && logoInput.files.length > 0) {
        const fd = new FormData();
        fd.append("nama", nama); fd.append("sapaan", get("f-sapaan")); fd.append("tagline", get("f-tagline"));
        fd.append("nama_hero", get("f-nama-hero")); fd.append("tentang", get("f-tentang")); fd.append("visi_misi", get("f-visi-misi"));
        fd.append("kontak", get("f-kontak")); fd.append("warna_utama", get("f-warna-utama")); fd.append("warna_aksen", get("f-warna-aksen"));
        fd.append("iuran_default", Number(get("f-iuran-default")) || 0);
        fd.append("logo", logoInput.files[0]);
        res = await fetch(this.apiBase + "/collections/komunitas/records/" + this.recKomunitas.id, {
          method: "PATCH", headers: this.authHeaders(), body: fd,
        });
      } else {
        res = await fetch(this.apiBase + "/collections/komunitas/records/" + this.recKomunitas.id, {
          method: "PATCH", headers: this.authHeaders(true),
          body: JSON.stringify({
            nama, sapaan: get("f-sapaan"), tagline: get("f-tagline"), nama_hero: get("f-nama-hero"),
            tentang: get("f-tentang"), visi_misi: get("f-visi-misi"), kontak: get("f-kontak"),
            warna_utama: get("f-warna-utama"), warna_aksen: get("f-warna-aksen"),
            iuran_default: Number(get("f-iuran-default")) || 0,
          }),
        });
      }
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || "HTTP " + res.status); }
      this.recKomunitas = await res.json();
      logoInput.value = "";
      await this.muatKomunitas();
      this.showMsg("✓ Personalisasi disimpan. Buka webapp utama untuk melihat hasilnya.", true);
    } catch (e) { this.showMsg("Gagal menyimpan: " + e.message, false); }
    finally { btn.disabled = false; }
  },
};

document.addEventListener("DOMContentLoaded", () => window.AppModules.PanelAdmin.init());
