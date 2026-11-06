// js/core-events.js - Submodul Event Listener & Navigasi Tab
window.AppModules = window.AppModules || {};

window.AppModules.CoreEvents = {
  toggleUserMenu(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById("user-dropdown-menu");
    if (menu) menu.classList.toggle("show");
  },

  closeUserMenu() {
    const menu = document.getElementById("user-dropdown-menu");
    if (menu) menu.classList.remove("show");
  },

  switchAuthTab(tab) {
    const tabs = ["login", "daftar", "status"];
    tabs.forEach(t => {
      const btn = document.getElementById(`btn-auth-tab-${t}`);
      const panel = document.getElementById(`auth-panel-${t}`);
      if (btn) btn.classList.toggle("active", t === tab);
      if (panel) panel.style.display = (t === tab) ? "block" : "none";
    });

    if (tab === "login") Hero.setExpression("menyapa", Teks.hero.welcome_login);
    else if (tab === "daftar") Hero.setExpression("senang", "Yuk gabung keluarga basecamp ojol kita bro! Isi data dengan jujur ya.");
    else if (tab === "status") Hero.setExpression("menjelaskan", "Masukkan kode registrasi kamu (contoh: REG-ABC123) buat cek status verifikasi.");
  },

  switchTab(tabName) {
    // Dev Tools & Bug Hunter khusus superadmin (data sensitif internal)
    const role = (this.user && this.user.role) || "";
    if ((tabName === "devtools" || tabName === "bug-hunter") && role !== "superadmin") {
      alert("Halaman ini khusus superadmin.");
      return;
    }
    // Role & Manajemen khusus admin/superadmin (seperti kas hanya bendahara)
    if (tabName === "role" && role !== "admin" && role !== "superadmin") {
      alert("Halaman ini khusus admin/superadmin.");
      return;
    }
    this.activeTab = tabName;
    document.querySelectorAll(".view-panel").forEach(p => p.classList.remove("active"));
    const activePanel = document.getElementById(`panel-${tabName}`);
    if (activePanel) activePanel.classList.add("active");

    document.querySelectorAll(".nav-item").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });

    const exprs = {
      markas: ["senang", "Cek saldo kas basecamp kita hari ini bro!"],
      kas: ["menjelaskan", "Semua riwayat kas terbuka dan nggak bisa diutak-atik."],
      iuran: ["waspada", "Yuk pantau siapa aja yang udah isi bensin pangkalan!"],
      progres: ["senang", "Pantau progres fitur dan hasil uji sistem kita!"],
      profil: ["menjelaskan", "Pastikan profil kamu lengkap biar gampang koordinasi!"],
      anggota: ["menjelaskan", "Kelola daftar kawan pangkalan dan verifikasi pendaftaran baru."],
      struktur: ["menjelaskan", "Bagan kepengurusan basecamp dan kontak unit tugas kita."],
      aturan: ["waspada", "Aturan pangkalan dibuat bersama demi ketertiban kita satu aspal."],
      event: ["senang", "Pantau kegiatan basecamp, panitia, dan peta dana yang transparan."],
      pengumuman: ["menjelaskan", "Cek info terbaru dari pengurus basecamp bro!"],
      forum: ["senang", "Ngobrol seru bareng kawan-kawan pangkalan!"],
      panduan: ["menjelaskan", "Ada masalah? Cari panduan dulu sebelum nanya ya bro."],
      polling: ["waspada", "Suara kamu penting! Ikut polling sebelum batas waktu ya."],
      agenda: ["menjelaskan", "Pantau jadwal kumpul dan notulen rapat basecamp."],
      pengaduan: ["waspada", "Laporan kamu aman. Dewan Etik yang menangani dengan serius."],
      kuesioner: ["menjelaskan", "Uji pemahaman aturan basecamp. Santai aja bro, yang penting jujur."],
      dokumen: ["menjelaskan", "Berkas AD/ART, SK, dan template formulir basecamp kita."]
    };

    if (exprs[tabName]) Hero.setExpression(exprs[tabName][0], exprs[tabName][1]);

    if (tabName === "progres" && this.loadProgres) this.loadProgres();
    else if (tabName === "profil" && this.renderProfil) this.renderProfil();
    else if (tabName === "anggota" && this.renderAnggota) this.renderAnggota();
    else if (tabName === "struktur" && this.loadStruktur) this.loadStruktur();
    else if (tabName === "aturan" && this.loadAturan) this.loadAturan();
    else if (tabName === "event" && this.loadEvents) this.loadEvents();
    else if (tabName === "pengumuman" && this.loadPengumuman) this.loadPengumuman();
    else if (tabName === "forum" && this.loadForum) this.loadForum();
    else if (tabName === "panduan" && this.loadPanduan) this.loadPanduan();
    else if (tabName === "polling" && this.loadPolling) this.loadPolling();
    else if (tabName === "agenda" && this.loadAgenda) this.loadAgenda();
    else if (tabName === "pengaduan" && this.initPengaduanTab) this.initPengaduanTab();
    else if (tabName === "kuesioner" && this.loadKuesioner) this.loadKuesioner();
    else if (tabName === "dokumen" && this.loadDokumen) this.loadDokumen();
    else if (tabName === "devtools" && this.devtoolsLoadAll) this.devtoolsLoadAll();
  else if (tabName === "role" && this.renderRole) this.renderRole();
    else if (tabName === "bug-hunter" && this.loadScanBugs) {
      this.loadScanBugs();
    } else if (tabName === "bug-hunter") {
      const listEl = document.getElementById("bug-hunter-list");
      if (listEl) listEl.innerHTML = `<div class="empty-state" style="color:var(--warna-merah);">Modul scan belum siap. Silakan muat ulang halaman (Ctrl+F5) dan coba lagi.</div>`;
    }
  },

  setupEventListeners() {
    // Navigation Buttons (Menu Bawah)
    document.querySelectorAll(".nav-item").forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        if (tab) this.switchTab(tab);
      });
    });

    const loginForm = document.getElementById("login-form");
    if (loginForm) {
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = document.getElementById("login-identity").value.trim();
        const pass = document.getElementById("login-password").value;
        await this.login(id, pass);
      });
    }

    const periodInput = document.getElementById("iuran-period-select");
    if (periodInput) {
      periodInput.addEventListener("change", (e) => {
        this.currentPeriod = e.target.value;
        this.renderIuran();
      });
    }

    const filterJenis = document.getElementById("filter-kas-jenis");
    const filterSearch = document.getElementById("filter-kas-search");
    if (filterJenis) filterJenis.addEventListener("change", () => this.renderKasList());
    if (filterSearch) filterSearch.addEventListener("input", () => this.renderKasList());

    const toggleHero = document.getElementById("toggle-sembunyikan-hero");
    if (toggleHero) {
      toggleHero.checked = !Hero.isVisible;
      toggleHero.addEventListener("change", (e) => Hero.toggleVisibility(!e.target.checked));
    }

    const toggleTheme = document.getElementById("toggle-mode-terang");
    if (toggleTheme) {
      toggleTheme.checked = document.documentElement.getAttribute("data-theme") === "light";
      toggleTheme.addEventListener("change", (e) => {
        const theme = e.target.checked ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("komunitas_theme", theme);
      });
    }

    const toggleAnim = document.getElementById("toggle-hemat-animasi");
    if (toggleAnim) {
      toggleAnim.checked = document.body.classList.contains("mode-hemat-animasi");
      toggleAnim.addEventListener("change", (e) => {
        if (e.target.checked) document.body.classList.add("mode-hemat-animasi");
        else document.body.classList.remove("mode-hemat-animasi");
        localStorage.setItem("komunitas_hemat_animasi", e.target.checked.toString());
      });
    }

    document.addEventListener("click", (e) => {
      if (!e.target.closest("#user-dropdown-menu") && !e.target.closest("#user-header-badge")) {
        this.closeUserMenu();
      }
    });
  }
};
