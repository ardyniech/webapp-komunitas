// js/auth.js - Modul Autentikasi, Sesi, dan Hak Akses Pengguna
window.AppModules = window.AppModules || {};

window.AppModules.Auth = {
  restoreSession() {
    const savedToken = localStorage.getItem("pb_token");
    const savedUser = localStorage.getItem("pb_user");
    if (savedToken && savedUser) {
      try {
        this.token = savedToken;
        this.user = JSON.parse(savedUser);
      } catch (e) {
        this.clearSession();
      }
    }
  },

  clearSession() {
    this.token = null;
    this.user = null;
    localStorage.removeItem("pb_token");
    localStorage.removeItem("pb_user");
  },

  isAuthenticated() {
    return !!(this.token && this.user);
  },

  getAuthHeaders(isFormData = false) {
    const headers = {};
    if (this.token) headers["Authorization"] = this.token;
    if (!isFormData) headers["Content-Type"] = "application/json";
    return headers;
  },

  showAuthView() {
    document.getElementById("auth-view").style.display = "block";
    document.getElementById("app-view").style.display = "none";
    document.getElementById("bottom-nav").style.display = "none";
    Hero.setExpression("menyapa", Teks.hero.welcome_login);
  },

  showAppView() {
    document.getElementById("auth-view").style.display = "none";
    document.getElementById("app-view").style.display = "block";
    document.getElementById("bottom-nav").style.display = "flex";

    const badge = document.getElementById("user-header-badge");
    if (badge && this.user) {
      const fotoHtml = this.user.foto
        ? `<img src="${this.apiBase}/files/${this.user.collectionId}/${this.user.id}/${this.user.foto}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;" alt="foto">`
        : `<span style="font-size:15px;">🛵</span>`;
      badge.innerHTML = `
        ${fotoHtml}
        <span>${this.user.nama || this.user.nama_panggilan || this.user.username}</span>
        <span class="role-pill role-${this.user.role}">${this.user.role}</span>
      `;
    }

    const canManage = this.user.role === "admin" || this.user.role === "bendahara";
    const btnCatat = document.getElementById("btn-open-catat-kas");
    if (btnCatat) btnCatat.style.display = canManage ? "inline-flex" : "none";

    const navAnggota = document.getElementById("nav-btn-anggota");
    if (navAnggota) navAnggota.style.display = this.isAuthenticated() ? "flex" : "none";

    // Dev Tools & Bug Hunter: khusus superadmin (data sensitif internal)
    const isSuper = this.user && this.user.role === "superadmin";
    document.querySelectorAll('.nav-item[data-tab="admin-tools"]').forEach((btn) => {
      btn.style.display = isSuper ? "flex" : "none";
    });
    // Role & Manajemen: khusus admin/superadmin
    const isAdmin = this.user && (this.user.role === "admin" || this.user.role === "superadmin");
    const navRole = document.getElementById("nav-btn-role");
    if (navRole) navRole.style.display = isAdmin ? "flex" : "none";
    document.querySelectorAll(".dropdown-item").forEach((btn) => {
      const oc = btn.getAttribute("onclick") || "";
      if (/switchTab\('(admin-tools|bug-hunter)'\)/.test(oc)) btn.style.display = isSuper ? "" : "none";
    });
    const panelProgres = document.getElementById("panel-progres");
    const panelBugHunter = document.getElementById("panel-bug-hunter");
    const panelDevTools = document.getElementById("panel-devtools");
    if (panelProgres) panelProgres.style.display = isSuper ? "" : "none";
    if (panelBugHunter) panelBugHunter.style.display = isSuper ? "" : "none";
    if (panelDevTools) panelDevTools.style.display = isSuper ? "" : "none";

    const setupSection = document.getElementById("admin-setup-komunitas-section");
    if (setupSection) setupSection.style.display = (this.user.role === "admin") ? "block" : "none";

    this.switchTab("markas");
    Hero.setExpression("senang", Teks.hero.welcome_dash);
    if (this.loadDashPanitiaBanner) this.loadDashPanitiaBanner();
  },

  async login(identity, password) {
    const btnLogin = document.getElementById("btn-login-submit");
    try {
      Hero.setExpression("berpikir", "Menghubungi server basecamp...");
      if (btnLogin) { btnLogin.disabled = true; btnLogin.innerHTML = "⏳ Menghubungi server..."; }
      const res = await fetch(`${this.apiBase}/collections/users/auth-with-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity, password })
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        let serverMsg = "";
        try { serverMsg = (JSON.parse(errText).message || ""); } catch (_) {}
        Hero.setExpression("waspada", Teks.hero.fail_login);
        // Tampilkan pesan server bila ada (mis. akun menunggu/ditolak) — bukan tuduhan jaringan
        alert("Gagal masuk pangkalan: " + (serverMsg || "Cek email dan password kamu bro!"));
        if (btnLogin) { btnLogin.disabled = false; btnLogin.innerHTML = "🛵 Masuk Basecamp"; }
        return false;
      }

      const data = await res.json();
      if (data.record.status !== "aktif") {
        Hero.setExpression("waspada", "Akun kamu masih dalam antrean verifikasi atau nonaktif!");
        alert("Akun kamu berstatus " + data.record.status + ". Silakan hubungi pengurus basecamp!");
        if (btnLogin) { btnLogin.disabled = false; btnLogin.innerHTML = "🛵 Masuk Basecamp"; }
        return false;
      }

      this.token = data.token;
      this.user = data.record;
      localStorage.setItem("pb_token", this.token);
      localStorage.setItem("pb_user", JSON.stringify(this.user));

      // LOGIN SUKSES — jangan diam. Tampilkan proses memuat data secara jujur,
      // lalu masuk dashboard hanya setelah data pertama selesai ditarik.
      Hero.setExpression("senang", "Login berhasil! Memuat data basecamp kamu — tunggu bar sinkron di atas selesai ya.");
      this.showAppView();
      await this.refreshData();
      Hero.setExpression("senang", "Halo, " + (this.user.nama || this.user.nama_panggilan || "anggota") + "! Kamu sudah masuk basecamp.");
      if (btnLogin) { btnLogin.disabled = false; btnLogin.innerHTML = "🛵 Masuk Basecamp"; }
      return true;
    } catch (err) {
      console.error(err);
      // Network error sejati (fetch melempar TypeError) vs timeout server lambat
      const network = err instanceof TypeError || /network|fetch|failed/i.test(String(err && err.message));
      Hero.setExpression("waspada", network ? "Koneksi ke server putus/pelan. Pastikan WiFi/data menyala, lalu coba lagi." : "Terjadi kesalahan saat menghubungkan ke server.");
      alert(network
        ? "Koneksi ke server gagal/terputus.\n\nPastikan WiFi/data menyala, lalu tekan masuk lagi.\nLogin BELUM berhasil (tidak ada sesi tersimpan)."
        : "Gagal menghubungi server: " + (err.message || err));
      if (btnLogin) { btnLogin.disabled = false; btnLogin.innerHTML = "🛵 Masuk Basecamp"; }
      return false;
    }
  },

  logout() {
    this.clearSession();
    this.showAuthView();
    Hero.setExpression("menyapa", "Sampai jumpa di jalanan bro, hati-hati nariknya!");
  },

  async logoutAllDevices() {
    if (!confirm("Apakah kamu yakin ingin keluar dari semua perangkat? Sesi login di perangkat lain akan dicabut.")) {
      return;
    }
    try {
      Hero.setExpression("berpikir", "Mencabut seluruh sesi login...");
      // Pakai route hook terpadu, bukan PATCH tokenKey langsung dari klien (Plan §5.9).
      const res = await fetch(`${this.apiBase}/komunitas/logout-all`, {
        method: "POST",
        headers: this.getAuthHeaders()
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal mencabut sesi.");
      }
    } catch (e) {
      console.warn("Gagal logout-all via server:", e);
    }
    this.logout();
    alert("Kamu telah keluar dari semua perangkat.");
  }
};
