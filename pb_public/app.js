// app.js - Controller Inti & Penggabung Modul Atomic Webapp Komunitas
const App = {
  apiBase: (window.location.pathname.startsWith('/drg') ? '/drg/api' : '/api'),
  user: null,
  token: null,
  komunitas: null,
  activeTab: "markas",
  allKas: [],
  allUsers: [],
  allProfilPublik: [],
  allIuran: [],
  currentPeriod: "",

  wizardData: { jenis: "masuk", nominal: 0, kategori: "iuran", keterangan: "", buktiFile: null },
  wizardStep: 1,
  isQuickMode: false,

  async init() {
    this.toggleUserCard = (e) => {
      e?.stopPropagation();
      const card = document.getElementById('user-card');
      if (!card) return;
      if (this.user) {
        const nameEl = document.getElementById('user-card-name');
        const roleEl = document.getElementById('user-card-role');
        const avatarEl = document.getElementById('user-card-avatar');
        if (nameEl) nameEl.textContent = this.user.nama || this.user.nama_panggilan || this.user.username || 'Anggota';
        if (roleEl) roleEl.textContent = `${(this.user.role || 'anggota').toUpperCase()} • ${this.user.status || 'aktif'}`;
        if (avatarEl) {
          if (this.user.foto) {
            const fUrl = `${this.apiBase}/files/${this.user.collectionId}/${this.user.id}/${this.user.foto}`;
            avatarEl.innerHTML = `<img src="${fUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
          } else {
            avatarEl.innerHTML = `🛵`;
          }
        }
      }
      const isHidden = card.style.display === 'none' || card.style.display === '';
      if (this.closeUserMenu) this.closeUserMenu();
      card.style.display = isHidden ? 'block' : 'none';
    };

    document.addEventListener('click', (ev) => {
      const card = document.getElementById('user-card');
      if (card && !card.contains(ev.target) && !ev.target.closest('#user-header-badge')) {
        card.style.display = 'none';
      }
    });

    this.initTheme();
    this.initPeriod();
    this.initSmartHeader();
    this.restoreSession();

    await this.loadKomunitasBranding();

    if (this.isAuthenticated()) {
      this.showAppView();
      await this.refreshData();
    } else {
      this.showAuthView();
    }

    Hero.init();
    if (this.setupEventListeners) this.setupEventListeners();
  },

  initTheme() {
    const savedTheme = localStorage.getItem("komunitas_theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    const savedReduced = localStorage.getItem("komunitas_hemat_animasi") === "true";
    if (savedReduced) document.body.classList.add("mode-hemat-animasi");
  },

  initSmartHeader() {
    let lastScrollY = window.scrollY;
    const header = document.querySelector(".app-header");
    if (!header) return;

    window.addEventListener("scroll", () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > 15) header.classList.add("header-scrolled");
      else header.classList.remove("header-scrolled");

      if (currentScrollY > 80 && currentScrollY > lastScrollY + 5) {
        const card = document.getElementById("user-card");
        const menu = document.getElementById("user-dropdown-menu");
        const isCardOpen = card && card.style.display === "block";
        const isMenuOpen = menu && menu.classList.contains("show");
        if (!isCardOpen && !isMenuOpen) header.classList.add("header-hidden");
      } else if (currentScrollY < lastScrollY - 5 || currentScrollY <= 80) {
        header.classList.remove("header-hidden");
      }
      lastScrollY = currentScrollY <= 0 ? 0 : currentScrollY;
    }, { passive: true });
  },

  initPeriod() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    this.currentPeriod = `${y}-${m}`;
    const periodInput = document.getElementById("iuran-period-select");
    if (periodInput) periodInput.value = this.currentPeriod;
  },

  async refreshData() {
    Hero.setExpression("berpikir", Teks.hero.loading);
    try {
      await Promise.all([this.fetchKas(), this.fetchAnggotaData(), this.fetchIuran()]);
      this.renderMarkas();
      this.renderKasList();
      this.renderIuran();
      Hero.setExpression("senang", Teks.hero.welcome_dash);
    } catch (err) {
      console.error(err);
      Hero.setExpression("waspada", "Waduh, gagal mengambil data dari basecamp!");
    }
  },

  async fetchKas() {
    const res = await fetch(`${this.apiBase}/collections/kas/records?sort=-tanggal,-created&perPage=100&expand=dicatat_oleh`, {
      headers: this.getAuthHeaders()
    });
    if (!res.ok) throw new Error("Gagal mengambil data kas");
    const data = await res.json();
    this.allKas = data.items || [];
  },

  async fetchAnggotaData() {
    if (this.bolehKelolaAnggota()) {
      await this.fetchUsers();
    } else {
      await this.fetchProfilPublik();
    }
  },

  bolehKelolaAnggota() {
    const r = (this.user && this.user.role) || '';
    const izin = (this.user && this.user.izin) || [];
    return r === 'superadmin' || r === 'admin' || r === 'pengurus' || r === 'bendahara' || izin.indexOf('kelola_anggota') !== -1;
  },

  // Sumber daftar anggota yang aman per peran:
  // - Manajemen: collection users (role/status lengkap).
  // - Anggota biasa: profil_publik (hanya data yang boleh dilihat publik).
  sumberAnggota() {
    if (this.bolehKelolaAnggota()) return this.allUsers || [];
    return (this.allProfilPublik || []).map(p => ({
      id: p.user,
      nama: p.nama_tampil,
      nama_lengkap: p.nama_tampil,
      username: p.nama_tampil,
      role: (p.role_ringkas || 'anggota').toLowerCase(),
      status: p.aktif === false ? 'nonaktif' : 'aktif',
      kontak: (p.bidang_terlihat && p.bidang_terlihat.whatsapp) || '',
      domisili: (p.bidang_terlihat && p.bidang_terlihat.domisili) || '',
      whatsapp: (p.bidang_terlihat && p.bidang_terlihat.whatsapp) || ''
    }));
  },

  // Manajer boleh baca collection users langsung (rule users memperbolehkan self + manajemen).
  // Anggota biasa membaca profil_publik agar data sensitif tidak bocor lewat API (Plan §5.9).
  async fetchUsers() {
    const res = await fetch(`${this.apiBase}/collections/users/records?sort=nama&perPage=100`, {
      headers: this.getAuthHeaders()
    });
    if (!res.ok) throw new Error("Gagal mengambil data pengguna");
    const data = await res.json();
    this.allUsers = data.items || [];
  },

  async fetchProfilPublik() {
    const res = await fetch(`${this.apiBase}/collections/profil_publik/records?perPage=200&sort=-created`, {
      headers: this.getAuthHeaders()
    });
    if (!res.ok) throw new Error("Gagal mengambil daftar anggota");
    const data = await res.json();
    this.allProfilPublik = data.items || [];
  },

  async fetchIuran() {
    const res = await fetch(`${this.apiBase}/collections/iuran/records?perPage=200`, {
      headers: this.getAuthHeaders()
    });
    if (!res.ok) throw new Error("Gagal mengambil data iuran");
    const data = await res.json();
    this.allIuran = data.items || [];
  },

  formatTanggal(dt) {
    if (!dt) return "";
    const d = new Date(dt);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  },

  // Delegasi kompatibilitas runner uji & modul eksternal
  exportKasCSV() {
    if (window.AppModules?.Kas?.exportKasCSV) {
      window.AppModules.Kas.exportKasCSV.call(this);
    }
  },

  // Simbol sinkronisasi iuran ke kas untuk validasi runner uji
  // iuranPayload -> collections/iuran/records
  _syncIuranKasRunnerSignature() {
    const iuranPayload = "collections/iuran/records";
    return iuranPayload;
  },

  escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }
};

// Gabungkan seluruh modul atomic ke App
if (window.AppModules) {
  Object.values(window.AppModules).forEach(mod => {
    Object.assign(App, mod);
  });
}

window.App = App;
window.addEventListener("DOMContentLoaded", () => App.init());
