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
      badge.innerHTML = `
        <span>${this.user.nama || this.user.username}</span>
        <span class="role-pill role-${this.user.role}">${this.user.role}</span>
      `;
    }

    const canManage = this.user.role === "admin" || this.user.role === "bendahara";
    const btnCatat = document.getElementById("btn-open-catat-kas");
    if (btnCatat) btnCatat.style.display = canManage ? "inline-flex" : "none";

    const navAnggota = document.getElementById("nav-btn-anggota");
    if (navAnggota) navAnggota.style.display = (this.user.role === "admin") ? "flex" : "none";

    const setupSection = document.getElementById("admin-setup-komunitas-section");
    if (setupSection) setupSection.style.display = (this.user.role === "admin") ? "block" : "none";

    this.switchTab("markas");
    Hero.setExpression("senang", Teks.hero.welcome_dash);
    if (this.loadDashPanitiaBanner) this.loadDashPanitiaBanner();
  },

  async login(identity, password) {
    try {
      Hero.setExpression("berpikir", Teks.hero.loading);
      const res = await fetch(`${this.apiBase}/collections/users/auth-with-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity, password })
      });

      if (!res.ok) {
        Hero.setExpression("waspada", Teks.hero.fail_login);
        alert("Gagal masuk pangkalan: Cek email/username dan password kamu bro!");
        return false;
      }

      const data = await res.json();
      if (data.record.status !== "aktif") {
        Hero.setExpression("waspada", "Akun kamu masih dalam antrean verifikasi atau nonaktif!");
        alert("Akun kamu berstatus " + data.record.status + ". Silakan hubungi pengurus basecamp!");
        return false;
      }

      this.token = data.token;
      this.user = data.record;
      localStorage.setItem("pb_token", this.token);
      localStorage.setItem("pb_user", JSON.stringify(this.user));

      this.showAppView();
      await this.refreshData();
      return true;
    } catch (err) {
      console.error(err);
      Hero.setExpression("waspada", "Waduh, koneksi ke basecamp error nih.");
      alert("Terjadi kendala jaringan saat menghubungkan ke server.");
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
      if (this.user) {
        await fetch(`${this.apiBase}/collections/users/records/${this.user.id}`, {
          method: "PATCH",
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            tokenKey: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
          })
        });
      }
    } catch (e) {
      console.warn("Could not invalidate remote tokenKey", e);
    }
    this.logout();
    alert("Kamu telah keluar dari semua perangkat.");
  }
};
