// app.js - Logika Inti Webapp Komunitas Ojol & Kas Transparan
const App = {
  apiBase: (window.location.pathname.startsWith('/drg') ? '/drg/api' : '/api'),
  user: null,
  token: null,
  komunitas: null,
  activeTab: "markas",
  allKas: [],
  allUsers: [],
  allIuran: [],
  currentPeriod: "",

  // Wizard State
  wizardData: {
    jenis: "masuk",
    nominal: 0,
    kategori: "iuran",
    keterangan: "",
    buktiFile: null
  },
  wizardStep: 1,
  isQuickMode: false,

  async init() {
    this.initTheme();
    this.initPeriod();
    this.restoreSession();

    await this.loadKomunitasBranding();

    if (this.isAuthenticated()) {
      this.showAppView();
      await this.refreshData();
    } else {
      this.showAuthView();
    }

    Hero.init();
    this.setupEventListeners();
  },

  initTheme() {
    const savedTheme = localStorage.getItem("komunitas_theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);

    const savedReduced = localStorage.getItem("komunitas_hemat_animasi") === "true";
    if (savedReduced) document.body.classList.add("mode-hemat-animasi");
  },

  initPeriod() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    this.currentPeriod = `${y}-${m}`;
    const periodInput = document.getElementById("iuran-period-select");
    if (periodInput) periodInput.value = this.currentPeriod;
  },

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

  async loadKomunitasBranding() {
    try {
      const res = await fetch(`${this.apiBase}/collections/komunitas/records?perPage=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          this.komunitas = data.items[0];
          Teks.init(this.komunitas);

          // Update CSS Variables
          if (this.komunitas.warna_utama) {
            document.documentElement.style.setProperty("--warna-utama", this.komunitas.warna_utama);
          }
          if (this.komunitas.warna_aksen) {
            document.documentElement.style.setProperty("--warna-aksen", this.komunitas.warna_aksen);
          }

          // Update Brand Elements
          document.querySelectorAll(".brand-name-text").forEach(el => el.innerText = this.komunitas.nama);
          document.querySelectorAll(".brand-tagline-text").forEach(el => el.innerText = this.komunitas.tagline);
        }
      }
    } catch (e) {
      console.warn("Could not load komunitas branding", e);
    }
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

    // Update user header badge
    const badge = document.getElementById("user-header-badge");
    if (badge && this.user) {
      badge.innerHTML = `
        <span>${this.user.nama || this.user.username}</span>
        <span class="role-pill role-${this.user.role}">${this.user.role}</span>
      `;
    }

    // Role-based visibility
    const canManage = this.user.role === "admin" || this.user.role === "bendahara";
    const btnCatat = document.getElementById("btn-open-catat-kas");
    if (btnCatat) btnCatat.style.display = canManage ? "inline-flex" : "none";

    const navAnggota = document.getElementById("nav-btn-anggota");
    if (navAnggota) navAnggota.style.display = (this.user.role === "admin") ? "flex" : "none";

    this.switchTab("markas");
    Hero.setExpression("senang", Teks.hero.welcome_dash);
  },

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

    if (tab === "login") {
      Hero.setExpression("menyapa", Teks.hero.welcome_login);
    } else if (tab === "daftar") {
      Hero.setExpression("senang", "Yuk gabung keluarga basecamp ojol kita bro! Isi data dengan jujur ya.");
    } else if (tab === "status") {
      Hero.setExpression("menjelaskan", "Masukkan kode registrasi kamu (contoh: REG-ABC123) buat cek status verifikasi.");
    }
  },

  switchTab(tabName) {
    this.activeTab = tabName;
    document.querySelectorAll(".view-panel").forEach(p => p.classList.remove("active"));
    const activePanel = document.getElementById(`panel-${tabName}`);
    if (activePanel) activePanel.classList.add("active");

    document.querySelectorAll(".nav-item").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });

    if (tabName === "markas") {
      Hero.setExpression("senang", "Cek saldo kas basecamp kita hari ini bro!");
    } else if (tabName === "kas") {
      Hero.setExpression("menjelaskan", "Semua riwayat kas terbuka dan nggak bisa diutak-atik.");
    } else if (tabName === "iuran") {
      Hero.setExpression("waspada", "Yuk pantau siapa aja yang udah isi bensin pangkalan!");
    } else if (tabName === "progres") {
      Hero.setExpression("senang", "Pantau progres fitur dan hasil uji sistem kita!");
      this.loadProgres();
    } else if (tabName === "profil") {
      Hero.setExpression("menjelaskan", "Pastikan profil kamu lengkap biar gampang koordinasi!");
      this.renderProfil();
    } else if (tabName === "anggota") {
      Hero.setExpression("menjelaskan", "Kelola daftar kawan pangkalan dan verifikasi pendaftaran baru.");
      this.renderAnggota();
    } else if (tabName === "struktur") {
      Hero.setExpression("menjelaskan", "Bagan kepengurusan basecamp dan kontak unit tugas kita.");
      this.loadStruktur();
    } else if (tabName === "aturan") {
      Hero.setExpression("waspada", "Aturan pangkalan dibuat bersama demi ketertiban kita satu aspal.");
      this.loadAturan();
    } else if (tabName === "event") {
      Hero.setExpression("senang", "Pantau kegiatan basecamp, panitia, dan peta dana yang transparan.");
      this.loadEvents();
    } else if (tabName === "pengumuman") {
      Hero.setExpression("menjelaskan", "Cek info terbaru dari pengurus basecamp bro!");
      this.loadPengumuman();
    } else if (tabName === "forum") {
      Hero.setExpression("senang", "Ngobrol seru bareng kawan-kawan pangkalan!");
      this.loadForum();
    } else if (tabName === "panduan") {
      Hero.setExpression("menjelaskan", "Ada masalah? Cari panduan dulu sebelum nanya ya bro.");
      this.loadPanduan();
    } else if (tabName === "polling") {
      Hero.setExpression("waspada", "Suara kamu penting! Ikut polling sebelum batas waktu ya.");
      this.loadPolling();
    } else if (tabName === "agenda") {
      Hero.setExpression("menjelaskan", "Pantau jadwal kumpul dan notulen rapat basecamp.");
      this.loadAgenda();
    } else if (tabName === "pengaduan") {
      Hero.setExpression("waspada", "Laporan kamu aman. Dewan Etik yang menangani dengan serius.");
      this.initPengaduanTab();
    } else if (tabName === "kuesioner") {
      Hero.setExpression("menjelaskan", "Uji pemahaman aturan basecamp. Santai aja bro, yang penting jujur.");
      this.loadKuesioner();
    } else if (tabName === "dokumen") {
      Hero.setExpression("menjelaskan", "Berkas AD/ART, SK, dan template formulir basecamp kita.");
      this.loadDokumen();
    }
  },

  async login(identity, password) {
    try {
      Hero.setExpression("berpikir", Teks.hero.loading);

      let identityPayload = identity.trim();
      if (/^[0-9+]+$/.test(identityPayload)) {
        const cleanDigits = identityPayload.replace(/[^0-9]/g, "");
        identityPayload = `${cleanDigits}@komunitas.local`;
      }

      const res = await fetch(`${this.apiBase}/collections/users/auth-with-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity: identityPayload, password })
      });

      const data = await res.json();
      if (!res.ok) {
        Hero.setExpression("waspada", data.message || Teks.hero.error_auth);
        alert(data.message || "Gagal masuk basecamp. Cek akun atau password!");
        return;
      }

      this.token = data.token;
      this.user = data.record;
      localStorage.setItem("pb_token", this.token);
      localStorage.setItem("pb_user", JSON.stringify(this.user));

      this.showAppView();
      await this.refreshData();
    } catch (e) {
      console.error(e);
      Hero.setExpression("waspada", "Gagal terhubung ke server basecamp.");
    }
  },

  logout() {
    this.clearSession();
    this.showAuthView();
  },

  async refreshData() {
    await Promise.all([
      this.fetchKas(),
      this.fetchUsers(),
      this.fetchIuran()
    ]);
    this.renderMarkas();
    this.renderKasList();
    this.renderIuran();
    if (this.user.role === "admin") this.renderAnggota();
    // Load pengumuman untuk dashboard (non-blocking)
    this.loadPengumuman().catch(() => {});
    // Load banner penunjukan panitia (non-blocking)
    this.loadDashPanitiaBanner().catch(() => {});
    // Terapkan modul aktif (non-blocking)
    this.applyModulAktif().catch(() => {});
  },

  async fetchKas() {
    try {
      const res = await fetch(`${this.apiBase}/collections/kas/records?sort=-tanggal,-created&expand=dicatat_oleh&perPage=200`, {
        headers: this.getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        this.allKas = data.items || [];
      }
    } catch (e) {
      console.error("fetchKas error", e);
    }
  },

  async fetchUsers() {
    try {
      const res = await fetch(`${this.apiBase}/collections/users/records?perPage=100&sort=nama`, {
        headers: this.getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        this.allUsers = data.items || [];
      }
    } catch (e) {
      console.error("fetchUsers error", e);
    }
  },

  async fetchIuran() {
    try {
      const res = await fetch(`${this.apiBase}/collections/iuran/records?filter=(periode='${this.currentPeriod}')&expand=anggota&perPage=100`, {
        headers: this.getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        this.allIuran = data.items || [];
      }
    } catch (e) {
      console.error("fetchIuran error", e);
    }
  },

  // RENDER MARKAS DASHBOARD
  renderMarkas() {
    // 1. Calculate Saldo & Bulan Ini
    let totalSaldo = 0;
    let masukBulanIni = 0;
    let keluarBulanIni = 0;

    const currentYearMonth = this.currentPeriod;

    this.allKas.forEach(t => {
      const nominal = Number(t.nominal) || 0;
      const isThisMonth = (t.tanggal || "").startsWith(currentYearMonth);

      if (t.jenis === "masuk") {
        totalSaldo += nominal;
        if (isThisMonth) masukBulanIni += nominal;
      } else if (t.jenis === "keluar") {
        totalSaldo -= nominal;
        if (isThisMonth) keluarBulanIni += nominal;
      }
    });

    const saldoEl = document.getElementById("dash-total-saldo");
    if (saldoEl) saldoEl.innerText = totalSaldo.toLocaleString("id-ID");

    const masukEl = document.getElementById("dash-masuk-bulan");
    if (masukEl) masukEl.innerText = `+Rp ${masukBulanIni.toLocaleString("id-ID")}`;

    const keluarEl = document.getElementById("dash-keluar-bulan");
    if (keluarEl) keluarEl.innerText = `-Rp ${keluarBulanIni.toLocaleString("id-ID")}`;

    // 2. Tangki Bensin Iuran (Resource Bar)
    const activeMembers = this.allUsers.filter(u => u.status === "aktif");
    const totalActive = activeMembers.length || 1;
    const paidMemberIds = new Set(this.allIuran.filter(i => i.status === "lunas").map(i => i.anggota));
    const paidCount = activeMembers.filter(u => paidMemberIds.has(u.id)).length;
    const pct = Math.min(100, Math.round((paidCount / totalActive) * 100));

    const fillBar = document.getElementById("bensin-fill-bar");
    if (fillBar) fillBar.style.width = `${pct}%`;

    const bensinStatus = document.getElementById("bensin-status-text");
    if (bensinStatus) {
      bensinStatus.innerText = `${pct}% (${paidCount}/${totalActive} Anggota)`;
    }

    // 3. 5 Transaksi Terakhir
    const latestList = document.getElementById("dash-latest-kas");
    if (latestList) {
      const latest5 = this.allKas.slice(0, 5);
      if (latest5.length === 0) {
        latestList.innerHTML = `<div style="text-align:center; padding:18px; color:var(--text-muted); font-size:0.85rem;">Belum ada catatan kas bro.</div>`;
      } else {
        latestList.innerHTML = latest5.map(t => this.renderKasCardHtml(t)).join("");
      }
    }

    // 4. Member Chips
    const presenceWrap = document.getElementById("dash-members-chips");
    if (presenceWrap) {
      presenceWrap.innerHTML = activeMembers.map(u => {
        const isLunas = paidMemberIds.has(u.id);
        return `
          <div class="member-chip ${isLunas ? 'lunas' : ''}" title="${u.nama} - ${isLunas ? 'Iuran Lunas' : 'Belum Lunas'}">
            <span class="member-indicator"></span>
            <span>${u.nama || u.username}</span>
          </div>
        `;
      }).join("");
    }
  },

  renderKasCardHtml(t) {
    const isMasuk = t.jenis === "masuk";
    const sign = isMasuk ? "+" : "-";
    const nomStr = `${sign}Rp ${Number(t.nominal).toLocaleString("id-ID")}`;
    const dicatatOleh = t.expand?.dicatat_oleh?.nama || "Pengurus";
    const hasBukti = !!t.bukti;
    const canManageKas = this.user && (this.user.role === "admin" || this.user.role === "bendahara");

    return `
      <div class="kas-card">
        <div class="kas-icon-badge ${t.jenis}">
          ${isMasuk ? '🪙' : '🧾'}
        </div>
        <div class="kas-info">
          <div class="kas-keterangan">${this.escapeHtml(t.keterangan)} ${t.mengoreksi ? `<span style="color:var(--warna-aksen); font-size:0.72rem; font-weight:700;">(Koreksi)</span>` : ''}</div>
          <div class="kas-sub">
            <span>📅 ${t.tanggal ? t.tanggal.split(" ")[0] : '-'}</span>
            <span>🏷️ ${t.kategori}</span>
            <span>👤 ${dicatatOleh}</span>
          </div>
        </div>
        <div style="text-align:right;">
          <div class="kas-nominal ${t.jenis}">${nomStr}</div>
          <div style="margin-top:4px; display:flex; justify-content:flex-end; gap:4px;">
            ${hasBukti ? `
              <button class="btn btn-outline" style="padding:2px 8px; font-size:0.7rem;" 
                onclick="App.showBuktiModal('${t.collectionId}', '${t.id}', '${t.bukti}')">
                🖼️ Bukti
              </button>
            ` : ''}
            ${canManageKas ? `
              <button class="btn btn-outline" style="padding:2px 8px; font-size:0.68rem;" onclick="App.openKoreksiKasModal('${t.id}')">
                🔄 Koreksi
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  },

  // RENDER BUKU KAS
  renderKasList() {
    const filterJenis = document.getElementById("filter-kas-jenis")?.value || "all";
    const searchVal = (document.getElementById("filter-kas-search")?.value || "").toLowerCase();

    let filtered = this.allKas;
    if (filterJenis !== "all") {
      filtered = filtered.filter(t => t.jenis === filterJenis);
    }
    if (searchVal) {
      filtered = filtered.filter(t => 
        (t.keterangan || "").toLowerCase().includes(searchVal) ||
        (t.kategori || "").toLowerCase().includes(searchVal)
      );
    }

    const container = document.getElementById("full-kas-list");
    if (container) {
      if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);">Tidak ada transaksi yang cocok.</div>`;
      } else {
        container.innerHTML = filtered.map(t => this.renderKasCardHtml(t)).join("");
      }
    }
  },

  showBuktiModal(collectionId, recordId, fileName) {
    const url = `${this.apiBase}/files/${collectionId}/${recordId}/${fileName}`;
    const modal = document.getElementById("bukti-modal");
    const img = document.getElementById("bukti-modal-img");
    if (modal && img) {
      img.src = url;
      modal.style.display = "flex";
    }
  },

  closeBuktiModal() {
    const modal = document.getElementById("bukti-modal");
    if (modal) modal.style.display = "none";
  },

  exportKasCSV() {
    if (this.allKas.length === 0) {
      alert("Tidak ada data transaksi untuk diekspor!");
      return;
    }

    const headers = ["Tanggal", "Jenis", "Nominal", "Kategori", "Keterangan", "Dicatat Oleh"];
    const rows = this.allKas.map(t => [
      `"${t.tanggal ? t.tanggal.split(" ")[0] : ''}"`,
      `"${t.jenis}"`,
      t.nominal,
      `"${t.kategori}"`,
      `"${(t.keterangan || '').replace(/"/g, '""')}"`,
      `"${(t.expand?.dicatat_oleh?.nama || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `riwayat-kas-${this.currentPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // WIZARD CATAT KAS
  openCatatKas() {
    this.wizardStep = 1;
    this.wizardData = {
      jenis: "masuk",
      nominal: 0,
      kategori: "iuran",
      keterangan: "",
      buktiFile: null
    };
    this.renderWizardStep();
    const modal = document.getElementById("wizard-modal");
    if (modal) modal.style.display = "flex";
    Hero.setExpression("menjelaskan", "Isi data kas langkah demi langkah ya bro.");
  },

  closeWizard() {
    const modal = document.getElementById("wizard-modal");
    if (modal) modal.style.display = "none";
  },

  renderWizardStep() {
    document.querySelectorAll(".step-indicator").forEach((el, idx) => {
      el.classList.toggle("active", idx + 1 <= this.wizardStep);
    });

    document.querySelectorAll(".wizard-step-panel").forEach(p => p.style.display = "none");
    const activePanel = document.getElementById(`wizard-step-${this.wizardStep}`);
    if (activePanel) activePanel.style.display = "block";

    if (this.wizardStep === 3) {
      // Summary confirmation step
      const summaryEl = document.getElementById("wizard-summary-content");
      if (summaryEl) {
        summaryEl.innerHTML = `
          <div style="font-size:0.9rem; line-height:1.6;">
            <div><strong>Jenis:</strong> <span class="role-pill ${this.wizardData.jenis === 'masuk' ? 'role-anggota' : 'role-admin'}">${this.wizardData.jenis.toUpperCase()}</span></div>
            <div><strong>Nominal:</strong> <span style="font-size:1.1rem; font-weight:700; color:var(--warna-utama);">Rp ${Number(this.wizardData.nominal).toLocaleString('id-ID')}</span></div>
            <div><strong>Kategori:</strong> ${this.wizardData.kategori}</div>
            <div><strong>Keterangan:</strong> ${this.escapeHtml(this.wizardData.keterangan)}</div>
            <div><strong>Foto Bukti:</strong> ${this.wizardData.buktiFile ? this.wizardData.buktiFile.name : '<em>Tidak ada (Hanya diperbolehkan untuk pemasukan)</em>'}</div>
          </div>
        `;
      }
      Hero.setExpression("waspada", Teks.hero.confirm_save);
    }
  },

  wizardNext() {
    if (this.wizardStep === 1) {
      const jenis = document.getElementById("wiz-jenis").value;
      const nominal = parseFloat(document.getElementById("wiz-nominal").value) || 0;
      const kategori = document.getElementById("wiz-kategori").value;

      if (nominal <= 0) {
        alert("Nominal harus lebih dari 0!");
        return;
      }

      this.wizardData.jenis = jenis;
      this.wizardData.nominal = nominal;
      this.wizardData.kategori = kategori;
      this.wizardStep = 2;
      this.renderWizardStep();
    } else if (this.wizardStep === 2) {
      const keterangan = document.getElementById("wiz-keterangan").value.trim();
      const fileInput = document.getElementById("wiz-bukti");
      const file = fileInput?.files?.[0];

      if (!keterangan) {
        alert("Keterangan wajib diisi!");
        return;
      }

      if (this.wizardData.jenis === "keluar" && !file) {
        Hero.setExpression("waspada", Teks.hero.error_bukti);
        alert("Peringatan: Pengeluaran wajib ada foto nota/struk bukti!");
        return;
      }

      this.wizardData.keterangan = keterangan;
      this.wizardData.buktiFile = file || null;
      this.wizardStep = 3;
      this.renderWizardStep();
    }
  },

  wizardPrev() {
    if (this.wizardStep > 1) {
      this.wizardStep--;
      this.renderWizardStep();
    }
  },

  async submitKas() {
    try {
      Hero.setExpression("berpikir", Teks.hero.loading);

      const formData = new FormData();
      const today = new Date().toISOString().split("T")[0];
      formData.append("tanggal", today);
      formData.append("jenis", this.wizardData.jenis);
      formData.append("nominal", this.wizardData.nominal);
      formData.append("kategori", this.wizardData.kategori);
      formData.append("keterangan", this.wizardData.keterangan);
      formData.append("dicatat_oleh", this.user.id);

      if (this.wizardData.buktiFile) {
        formData.append("bukti", this.wizardData.buktiFile);
      }

      const res = await fetch(`${this.apiBase}/collections/kas/records`, {
        method: "POST",
        headers: this.getAuthHeaders(true),
        body: formData
      });

      if (!res.ok) {
        const err = await res.json();
        alert("Gagal menyimpan transaksi: " + JSON.stringify(err.data || err.message));
        return;
      }

      this.closeWizard();
      Hero.setExpression("senang", Teks.hero.kas_saved);
      await this.refreshData();
    } catch (e) {
      console.error(e);
      alert("Terjadi kendala jaringan saat menyimpan kas!");
    }
  },

  // RENDER IURAN
  renderIuran() {
    const listEl = document.getElementById("iuran-member-checklist");
    if (!listEl) return;

    const canManage = this.user.role === "admin" || this.user.role === "bendahara";
    const activeMembers = this.allUsers.filter(u => u.status === "aktif");
    const iuranMap = new Map();
    this.allIuran.forEach(i => iuranMap.set(i.anggota, i));

    listEl.innerHTML = activeMembers.map(u => {
      const rec = iuranMap.get(u.id);
      const isLunas = rec && rec.status === "lunas";

      return `
        <div class="kas-card" style="margin-bottom:8px;">
          <div class="member-indicator" style="background:${isLunas ? 'var(--warna-utama)' : 'var(--text-muted)'}; width:12px; height:12px;"></div>
          <div class="kas-info" style="margin-left:8px;">
            <div style="font-weight:600;">${this.escapeHtml(u.nama || u.username)}</div>
            <div style="font-size:0.75rem; color:var(--text-sub);">${u.kontak || 'No WA -'}</div>
          </div>
          <div>
            ${canManage ? `
              <button class="btn ${isLunas ? 'btn-outline' : 'btn-primary'}" style="padding:6px 12px; font-size:0.75rem;"
                onclick="App.toggleIuranStatus('${u.id}', ${!isLunas})">
                ${isLunas ? '✅ Lunas' : 'Tandai Lunas'}
              </button>
            ` : `
              <span class="role-pill ${isLunas ? 'role-anggota' : 'role-admin'}">
                ${isLunas ? 'Lunas' : 'Belum Lunas'}
              </span>
            `}
          </div>
        </div>
      `;
    }).join("");
  },

  async toggleIuranStatus(userId, markAsLunas) {
    if (!markAsLunas) {
      alert("Status lunas tidak dapat dibatalkan sembarangan.");
      return;
    }

    const defaultNominal = this.komunitas?.iuran_default || 20000;
    const confirmSetor = confirm(`Tandai iuran lunas sebesar Rp ${defaultNominal.toLocaleString('id-ID')} dan otomatis catat ke Buku Kas?`);
    if (!confirmSetor) return;

    try {
      Hero.setExpression("berpikir", Teks.hero.loading);

      // 1. Catat ke kas terlebih dahulu
      const userObj = this.allUsers.find(u => u.id === userId);
      const namaUser = userObj ? userObj.nama : "Anggota";

      const kasData = {
        tanggal: new Date().toISOString().split("T")[0],
        jenis: "masuk",
        nominal: defaultNominal,
        kategori: "iuran",
        keterangan: `Iuran ${this.currentPeriod} - ${namaUser}`,
        dicatat_oleh: this.user.id
      };

      const kasRes = await fetch(`${this.apiBase}/collections/kas/records`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(kasData)
      });

      const kasObj = await kasRes.json();

      // 2. Simpan record iuran
      const iuranPayload = {
        anggota: userId,
        periode: this.currentPeriod,
        nominal: defaultNominal,
        status: "lunas",
        kas: kasObj.id || null
      };

      await fetch(`${this.apiBase}/collections/iuran/records`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(iuranPayload)
      });

      Hero.setExpression("senang", `Iuran ${namaUser} berhasil dilunasi & dicatat ke kas!`);
      await this.refreshData();
    } catch (e) {
      console.error(e);
      alert("Gagal memproses setoran iuran!");
    }
  },

  // RENDER ANGGOTA (ADMIN ONLY) & VERIFIKASI PENDAFTARAN
  async renderAnggota() {
    const listEl = document.getElementById("admin-members-list");
    if (!listEl) return;

    let pendaftaranHtml = "";
    if (this.user && this.user.role === "admin") {
      try {
        const res = await fetch(`${this.apiBase}/collections/pendaftaran/records?filter=(status='menunggu')&sort=-created`, {
          headers: this.getAuthHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          const pending = data.items || [];
          if (pending.length > 0) {
            pendaftaranHtml = `
              <div style="background:rgba(255,176,32,0.12); border:1px solid var(--warna-aksen); border-radius:12px; padding:14px; margin-bottom:18px;">
                <div style="font-weight:700; color:var(--warna-aksen); font-size:0.9rem; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
                  <span>⏳</span> <span>Pendaftaran Menunggu Persetujuan (${pending.length})</span>
                </div>
                ${pending.map(p => `
                  <div class="kas-card" style="margin-bottom:10px; flex-direction:column; align-items:stretch; gap:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                      <div>
                        <div style="font-weight:700; font-size:0.95rem;">${this.escapeHtml(p.nama_lengkap)}</div>
                        <div style="font-size:0.78rem; color:var(--text-sub); margin-top:2px;">
                          <span>📱 ${this.escapeHtml(p.whatsapp)}</span> • 
                          <span>📍 ${this.escapeHtml(p.domisili || 'Tidak ada domisili')}</span>
                        </div>
                      </div>
                      <span class="badge" style="background:var(--warna-aksen); color:#000; font-size:0.72rem; font-weight:700; padding:2px 8px; border-radius:12px;">${p.kode_cek}</span>
                    </div>
                    ${p.alasan_bergabung ? `
                      <div style="font-size:0.78rem; color:var(--text-muted); font-style:italic; background:var(--bg-input); padding:6px 10px; border-radius:6px;">
                        "${this.escapeHtml(p.alasan_bergabung)}"
                      </div>
                    ` : ''}
                    <div style="display:flex; gap:8px; margin-top:4px;">
                      <button class="btn btn-primary" style="flex:1; padding:6px 10px; font-size:0.78rem;" onclick="App.prosesPendaftaran('${p.id}', 'setujui', '${this.escapeHtml(p.nama_lengkap)}')">
                        ✓ Setujui Akun
                      </button>
                      <button class="btn btn-outline" style="flex:1; padding:6px 10px; font-size:0.78rem; color:var(--warna-merah); border-color:var(--warna-merah);" onclick="App.prosesPendaftaran('${p.id}', 'tolak', '${this.escapeHtml(p.nama_lengkap)}')">
                        ✕ Tolak
                      </button>
                    </div>
                  </div>
                `).join("")}
              </div>
            `;
          }
        }
      } catch (e) {
        console.warn("Could not fetch pendaftaran", e);
      }
    }

    const membersHtml = `
      <div style="font-weight:700; font-size:0.85rem; color:var(--text-sub); margin-bottom:10px;">ANGGOTA AKTIF & TERDAFTAR (${this.allUsers.length})</div>
      ${this.allUsers.map(u => {
        const isAktif = (u.status || "aktif") === "aktif";
        return `
          <div class="kas-card">
            <div class="kas-info">
              <div style="font-weight:600; display:flex; align-items:center; gap:6px;">
                <span>${this.escapeHtml(u.nama || u.username)}</span>
                ${!isAktif ? `<span class="badge" style="background:#ef4444; color:#fff; font-size:0.65rem; padding:1px 6px; border-radius:8px;">${u.status}</span>` : ''}
              </div>
              <div class="kas-sub">
                <span>✉️ ${this.escapeHtml(u.email || '-')}</span>
                <span>📱 ${this.escapeHtml(u.kontak || u.whatsapp || '-')}</span>
              </div>
            </div>
            <div style="text-align:right;">
              <span class="role-pill role-${u.role}">${u.role}</span>
            </div>
          </div>
        `;
      }).join("")}
    `;

    listEl.innerHTML = pendaftaranHtml + membersHtml;
  },

  async prosesPendaftaran(pendaftaranId, aksi, nama) {
    let catatan = "";
    if (aksi === "setujui") {
      if (!confirm(`Konfirmasi: Setujui pendaftaran ${nama} menjadi anggota aktif?`)) return;
    } else {
      catatan = prompt(`Masukkan alasan penolakan untuk ${nama}:`, "Data belum memenuhi syarat basecamp");
      if (catatan === null) return;
    }

    try {
      Hero.setExpression("berpikir", Teks.hero.loading);
      const res = await fetch(`${this.apiBase}/komunitas/pendaftaran/${pendaftaranId}/proses`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ aksi, catatan })
      });
      const data = await res.json();
      if (!res.ok) {
        Hero.setExpression("waspada", data.error || "Gagal memproses.");
        alert("Gagal: " + (data.error || "Terjadi kesalahan"));
        return;
      }

      Hero.setExpression("senang", data.message || "Pendaftaran berhasil diproses!");
      await this.refreshData();
    } catch (e) {
      console.error(e);
      alert("Terjadi kendala saat memproses pendaftaran!");
    }
  },

  // PELACAKAN PROGRES FITUR & UJI (6.14)
  async loadProgres() {
    try {
      const res = await fetch(`${this.apiBase}/komunitas/progres`);
      if (!res.ok) return;
      const data = await res.json();

      const pctHeadline = document.getElementById("progres-pct-headline");
      const barFill = document.getElementById("progres-bar-fill");
      const summarySub = document.getElementById("progres-summary-sub");
      const roadmapWrap = document.getElementById("progres-roadmap-wrap");
      const accordionWrap = document.getElementById("progres-fase-accordion");

      if (pctHeadline) pctHeadline.innerText = `${data.persen_total || 0}%`;
      if (barFill) barFill.style.width = `${data.persen_total || 0}%`;
      if (summarySub) {
        const selesaiFase = (data.fase || []).filter(f => f.status === "selesai").length;
        summarySub.innerText = `${data.fitur_berfungsi || 0} dari ${data.total_fitur || 0} fitur lulus uji (${selesaiFase} dari ${(data.fase || []).length} fase komplit)`;
      }

      // Render Roadmap Stops
      if (roadmapWrap && data.fase) {
        roadmapWrap.innerHTML = data.fase.map(f => {
          const isDone = f.status === "selesai";
          const isCurrent = f.status === "berjalan";
          const icon = isDone ? "🏁" : (isCurrent ? "⛽" : "🚧");
          const cls = isDone ? "selesai" : (isCurrent ? "aktif" : "antre");
          return `
            <div class="roadmap-pos ${cls}">
              <div class="pos-dot">${icon}</div>
              <div class="pos-info">
                <div class="pos-title">${f.kode}: ${this.escapeHtml(f.nama)}</div>
                <div class="pos-sub">${f.jumlah_berfungsi}/${f.jumlah_fitur} fitur • ${f.persen}%</div>
              </div>
            </div>
          `;
        }).join("");
      }

      // Render Accordion
      if (accordionWrap && data.fase) {
        accordionWrap.innerHTML = data.fase.map(f => {
          const isDone = f.status === "selesai";
          const statusBadge = isDone 
            ? `<span class="badge" style="background:#10b981; color:#fff; font-size:0.7rem; padding:2px 8px; border-radius:10px;">✓ Selesai 100%</span>`
            : `<span class="badge" style="background:#f59e0b; color:#fff; font-size:0.7rem; padding:2px 8px; border-radius:10px;">${f.persen}% Berjalan</span>`;

          const fiturRows = (f.fitur || []).map(fit => {
            const isFiturDone = fit.status === "berfungsi";
            const fiturIcon = isFiturDone ? "✅" : "⏳";
            return `
              <div style="padding:10px; border-top:1px solid rgba(255,255,255,0.06); font-size:0.8rem;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-weight:600;">${fiturIcon} ${fit.kode}: ${this.escapeHtml(fit.nama)}</span>
                  <span style="font-size:0.72rem; color:var(--text-sub);">${fit.uji_lulus}/${fit.jumlah_uji} uji</span>
                </div>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${this.escapeHtml(fit.deskripsi || '')}</div>
                <div style="font-size:0.72rem; color:var(--warna-utama); margin-top:4px; font-style:italic;">💬 ${this.escapeHtml(fit.catatan_publik || '')}</div>
              </div>
            `;
          }).join("");

          return `
            <details class="kas-card" style="margin-bottom:10px; display:block; padding:0; overflow:hidden;" ${isDone ? '' : 'open'}>
              <summary style="padding:14px; cursor:pointer; font-weight:700; display:flex; justify-content:space-between; align-items:center; list-style:none;">
                <div>
                  <div style="font-size:0.9rem;">${f.kode} — ${this.escapeHtml(f.nama)}</div>
                  <div style="font-size:0.72rem; color:var(--text-sub); font-weight:normal; margin-top:2px;">${this.escapeHtml(f.deskripsi)}</div>
                </div>
                <div>${statusBadge}</div>
              </summary>
              <div style="background:rgba(0,0,0,0.15); padding:4px 8px;">
                ${fiturRows}
              </div>
            </details>
          `;
        }).join("");
      }
    } catch (e) {
      console.warn("Could not load progres", e);
    }
  },

  // PROFIL SAYA (6.11)
  renderProfil() {
    if (!this.user) return;
    const namaEl = document.getElementById("profil-nama-display");
    const roleEl = document.getElementById("profil-role-display");
    const waEl = document.getElementById("profil-wa-display");
    const pctText = document.getElementById("profil-pct-text");
    const barFill = document.getElementById("profil-bar-fill");

    const nama = this.user.nama || this.user.nama_panggilan || this.user.username;
    if (namaEl) namaEl.innerText = nama;
    if (roleEl) roleEl.innerText = `${(this.user.role || 'anggota').toUpperCase()} • ${this.user.status || 'aktif'}`;
    if (waEl) waEl.innerText = `📱 ${this.user.whatsapp || this.user.kontak || 'Belum ada kontak'}`;

    // Fill Form fields
    const fNama = document.getElementById("prof-nama-panggilan");
    const fWa = document.getElementById("prof-whatsapp");
    const fDomisili = document.getElementById("prof-domisili");
    const fBio = document.getElementById("prof-bio");

    if (fNama) fNama.value = this.user.nama_panggilan || this.user.nama || "";
    if (fWa) fWa.value = this.user.whatsapp || this.user.kontak || "";
    if (fDomisili) fDomisili.value = this.user.domisili || "";
    if (fBio) fBio.value = this.user.bio || "";

    // Completeness calculation
    const checks = [
      !!(this.user.nama || this.user.nama_panggilan),
      !!(this.user.whatsapp || this.user.kontak),
      !!this.user.domisili,
      !!this.user.bio,
      !!this.user.email
    ];
    const filledCount = checks.filter(Boolean).length;
    const pct = Math.round((filledCount / checks.length) * 100);

    if (pctText) pctText.innerText = `${pct}%`;
    if (barFill) barFill.style.width = `${pct}%`;
  },

  async saveProfilData(e) {
    if (e) e.preventDefault();
    if (!this.user) return;

    const nama_panggilan = document.getElementById("prof-nama-panggilan")?.value.trim() || "";
    const whatsapp = document.getElementById("prof-whatsapp")?.value.trim() || "";
    const domisili = document.getElementById("prof-domisili")?.value.trim() || "";
    const bio = document.getElementById("prof-bio")?.value.trim() || "";

    try {
      Hero.setExpression("berpikir", Teks.hero.loading);
      const res = await fetch(`${this.apiBase}/collections/users/records/${this.user.id}`, {
        method: "PATCH",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          nama_panggilan,
          whatsapp,
          domisili,
          bio,
          profil_dilengkapi_pada: new Date().toISOString()
        })
      });

      if (!res.ok) {
        const err = await res.json();
        Hero.setExpression("waspada", "Gagal menyimpan profil.");
        alert("Gagal menyimpan profil: " + JSON.stringify(err.data || err.message));
        return;
      }

      const updated = await res.json();
      this.user = { ...this.user, ...updated };
      localStorage.setItem("pb_user", JSON.stringify(this.user));

      Hero.setExpression("senang", "Mantap bro, data profil kamu berhasil diperbarui!");
      this.renderProfil();
      alert("Profil berhasil diperbarui!");
    } catch (err) {
      console.error(err);
      Hero.setExpression("waspada", "Terjadi kendala jaringan saat simpan profil.");
      alert("Terjadi kendala jaringan saat menyimpan profil!");
    }
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
  },

  // PENDAFTARAN & CEK STATUS MANDIRI (6.12)
  async handleDaftarSubmit(e) {
    if (e) e.preventDefault();

    // Check honeypot
    const hp = document.getElementById("reg-honeypot")?.value;
    if (hp) return;

    const nama_lengkap = document.getElementById("reg-nama")?.value.trim();
    const whatsapp = document.getElementById("reg-wa")?.value.trim();
    const domisili = document.getElementById("reg-domisili")?.value.trim();
    const password = document.getElementById("reg-password")?.value;
    const alasan_bergabung = document.getElementById("reg-alasan")?.value.trim();
    const setuju_privasi = document.getElementById("reg-setuju")?.checked;

    if (!nama_lengkap || !whatsapp || !password) {
      alert("Nama, WhatsApp, dan Password wajib diisi!");
      return;
    }

    if (password.length < 8) {
      alert("Password minimal 8 karakter!");
      return;
    }

    if (!setuju_privasi) {
      alert("Harap centang persetujuan aturan basecamp!");
      return;
    }

    try {
      Hero.setExpression("berpikir", Teks.hero.loading);
      const res = await fetch(`${this.apiBase}/komunitas/daftar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama_lengkap,
          whatsapp,
          domisili,
          password,
          alasan_bergabung,
          setuju_privasi
        })
      });

      const data = await res.json();
      if (!res.ok) {
        Hero.setExpression("waspada", data.error || "Pendaftaran gagal.");
        alert("Gagal daftar: " + (data.error || "Terjadi kesalahan"));
        return;
      }

      Hero.setExpression("senang", "Pendaftaran sukses bro! Simpan kode cek kamu ya.");
      const formEl = document.getElementById("daftar-form");
      const msgEl = document.getElementById("daftar-success-msg");
      if (formEl) formEl.style.display = "none";
      if (msgEl) {
        msgEl.style.display = "block";
        msgEl.innerHTML = `
          <div style="font-weight:700; color:var(--warna-utama); font-size:1rem; margin-bottom:6px;">
            🎉 Pendaftaran Berhasil Diajukan!
          </div>
          <p style="color:var(--text-main); margin-bottom:10px;">
            Permohonan kamu sudah masuk ke pengurus. Simpan kode cek pendaftaran ini:
          </p>
          <div style="background:var(--bg-card); padding:10px; border-radius:8px; border:1px dashed var(--warna-utama); font-family:monospace; font-size:1.2rem; font-weight:800; color:var(--warna-utama); letter-spacing:1px; text-align:center;">
            ${data.kode_cek}
          </div>
          <p style="font-size:0.78rem; color:var(--text-sub); margin-top:10px;">
            Kamu bisa memantau status persetujuan kapan saja lewat tab <strong>Cek Status</strong> di atas menggunakan kode tersebut.
          </p>
        `;
      }
    } catch (err) {
      console.error(err);
      Hero.setExpression("waspada", "Terjadi kendala jaringan saat mendaftar.");
      alert("Terjadi kendala jaringan saat mengirim pendaftaran!");
    }
  },

  async handleCekStatusSubmit(e) {
    if (e) e.preventDefault();
    const kode = document.getElementById("status-kode")?.value.trim().toUpperCase();
    if (!kode) {
      alert("Masukkan kode pendaftaran!");
      return;
    }

    try {
      Hero.setExpression("berpikir", "Mengecek status di database...");
      const res = await fetch(`${this.apiBase}/komunitas/status/${encodeURIComponent(kode)}`);
      const data = await res.json();

      const resultBox = document.getElementById("status-result-box");
      if (!resultBox) return;

      if (!res.ok) {
        Hero.setExpression("waspada", data.error || "Kode tidak ditemukan.");
        resultBox.style.display = "block";
        resultBox.innerHTML = `
          <div style="color:var(--warna-merah); font-weight:700; font-size:0.9rem;">
            ❌ ${this.escapeHtml(data.error || "Kode tidak ditemukan.")}
          </div>
        `;
        return;
      }

      resultBox.style.display = "block";
      const status = data.status;
      let badgeColor = "#f59e0b";
      let statusText = "Menunggu Verifikasi Admin";
      let exp = "menjelaskan";

      if (status === "disetujui") {
        badgeColor = "#10b981";
        statusText = "Disetujui — Akun Sudah Aktif!";
        exp = "senang";
      } else if (status === "ditolak") {
        badgeColor = "#ef4444";
        statusText = "Pendaftaran Ditolak";
        exp = "waspada";
      }

      Hero.setExpression(exp, `Status pendaftaran kamu saat ini: ${statusText}`);

      resultBox.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="font-size:0.8rem; color:var(--text-sub);">Calon Anggota</span>
          <span style="font-weight:700;">${this.escapeHtml(data.nama_lengkap || '-')}</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <span style="font-size:0.8rem; color:var(--text-sub);">Status Saat Ini</span>
          <span class="badge" style="background:${badgeColor}; color:#fff; font-size:0.75rem; padding:3px 10px; border-radius:12px; font-weight:700;">${statusText}</span>
        </div>
        ${data.catatan_admin ? `
          <div style="background:var(--bg-card); padding:8px 10px; border-radius:6px; font-size:0.78rem; margin-top:8px;">
            <strong>Catatan Pengurus:</strong> ${this.escapeHtml(data.catatan_admin)}
          </div>
        ` : ''}
        ${data.alasan_penolakan ? `
          <div style="background:rgba(239,68,68,0.1); border:1px solid #ef4444; color:#ef4444; padding:8px 10px; border-radius:6px; font-size:0.78rem; margin-top:8px;">
            <strong>Alasan:</strong> ${this.escapeHtml(data.alasan_penolakan)}
          </div>
        ` : ''}
        ${status === "disetujui" ? `
          <div style="margin-top:12px; text-align:center;">
            <button class="btn btn-primary" onclick="App.switchAuthTab('login')" style="padding:8px 14px; font-size:0.82rem;">
              🛵 Masuk ke Basecamp Sekarang
            </button>
          </div>
        ` : ''}
      `;
    } catch (err) {
      console.error(err);
      Hero.setExpression("waspada", "Gagal cek status.");
      alert("Terjadi kendala jaringan saat cek status!");
    }
  },

  openAddAnggotaModal() {
    const modal = document.getElementById("modal-add-anggota");
    if (modal) modal.style.display = "flex";
  },

  closeAddAnggotaModal() {
    const modal = document.getElementById("modal-add-anggota");
    if (modal) modal.style.display = "none";
  },

  async submitAddAnggota() {
    const nama = document.getElementById("add-anggota-nama")?.value.trim();
    const email = document.getElementById("add-anggota-email")?.value.trim();
    const kontak = document.getElementById("add-anggota-kontak")?.value.trim();
    const role = document.getElementById("add-anggota-role")?.value || "anggota";
    const password = document.getElementById("add-anggota-pass")?.value || "Password123!";

    if (!nama || !email) {
      alert("Nama dan Email wajib diisi!");
      return;
    }

    try {
      Hero.setExpression("berpikir", Teks.hero.loading);
      const res = await fetch(`${this.apiBase}/collections/users/records`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          username: email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, ""),
          email,
          emailVisibility: true,
          password,
          passwordConfirm: password,
          nama,
          kontak,
          role,
          status: "aktif"
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert("Gagal menambah anggota: " + JSON.stringify(err.data || err.message));
        return;
      }

      this.closeAddAnggotaModal();
      Hero.setExpression("senang", `Anggota baru ${nama} berhasil didaftarkan!`);
      await this.refreshData();
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan saat menambah anggota!");
    }
  },

  // STRUKTUR BASECAMP (F3c)
  async loadStruktur() {
    const listEl = document.getElementById("struktur-units-list");
    if (!listEl) return;
    listEl.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-sub);">Memuat struktur pangkalan...</div>`;

    try {
      const [resUnits, resJabs] = await Promise.all([
        fetch(`${this.apiBase}/collections/unit/records?sort=urutan`, { headers: this.getAuthHeaders() }),
        fetch(`${this.apiBase}/collections/jabatan/records?filter=(aktif=true)&expand=anggota`, { headers: this.getAuthHeaders() })
      ]);

      if (!resUnits.ok) return;
      const dataUnits = await resUnits.json();
      const dataJabs = resJabs.ok ? await resJabs.json() : { items: [] };

      const units = dataUnits.items || [];
      const jabs = dataJabs.items || [];

      if (units.length === 0) {
        listEl.innerHTML = `<div class="kas-card" style="justify-content:center; color:var(--text-muted);">Belum ada unit struktur yang didaftarkan.</div>`;
        return;
      }

      listEl.innerHTML = units.map(u => {
        const unitJabs = jabs.filter(j => j.unit === u.id);
        const icon = u.jenis === "dewan_etik" ? "⚖️" :
                     u.jenis === "satgas" ? "🚨" :
                     u.jenis === "pengurus_harian" ? "🛵" : "🤝";

        const officersHtml = unitJabs.length > 0 ? unitJabs.map(j => {
          const userObj = j.expand?.anggota;
          const namaAnggota = userObj ? (userObj.nama || userObj.username) : "Belum ditentukan";
          const kontak = userObj ? (userObj.whatsapp || userObj.kontak || "") : "";
          return `
            <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-input); padding:8px 12px; border-radius:8px; margin-top:6px; font-size:0.82rem;">
              <div>
                <div style="font-weight:700;">${this.escapeHtml(j.jabatan)}</div>
                <div style="font-size:0.75rem; color:var(--text-sub);">${this.escapeHtml(namaAnggota)}</div>
              </div>
              ${kontak ? `
                <a href="https://wa.me/${kontak.replace(/[^0-9]/g, '')}" target="_blank" rel="noopener" class="btn btn-outline" style="width:auto; padding:4px 8px; font-size:0.72rem; text-decoration:none;">
                  💬 WA
                </a>
              ` : ''}
            </div>
          `;
        }).join("") : `<div style="font-size:0.75rem; color:var(--text-muted); font-style:italic; margin-top:6px;">Belum ada penugasan jabatan aktif.</div>`;

        return `
          <div class="kas-card" style="margin-bottom:14px; flex-direction:column; align-items:stretch; gap:10px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:24px;">${icon}</span>
                <div>
                  <div style="font-weight:700; font-size:0.95rem;">${this.escapeHtml(u.nama)}</div>
                  <div style="font-size:0.72rem; color:var(--text-sub); text-transform:uppercase;">${(u.jenis || '').replace('_', ' ')}</div>
                </div>
              </div>
            </div>
            ${u.deskripsi ? `
              <div style="font-size:0.78rem; color:var(--text-main); line-height:1.4;">${this.escapeHtml(u.deskripsi)}</div>
            ` : ''}
            ${u.tugas ? `
              <div style="font-size:0.75rem; color:var(--text-sub); background:rgba(0,0,0,0.1); padding:6px 10px; border-radius:6px;">
                <strong>Tugas:</strong> ${this.escapeHtml(u.tugas)}
              </div>
            ` : ''}
            <div style="margin-top:4px;">
              <div style="font-size:0.75rem; font-weight:700; color:var(--text-sub); margin-bottom:4px;">PEJABAT BERTUGAS:</div>
              ${officersHtml}
            </div>
          </div>
        `;
      }).join("");
    } catch (e) {
      console.warn("Could not load struktur", e);
      listEl.innerHTML = `<div style="color:var(--warna-merah); font-size:0.8rem;">Gagal memuat bagan struktur.</div>`;
    }
  },

  // ATURAN & ETIKA (F3c-2)
  activeAturanVersi: null,

  async loadAturan() {
    const listEl = document.getElementById("aturan-pasal-list");
    const badgeEl = document.getElementById("aturan-versi-badge");
    const bannerEl = document.getElementById("aturan-persetujuan-banner");
    if (!listEl) return;
    listEl.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-sub);">Memuat aturan pangkalan...</div>`;

    try {
      // 1. Fetch active version
      const resVer = await fetch(`${this.apiBase}/collections/aturan_versi/records?filter=(status='berlaku')&sort=-created&perPage=1`, {
        headers: this.getAuthHeaders()
      });
      if (!resVer.ok) return;
      const dataVer = await resVer.json();
      const vers = dataVer.items && dataVer.items[0];

      if (!vers) {
        listEl.innerHTML = `<div class="kas-card" style="justify-content:center; color:var(--text-muted);">Belum ada versi aturan yang disahkan.</div>`;
        return;
      }

      this.activeAturanVersi = vers;
      if (badgeEl) {
        badgeEl.innerHTML = `<span class="badge" style="background:var(--warna-utama); color:#fff; font-size:0.75rem; padding:3px 10px; border-radius:12px; font-weight:700;">${this.escapeHtml(vers.nomor || 'v1.0')} • Berlaku</span>`;
      }

      // 2. Check if current user already acknowledged
      if (bannerEl && this.user) {
        const resAck = await fetch(`${this.apiBase}/collections/aturan_persetujuan_anggota/records?filter=(anggota='${this.user.id}'%26%26versi='${vers.id}')`, {
          headers: this.getAuthHeaders()
        });
        if (resAck.ok) {
          const dataAck = await resAck.json();
          const alreadyAck = (dataAck.items || []).length > 0;
          bannerEl.style.display = alreadyAck ? "none" : "block";
        }
      }

      // 3. Fetch pasals
      const resPas = await fetch(`${this.apiBase}/collections/aturan_pasal/records?filter=(versi='${vers.id}')&sort=urutan,nomor`, {
        headers: this.getAuthHeaders()
      });
      if (!resPas.ok) return;
      const dataPas = await resPas.json();
      const pasals = dataPas.items || [];

      if (pasals.length === 0) {
        listEl.innerHTML = `<div class="kas-card" style="justify-content:center; color:var(--text-muted);">Belum ada pasal tercatat untuk versi ini.</div>`;
        return;
      }

      // Group by bab
      const babs = {};
      pasals.forEach(p => {
        const babName = p.bab || "Ketentuan Umum";
        if (!babs[babName]) babs[babName] = [];
        babs[babName].push(p);
      });

      listEl.innerHTML = Object.keys(babs).map(bab => {
        const rows = babs[bab].map(p => {
          const katColor = p.kategori === "larangan" ? "var(--warna-merah)" : (p.kategori === "kewajiban" ? "var(--warna-utama)" : "var(--warna-aksen)");
          return `
            <div style="background:var(--bg-input); border:1px solid var(--border-color); border-radius:10px; padding:12px; margin-bottom:10px;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
                <div style="font-weight:700; font-size:0.88rem;">Pasal ${this.escapeHtml(p.nomor)}: ${this.escapeHtml(p.judul)}</div>
                <span class="badge" style="background:${katColor}; color:#fff; font-size:0.68rem; padding:2px 8px; border-radius:10px; text-transform:uppercase;">${p.kategori || 'umum'}</span>
              </div>
              <div style="font-size:0.8rem; color:var(--text-main); line-height:1.5;">${this.escapeHtml(p.isi)}</div>
            </div>
          `;
        }).join("");

        return `
          <div style="margin-bottom:18px;">
            <div style="font-weight:800; font-size:0.88rem; color:var(--warna-utama); margin-bottom:8px; display:flex; align-items:center; gap:6px;">
              <span>📌</span> <span>${this.escapeHtml(bab)}</span>
            </div>
            ${rows}
          </div>
        `;
      }).join("");
    } catch (e) {
      console.warn("Could not load aturan", e);
      listEl.innerHTML = `<div style="color:var(--warna-merah); font-size:0.8rem;">Gagal memuat aturan pangkalan.</div>`;
    }
  },

  async setujuiAturan() {
    if (!this.activeAturanVersi || !this.user) return;
    try {
      Hero.setExpression("berpikir", Teks.hero.loading);
      const res = await fetch(`${this.apiBase}/collections/aturan_persetujuan_anggota/records`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          versi: this.activeAturanVersi.id,
          anggota: this.user.id,
          waktu: new Date().toISOString()
        })
      });

      if (!res.ok) {
        alert("Gagal mencatat persetujuan aturan!");
        return;
      }

      document.getElementById("aturan-persetujuan-banner").style.display = "none";
      Hero.setExpression("senang", "Terima kasih bro sudah komitmen menjaga etika basecamp kita!");
      alert("Komitmen persetujuan aturan pangkalan berhasil dicatat.");
    } catch (e) {
      console.error(e);
      alert("Terjadi kendala saat menyimpan persetujuan aturan!");
    }
  },

  // EVENT & KEGIATAN KOMUNITAS (F3g)
  async loadEvents() {
    const listEl = document.getElementById("events-list");
    if (!listEl) return;
    listEl.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-sub);">Memuat data kegiatan basecamp...</div>`;

    try {
      const resEv = await fetch(`${this.apiBase}/collections/event/records?sort=-tanggal_mulai&expand=ketua_pelaksana`, {
        headers: this.getAuthHeaders()
      });
      if (!resEv.ok) return;
      const dataEv = await resEv.json();
      const events = dataEv.items || [];

      if (events.length === 0) {
        listEl.innerHTML = `<div class="kas-card" style="justify-content:center; color:var(--text-muted);">Belum ada kegiatan/event yang terdaftar.</div>`;
        return;
      }

      const eventsHtml = await Promise.all(events.map(async ev => {
        // Fetch sub-data: dana, anggaran, transaksi, panitia, peserta, laporan
        const [resDana, resAnggaran, resTrans, resPanitia, resPeserta, resLaporan] = await Promise.all([
          fetch(`${this.apiBase}/collections/event_dana/records?filter=(event='${ev.id}')`, { headers: this.getAuthHeaders() }),
          fetch(`${this.apiBase}/collections/event_anggaran/records?filter=(event='${ev.id}')`, { headers: this.getAuthHeaders() }),
          fetch(`${this.apiBase}/collections/event_transaksi/records?filter=(event='${ev.id}')&sort=-tanggal`, { headers: this.getAuthHeaders() }),
          fetch(`${this.apiBase}/collections/event_panitia/records?filter=(event='${ev.id}')&expand=anggota`, { headers: this.getAuthHeaders() }),
          fetch(`${this.apiBase}/collections/event_peserta/records?filter=(event='${ev.id}')&expand=anggota`, { headers: this.getAuthHeaders() }),
          fetch(`${this.apiBase}/collections/event_laporan/records?filter=(event='${ev.id}')&expand=ditulis_oleh`, { headers: this.getAuthHeaders() })
        ]);

        const danaItems = resDana.ok ? (await resDana.json()).items : [];
        const anggaranItems = resAnggaran.ok ? (await resAnggaran.json()).items : [];
        const transItems = resTrans.ok ? (await resTrans.json()).items : [];
        const panitiaItems = resPanitia.ok ? (await resPanitia.json()).items : [];
        const pesertaItems = resPeserta.ok ? (await resPeserta.json()).items : [];
        const laporanItems = resLaporan.ok ? (await resLaporan.json()).items : [];

        const totalDanaMasuk = danaItems.reduce((acc, d) => acc + (d.nominal_diterima || 0), 0);
        const totalPengeluaran = transItems.filter(t => t.jenis === 'keluar').reduce((acc, t) => acc + (t.nominal || 0), 0);
        const sisaSaldo = totalDanaMasuk - totalPengeluaran;

        const ketuaObj = ev.expand?.ketua_pelaksana;
        const namaKetua = ketuaObj ? (ketuaObj.nama || ketuaObj.username) : "Belum ditentukan";

        const statusColor = ev.status === "selesai" || ev.status === "ditutup" ? "#10b981" :
                            (ev.status === "persiapan" || ev.status === "berlangsung" ? "var(--warna-aksen)" : "var(--text-sub)");

        const tglText = ev.tanggal_mulai ? new Date(ev.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : "-";
        const sudahIkut = this.user && pesertaItems.some(p => p.anggota === this.user.id);

        return `
          <div class="kas-card" style="margin-bottom:16px; flex-direction:column; align-items:stretch; gap:12px;">
            <!-- Header Event -->
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div>
                <div style="font-weight:800; font-size:1.05rem;">${this.escapeHtml(ev.judul)}</div>
                <div style="font-size:0.75rem; color:var(--text-sub); margin-top:2px;">
                  <span>📅 ${tglText}</span> • <span>📍 ${this.escapeHtml(ev.lokasi || 'Lokasi belum ditentukan')}</span>
                </div>
              </div>
              <span class="badge" style="background:${statusColor}; color:#000; font-size:0.72rem; font-weight:700; padding:3px 10px; border-radius:12px; text-transform:uppercase;">
                ${ev.status}
              </span>
              ${this.user && (this.user.role === "admin" || this.user.role === "pengurus") ? `<button class="btn btn-outline" style="width:auto; padding:3px 8px; font-size:0.7rem; margin-left:6px;" onclick="App.ubahStatusEvent('${ev.id}','${ev.status}')">⚙️ Status</button>` : ''}
            </div>

            ${ev.deskripsi ? `
              <div style="font-size:0.8rem; color:var(--text-main); line-height:1.4;">${this.escapeHtml(ev.deskripsi)}</div>
            ` : ''}

            <div style="font-size:0.75rem; color:var(--text-sub);">
              👤 <strong>Ketua Pelaksana:</strong> ${this.escapeHtml(namaKetua)} • 🎯 <strong>Target:</strong> ${ev.target_peserta || 0} Pejuang Aspal
            </div>

            <!-- PANITIA -->
            <div style="margin-top:6px;">
              <div style="font-size:0.72rem; font-weight:700; color:var(--text-sub); margin-bottom:4px;">👥 PANITIA (${panitiaItems.length})</div>
              ${panitiaItems.length ? panitiaItems.map(p => {
                const nama = p.expand?.anggota?.nama || p.expand?.anggota?.username || "?";
                return `<div style="font-size:0.75rem; padding:3px 0; border-bottom:1px dashed rgba(255,255,255,0.06); display:flex; justify-content:space-between;">
                  <span>${this.escapeHtml(nama)} <span style="color:var(--text-muted);">(${this.escapeHtml(p.seksi)})</span></span>
                  ${p.tugas ? `<span style="color:var(--text-muted); font-size:0.7rem;">${this.escapeHtml(p.tugas)}</span>` : ''}
                </div>`;
              }).join('') : `<div style="font-size:0.72rem; color:var(--text-muted);">Belum ada panitia. Ketua menyusun panitia.</div>`}
              ${this.canManageEvent(ev) ? `<button class="btn btn-outline" style="margin-top:6px; width:auto; padding:4px 10px; font-size:0.72rem;" onclick="App.susunPanitia('${ev.id}')">+ Susun Panitia</button>` : ''}
            </div>

            <!-- PESERTA & PENDAFTARAN EVENT (F3g) -->
            <div style="margin-top:8px; padding-top:8px; border-top:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
              <div>
                <span style="font-size:0.78rem; font-weight:700;">Peserta: ${pesertaItems.length} Pejuang Aspal</span>
                ${sudahIkut ? `<span style="margin-left:6px; font-size:0.72rem; color:var(--warna-utama); font-weight:700;">✓ Terdaftar</span>` : ''}
              </div>
              ${!sudahIkut && ev.status !== 'selesai' && ev.status !== 'ditutup' && ev.status !== 'dibatalkan' ? `
                <button class="btn btn-primary" style="width:auto; padding:4px 12px; font-size:0.75rem;" onclick="App.ikutEvent('${ev.id}')">🛵 Ikut Event</button>
              ` : ''}
            </div>

            <!-- PETA DANA EVENT -->
            <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:10px; padding:12px;">
              <div style="font-weight:700; font-size:0.82rem; color:var(--warna-aksen); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                <span>🪙 PETA DANA EVENT</span>
                <span style="font-size:0.9rem; color:#fff;">Saldo: Rp ${sisaSaldo.toLocaleString('id-ID')}</span>
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.78rem;">
                <div style="background:rgba(31,164,99,0.1); border:1px solid rgba(31,164,99,0.2); padding:8px; border-radius:6px;">
                  <div style="color:var(--text-sub); font-size:0.7rem;">Dana Diterima</div>
                  <div style="font-weight:700; color:var(--warna-utama); font-size:0.9rem;">Rp ${totalDanaMasuk.toLocaleString('id-ID')}</div>
                </div>
                <div style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.2); padding:8px; border-radius:6px;">
                  <div style="color:var(--text-sub); font-size:0.7rem;">Realisasi Biaya</div>
                  <div style="font-weight:700; color:var(--warna-merah); font-size:0.9rem;">Rp ${totalPengeluaran.toLocaleString('id-ID')}</div>
                </div>
              </div>

              <!-- Pos Anggaran Rencana -->
              ${anggaranItems.length > 0 ? `
                <div style="margin-top:10px;">
                  <div style="font-size:0.72rem; font-weight:700; color:var(--text-sub); margin-bottom:4px;">POS ANGGARAN RENCANA:</div>
                  ${anggaranItems.map(a => `
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; padding:3px 0; border-bottom:1px dashed rgba(255,255,255,0.06);">
                      <span>${this.escapeHtml(a.pos)}</span>
                      <span style="font-weight:600;">Rp ${(a.total_rencana || 0).toLocaleString('id-ID')}</span>
                    </div>
                  `).join("")}
                </div>
              ` : ''}

              <!-- Transaksi Pengeluaran Terbaru -->
              ${transItems.length > 0 ? `
                <div style="margin-top:10px;">
                  <div style="font-size:0.72rem; font-weight:700; color:var(--text-sub); margin-bottom:4px;">TRANSAKSI REALISASI TERAKHIR:</div>
                  ${transItems.slice(0, 3).map(t => `
                    <div style="display:flex; justify-content:space-between; font-size:0.72rem; padding:3px 0; color:var(--text-muted);">
                      <span>${this.escapeHtml(t.keterangan || '-')}</span>
                      <span style="color:var(--warna-merah); font-weight:600;">-Rp ${(t.nominal || 0).toLocaleString('id-ID')}</span>
                    </div>
                  `).join("")}
                </div>
              ` : ''}

              <!-- LAPORAN & LPJ KEGIATAN (Plan §6.8 D) -->
              <div style="margin-top:12px; padding-top:10px; border-top:1px dashed rgba(255,255,255,0.1);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                  <span style="font-size:0.75rem; font-weight:700; color:var(--warna-aksen);">📑 LAPORAN LPJ:</span>
                  ${this.canManageEvent(ev) ? `
                    <button class="btn btn-outline" style="padding:2px 8px; font-size:0.7rem;" onclick="App.bukaSusunLPJ('${ev.id}')">+ Susun LPJ</button>
                  ` : ''}
                </div>
                ${laporanItems.length ? laporanItems.map(l => {
                  const penulis = l.expand?.ditulis_oleh?.nama || l.expand?.ditulis_oleh?.username || "Panitia";
                  return `
                    <div style="padding:6px 8px; background:rgba(0,0,0,0.2); border-radius:6px; margin-bottom:4px; font-size:0.75rem;">
                      <div style="display:flex; justify-content:space-between;">
                        <strong>${this.escapeHtml(l.jenis)}</strong>
                        <span style="color:var(--warna-utama); font-weight:600;">[${l.status}]</span>
                      </div>
                      <div style="color:var(--text-muted); font-size:0.7rem; margin-top:2px;">Oleh: ${this.escapeHtml(penulis)}</div>
                    </div>
                  `;
                }).join('') : `<div style="font-size:0.7rem; color:var(--text-muted);">Belum ada laporan yang diajukan.</div>`}
              </div>
            </div>
          </div>
        `;
      }));

      listEl.innerHTML = eventsHtml.join("");
    } catch (e) {
      console.warn("Could not load events", e);
      listEl.innerHTML = `<div style="color:var(--warna-merah); font-size:0.8rem;">Gagal memuat kegiatan komunitas.</div>`;
    }
  },

  async ubahStatusEvent(eventId, currentStatus) {
    const next = prompt(`Status baru (usulan/disetujui/persiapan/berlangsung/selesai/lpj_diajukan/ditutup/dibatalkan):`, currentStatus);
    if (!next || next === currentStatus) return;
    try {
      const res = await fetch(`${this.apiBase}/collections/event/records/${eventId}`, {
        method: "PATCH",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ status: next.trim() })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Gagal"); }
      Hero.setExpression("senang", "Status event udah diperbarui bro!");
      await this.loadEvents();
    } catch (e) {
      alert("Gagal ubah status: " + e.message);
    }
  },

  canManageEvent(ev) {
    if (!this.user) return false;
    if (this.user.role === "admin" || this.user.role === "pengurus") return true;
    return ev.ketua_pelaksana === this.user.id;
  },

  susunPanitia(eventId) {
    const modal = document.getElementById("modal-susun-panitia");
    if (!modal) return;
    document.getElementById("panitia-event-id").value = eventId;
    const select = document.getElementById("panitia-anggota-select");
    if (select) {
      select.innerHTML = (this.allUsers || []).map(u => `<option value="${u.id}">${this.escapeHtml(u.nama || u.username)} (${u.role})</option>`).join('');
    }
    modal.classList.add("show");
  },

  closeSusunPanitiaModal() {
    const modal = document.getElementById("modal-susun-panitia");
    if (modal) modal.classList.remove("show");
  },

  async submitPanitiaEvent() {
    const eventId = document.getElementById("panitia-event-id")?.value;
    const anggotaId = document.getElementById("panitia-anggota-select")?.value;
    const seksi = document.getElementById("panitia-seksi-select")?.value;
    const tugas = document.getElementById("panitia-tugas-input")?.value?.trim() || "";

    if (!eventId || !anggotaId || !seksi) {
      alert("Lengkapi data panitia bro!");
      return;
    }

    try {
      const res = await fetch(`${this.apiBase}/collections/event_panitia/records`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          event: eventId,
          anggota: anggotaId,
          seksi: seksi,
          tugas: tugas,
          ditunjuk_oleh: this.user.id,
          aktif: true
        })
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.message || "Gagal menambah panitia.");
      }
      Hero.setExpression("senang", "Panitia berhasil ditunjuk! Solid selalu!");
      this.closeSusunPanitiaModal();
      await this.loadEvents();
    } catch (e) {
      alert("Gagal susun panitia: " + e.message);
    }
  },

  async ikutEvent(eventId) {
    if (!this.user) return;
    try {
      const res = await fetch(`${this.apiBase}/collections/event_peserta/records`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          event: eventId,
          anggota: this.user.id,
          status: "daftar"
        })
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.message || "Gagal daftar event.");
      }
      Hero.setExpression("senang", "Mantap bro! Kamu sudah terdaftar di event ini. Gaspol!");
      await this.loadEvents();
    } catch (e) {
      alert("Gagal daftar event: " + e.message);
    }
  },

  // ============================================================
  // KOREKSI TRANSAKSI KAS (Plan §6.1 D #4)
  // ============================================================
  openKoreksiKasModal(txId) {
    const tx = (this.allKas || []).find(x => x.id === txId);
    if (!tx) return;
    const modal = document.getElementById("modal-koreksi-kas");
    if (!modal) return;

    document.getElementById("koreksi-target-id").value = tx.id;
    const oppositeJenis = tx.jenis === "masuk" ? "keluar" : "masuk";
    document.getElementById("koreksi-jenis-kebalikan").value = oppositeJenis;
    document.getElementById("koreksi-nominal").value = tx.nominal;
    document.getElementById("koreksi-alasan").value = "";

    const infoEl = document.getElementById("koreksi-target-info");
    if (infoEl) {
      infoEl.innerHTML = `
        <div><strong>Transaksi Asal:</strong> ${this.escapeHtml(tx.keterangan)}</div>
        <div><strong>Jenis:</strong> ${tx.jenis.toUpperCase()} | <strong>Nominal:</strong> Rp ${Number(tx.nominal).toLocaleString('id-ID')} | <strong>Kategori:</strong> ${tx.kategori}</div>
        <div style="color:var(--warna-aksen); margin-top:4px;">Akan dibuat transaksi pembalik jenis: <strong>${oppositeJenis.toUpperCase()}</strong></div>
      `;
    }
    Hero.setExpression("waspada", "Koreksi kas akan mencatat transaksi pembalik. Cek nominalnya baik-baik ya bro!");
    modal.classList.add("show");
  },

  closeKoreksiKasModal() {
    const modal = document.getElementById("modal-koreksi-kas");
    if (modal) modal.classList.remove("show");
  },

  async submitKoreksiKas() {
    const targetId = document.getElementById("koreksi-target-id")?.value;
    const jenis = document.getElementById("koreksi-jenis-kebalikan")?.value;
    const nominal = Number(document.getElementById("koreksi-nominal")?.value);
    const alasan = document.getElementById("koreksi-alasan")?.value?.trim();

    if (!targetId || !nominal || nominal <= 0 || !alasan) {
      alert("Isi alasan koreksi dan nominal yang valid bro!");
      return;
    }

    const txAsal = (this.allKas || []).find(x => x.id === targetId);
    const kategori = txAsal ? txAsal.kategori : "lainnya";

    try {
      const now = new Date();
      const tglStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      const res = await fetch(`${this.apiBase}/collections/kas/records`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          tanggal: tglStr,
          jenis: jenis,
          nominal: nominal,
          kategori: kategori,
          keterangan: `[KOREKSI TX ${targetId.substring(0, 6)}] ${alasan}`,
          dicatat_oleh: this.user.id,
          mengoreksi: targetId
        })
      });

      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.message || "Gagal mencatat koreksi");
      }

      Hero.setExpression("senang", "Transaksi koreksi berhasil disimpan!");
      this.closeKoreksiKasModal();
      await this.refreshData();
    } catch (e) {
      alert("Gagal simpan koreksi: " + e.message);
    }
  },

  // ============================================================
  // LPJ EVENT (Plan §6.8 D)
  // ============================================================
  async bukaSusunLPJ(eventId) {
    const modal = document.getElementById("modal-susun-lpj");
    if (!modal) return;
    document.getElementById("lpj-event-id").value = eventId;

    const infoEl = document.getElementById("lpj-keuangan-otomatis");
    if (infoEl) infoEl.innerHTML = `<div class="empty-state">⏳ Menghitung ringkasan keuangan event...</div>`;
    modal.classList.add("show");

    try {
      const [resDana, resTrans] = await Promise.all([
        fetch(`${this.apiBase}/collections/event_dana/records?filter=(event='${eventId}')`, { headers: this.getAuthHeaders() }),
        fetch(`${this.apiBase}/collections/event_transaksi/records?filter=(event='${eventId}')`, { headers: this.getAuthHeaders() })
      ]);
      const danaItems = resDana.ok ? (await resDana.json()).items : [];
      const transItems = resTrans.ok ? (await resTrans.json()).items : [];

      const totalMasuk = danaItems.reduce((acc, d) => acc + (d.nominal_diterima || 0), 0);
      const totalKeluar = transItems.filter(t => t.jenis === "keluar").reduce((acc, t) => acc + (t.nominal || 0), 0);
      const sisa = totalMasuk - totalKeluar;

      if (infoEl) {
        infoEl.innerHTML = `
          <div style="font-weight:700; margin-bottom:4px;">📊 Ringkasan Keuangan Otomatis Sistem:</div>
          <div>• Total Dana Diterima: <strong>Rp ${totalMasuk.toLocaleString('id-ID')}</strong></div>
          <div>• Total Realisasi Biaya: <strong>Rp ${totalKeluar.toLocaleString('id-ID')}</strong></div>
          <div style="color:var(--warna-utama); font-weight:700;">• Sisa Saldo Event: Rp ${sisa.toLocaleString('id-ID')}</div>
        `;
      }
    } catch (e) {
      if (infoEl) infoEl.innerHTML = `<div style="color:var(--warna-merah);">Gagal menghitung keuangan otomatis.</div>`;
    }
  },

  closeLPJModal() {
    const modal = document.getElementById("modal-susun-lpj");
    if (modal) modal.classList.remove("show");
  },

  async submitLPJEvent() {
    const eventId = document.getElementById("lpj-event-id")?.value;
    const acara = document.getElementById("lpj-jalannya-acara")?.value?.trim() || "";
    const kendala = document.getElementById("lpj-kendala")?.value?.trim() || "";
    const evaluasi = document.getElementById("lpj-evaluasi")?.value?.trim() || "";

    if (!eventId || (!acara && !kendala && !evaluasi)) {
      alert("Lengkapi isi ringkasan laporan event bro!");
      return;
    }

    const gabunganIsi = `JALANNYA ACARA:\n${acara}\n\nKENDALA & SOLUSI:\n${kendala}\n\nEVALUASI:\n${evaluasi}`;

    try {
      const res = await fetch(`${this.apiBase}/collections/event_laporan/records`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          event: eventId,
          jenis: "lpj_keuangan",
          isi: gabunganIsi,
          status: "diajukan",
          ditulis_oleh: this.user.id
        })
      });

      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.message || "Gagal mengajukan LPJ.");
      }

      Hero.setExpression("senang", "Laporan LPJ berhasil diajukan ke pengurus!");
      this.closeLPJModal();
      await this.loadEvents();
    } catch (e) {
      alert("Gagal kirim LPJ: " + e.message);
    }
  },

  // ============================================================
  // DOKUMEN BASECAMP (Plan §6.6 §5)
  // ============================================================
  async loadDokumen() {
    const el = document.getElementById("dokumen-list");
    if (el) el.innerHTML = `<div class="empty-state">⏳ Memuat berkas dokumen...</div>`;
    try {
      const res = await fetch(`${this.apiBase}/collections/dokumen/records?sort=-created&perPage=50`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) throw new Error("Gagal memuat dokumen");
      const data = await res.json();
      const items = data.items || [];
      if (!items.length) {
        if (el) el.innerHTML = `<div class="empty-state">📁 Belum ada dokumen resmi yang diunggah.</div>`;
        return;
      }
      if (el) {
        el.innerHTML = items.map(d => {
          const fileUrl = d.berkas ? `${this.apiBase}/files/${d.collectionId}/${d.id}/${d.berkas}` : "#";
          return `
            <div style="margin-bottom:10px; padding:12px 14px; border-radius:12px; background:var(--bg-card); border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div style="font-weight:700; font-size:0.92rem;">${this.escapeHtml(d.judul)}</div>
                <div style="font-size:0.75rem; color:var(--text-sub); margin-top:2px;">Kategori: ${this.escapeHtml(d.kategori || 'Umum')}</div>
              </div>
              ${d.berkas ? `<a href="${fileUrl}" target="_blank" class="btn btn-outline" style="width:auto; padding:5px 10px; font-size:0.75rem; text-decoration:none;">⬇️ Unduh</a>` : ''}
            </div>
          `;
        }).join('');
      }
    } catch (e) {
      if (el) el.innerHTML = `<div class="empty-state">⚠️ Gagal memuat dokumen.</div>`;
    }
  },

  // ============================================================
  // AUDIT LOG AKTIVITAS (Plan §6.6 §6)
  // ============================================================
  _logLoaded: false,

  async toggleLogAktivitas() {
    const container = document.getElementById("log-aktivitas-container");
    if (!container) return;
    const isVisible = container.style.display !== "none";
    container.style.display = isVisible ? "none" : "block";
    if (!isVisible && !this._logLoaded) {
      await this.loadLogAktivitas();
    }
  },

  async loadLogAktivitas() {
    const el = document.getElementById("log-aktivitas-list");
    if (el) el.innerHTML = `<div class="empty-state">⏳ Memuat log aktivitas...</div>`;
    try {
      const res = await fetch(`${this.apiBase}/collections/log_aktivitas/records?sort=-waktu&perPage=50&expand=aktor`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) throw new Error("Gagal memuat log");
      const data = await res.json();
      const items = data.items || [];
      this._logLoaded = true;
      if (!items.length) {
        if (el) el.innerHTML = `<div class="empty-state">Belum ada catatan log aktivitas.</div>`;
        return;
      }
      if (el) {
        el.innerHTML = items.map(l => {
          const aktor = l.expand?.aktor?.nama || l.expand?.aktor?.username || "Sistem";
          const tgl = l.waktu ? new Date(l.waktu).toLocaleString('id-ID') : "-";
          return `
            <div style="padding:8px 0; border-bottom:1px solid var(--border-color); font-size:0.78rem;">
              <div style="display:flex; justify-content:space-between; color:var(--text-sub); font-size:0.72rem;">
                <span>👤 ${this.escapeHtml(aktor)}</span>
                <span>${tgl}</span>
              </div>
              <div style="font-weight:600; margin-top:2px;">Aksi: <span style="color:var(--warna-utama);">${this.escapeHtml(l.aksi)}</span></div>
              ${l.target ? `<div style="color:var(--text-muted); font-size:0.72rem;">Target: ${this.escapeHtml(l.target)}</div>` : ''}
            </div>
          `;
        }).join('');
      }
    } catch (e) {
      if (el) el.innerHTML = `<div class="empty-state">⚠️ Gagal memuat log aktivitas: ${this.escapeHtml(e.message)}</div>`;
    }
  },

  setupEventListeners() {
    // Auth Form
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const id = document.getElementById("login-identity").value.trim();
        const pass = document.getElementById("login-password").value;
        this.login(id, pass);
      });
    }

    // Navigation Buttons
    document.querySelectorAll(".nav-item").forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Theme & Animations Toggles
    const toggleHemat = document.getElementById("toggle-hemat-animasi");
    if (toggleHemat) {
      toggleHemat.checked = document.body.classList.contains("mode-hemat-animasi");
      toggleHemat.addEventListener("change", (e) => {
        document.body.classList.toggle("mode-hemat-animasi", e.target.checked);
        localStorage.setItem("komunitas_hemat_animasi", e.target.checked.toString());
      });
    }

    const toggleHero = document.getElementById("toggle-sembunyikan-hero");
    if (toggleHero) {
      toggleHero.checked = !Hero.isVisible;
      toggleHero.addEventListener("change", (e) => {
        Hero.toggleVisibility(!e.target.checked);
      });
    }

    const toggleTheme = document.getElementById("toggle-mode-terang");
    if (toggleTheme) {
      toggleTheme.checked = document.documentElement.getAttribute("data-theme") === "light";
      toggleTheme.addEventListener("change", (e) => {
        const th = e.target.checked ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", th);
        localStorage.setItem("komunitas_theme", th);
      });
    }

    // Filter Kas
    document.getElementById("filter-kas-jenis")?.addEventListener("change", () => this.renderKasList());
    document.getElementById("filter-kas-search")?.addEventListener("input", () => this.renderKasList());

    // Period Change
    document.getElementById("iuran-period-select")?.addEventListener("change", async (e) => {
      this.currentPeriod = e.target.value;
      await this.fetchIuran();
      this.renderMarkas();
      this.renderIuran();
    });

    // Close User Menu on click outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#user-dropdown-menu") && !e.target.closest("#user-header-badge")) {
        this.closeUserMenu();
      }
    });
  },

  // ============================================================
  // PENGUMUMAN (F3d-2 / Plan §6.6 §1)
  // ============================================================
  _allPengumuman: [],

  async loadPengumuman() {
    const el = document.getElementById("pengumuman-list");
    if (el) el.innerHTML = `<div class="empty-state">⏳ Memuat pengumuman...</div>`;
    try {
      const res = await fetch(`${this.apiBase}/collections/pengumuman/records?sort=-disematkan,-created&perPage=30`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) throw new Error("Gagal memuat");
      const data = await res.json();
      this._allPengumuman = data.items || [];
      this.renderPengumuman();
      this.renderDashPengumuman();
    } catch (e) {
      if (el) el.innerHTML = `<div class="empty-state">⚠️ Gagal memuat pengumuman. Coba segarkan.</div>`;
    }
  },

  renderPengumuman() {
    const el = document.getElementById("pengumuman-list");
    if (!el) return;
    if (!this._allPengumuman.length) {
      el.innerHTML = `<div class="empty-state">📭 Belum ada pengumuman dari pengurus.</div>`;
      return;
    }
    el.innerHTML = this._allPengumuman.map(p => {
      const kadaluarsa = p.kadaluarsa ? new Date(p.kadaluarsa) < new Date() : false;
      return `<div class="card-item pengumuman-card${p.disematkan ? ' disematkan' : ''}${kadaluarsa ? ' kadaluarsa' : ''}" style="margin-bottom:10px; padding:14px; border-radius:12px; background:var(--bg-card); border:1px solid var(--border-color);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
          <div style="font-weight:700; font-size:0.95rem;">${p.disematkan ? '📌 ' : ''}${this.escapeHtml(p.judul)}</div>
          ${p.penting ? `<span style="background:#ef4444; color:#fff; border-radius:8px; padding:2px 7px; font-size:0.68rem; font-weight:700; flex-shrink:0;">PENTING</span>` : ''}
        </div>
        <div style="color:var(--text-sub); font-size:0.8rem; margin:6px 0;">${this.formatTanggal(p.created)}</div>
        <div style="font-size:0.88rem; line-height:1.6; white-space:pre-wrap;">${this.escapeHtml(p.isi || '')}</div>
        ${kadaluarsa ? `<div style="color:var(--text-muted); font-size:0.73rem; margin-top:6px;">⏰ Sudah kadaluarsa</div>` : ''}
      </div>`;
    }).join('');
  },

  renderDashPengumuman() {
    const container = document.getElementById("dash-pengumuman-container");
    const listEl = document.getElementById("dash-pengumuman-list");
    if (!container || !listEl) return;
    const pinned = this._allPengumuman.filter(p => p.disematkan || p.penting).slice(0, 3);
    if (!pinned.length) { container.style.display = "none"; return; }
    container.style.display = "block";
    listEl.innerHTML = pinned.map(p => `
      <div style="padding:10px 12px; background:var(--bg-card); border-radius:10px; border-left:3px solid ${p.penting ? '#ef4444' : 'var(--warna-utama)'}; margin-bottom:8px; cursor:pointer;" onclick="App.switchTab('pengumuman')">
        <div style="font-weight:600; font-size:0.88rem;">${p.disematkan ? '📌 ' : ''}${this.escapeHtml(p.judul)}</div>
        <div style="font-size:0.75rem; color:var(--text-sub);">${this.formatTanggal(p.created)}</div>
      </div>
    `).join('');
  },

  // ============================================================
  // FORUM (F3d / Plan §6.4)
  // ============================================================
  _allForum: [],
  _currentTopikId: null,
  _currentTopik: null,

  async loadForum() {
    const el = document.getElementById("forum-list");
    if (el) el.innerHTML = `<div class="empty-state">⏳ Memuat topik...</div>`;
    document.getElementById("forum-list").style.display = "block";
    document.getElementById("forum-detail").style.display = "none";
    try {
      const kat = document.getElementById("filter-forum-kat")?.value || "";
      const filter = kat ? `&filter=(kategori='${kat}')` : "";
      const res = await fetch(`${this.apiBase}/collections/forum_topik/records?sort=-disematkan,-created&perPage=30${filter}&expand=penulis`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) throw new Error("Gagal");
      const data = await res.json();
      this._allForum = data.items || [];
      this.renderForumList();
    } catch (e) {
      if (el) el.innerHTML = `<div class="empty-state">⚠️ Gagal memuat forum.</div>`;
    }
  },

  renderForumList() {
    const el = document.getElementById("forum-list");
    if (!el) return;
    if (!this._allForum.length) {
      el.innerHTML = `<div class="empty-state">💬 Belum ada topik diskusi. Jadilah yang pertama buka obrolan!</div>`;
      return;
    }
    const katLabel = { umum: "Umum", tanya_jawab: "Tanya Jawab", saran: "Saran", info_orderan: "Info Orderan", curhat: "Curhat", lainnya: "Lainnya" };
    el.innerHTML = this._allForum.map(t => {
      const penulis = t.expand?.penulis?.nama || t.expand?.penulis?.username || "Anonim";
      return `<div class="card-item forum-topik-card" onclick="App.openTopik('${t.id}')" style="margin-bottom:10px; padding:12px 14px; border-radius:12px; background:var(--bg-card); border:1px solid var(--border-color); cursor:pointer;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
          <div style="font-weight:700; font-size:0.92rem;">${t.disematkan ? '📌 ' : ''}${this.escapeHtml(t.judul)}${t.dikunci ? ' 🔒' : ''}</div>
          <span style="background:var(--bg-input); border-radius:8px; padding:2px 7px; font-size:0.68rem; color:var(--text-sub); flex-shrink:0;">${katLabel[t.kategori] || t.kategori}</span>
        </div>
        <div style="font-size:0.75rem; color:var(--text-sub); margin-top:4px;">${this.escapeHtml(penulis)} · ${this.formatTanggal(t.created)}</div>
      </div>`;
    }).join('');
  },

  async openTopik(id) {
    document.getElementById("forum-list").style.display = "none";
    document.getElementById("forum-detail").style.display = "block";
    document.getElementById("forum-topik-header").innerHTML = `<div class="empty-state">⏳ Memuat topik...</div>`;
    document.getElementById("forum-balasan-list").innerHTML = "";
    this._currentTopikId = id;
    try {
      const [topikRes, balasnRes] = await Promise.all([
        fetch(`${this.apiBase}/collections/forum_topik/records/${id}?expand=penulis`, { headers: this.getAuthHeaders() }),
        fetch(`${this.apiBase}/collections/forum_balasan/records?filter=(topik='${id}')&sort=created&perPage=50&expand=penulis`, { headers: this.getAuthHeaders() })
      ]);
      const topik = await topikRes.json();
      const balasData = await balasnRes.json();
      this._currentTopik = topik;
      const penulis = topik.expand?.penulis?.nama || topik.expand?.penulis?.username || "Anonim";
      document.getElementById("forum-topik-header").innerHTML = `
        <div style="margin-bottom:14px; padding:14px; background:var(--bg-card); border-radius:12px; border:1px solid var(--border-color);">
          <div style="font-weight:700; font-size:1.05rem; margin-bottom:6px;">${this.escapeHtml(topik.judul)}</div>
          <div style="font-size:0.75rem; color:var(--text-sub);">oleh ${this.escapeHtml(penulis)} · ${this.formatTanggal(topik.created)}</div>
          <div style="font-size:0.88rem; line-height:1.6; margin-top:10px; white-space:pre-wrap;">${this.escapeHtml(topik.isi || '')}</div>
          ${topik.dikunci ? `<div style="margin-top:10px; padding:8px; background:rgba(239,68,68,0.1); border-radius:8px; color:#ef4444; font-size:0.8rem;">🔒 Topik ini dikunci, tidak bisa dibalas.</div>` : ''}
        </div>
        <div style="font-weight:700; font-size:0.85rem; color:var(--text-sub); margin-bottom:8px;">${balasData.items?.length || 0} BALASAN</div>`;
      const balasEl = document.getElementById("forum-balasan-list");
      if (!balasData.items?.length) {
        balasEl.innerHTML = `<div style="padding:10px 0; color:var(--text-muted); font-size:0.85rem;">Belum ada balasan. Jadi yang pertama bro!</div>`;
      } else {
        balasEl.innerHTML = balasData.items.map(b => {
          const bp = b.expand?.penulis?.nama || b.expand?.penulis?.username || "Anonim";
          const isMine = b.penulis === this.user?.id;
          return `<div style="margin-bottom:10px; padding:12px 14px; background:var(--bg-card); border-radius:10px; border:1px solid var(--border-color); ${isMine ? 'border-left:3px solid var(--warna-utama);' : ''}">
            <div style="font-weight:600; font-size:0.82rem; color:var(--text-sub); margin-bottom:6px;">${this.escapeHtml(bp)} · ${this.formatTanggal(b.created)}</div>
            <div style="font-size:0.88rem; line-height:1.6; white-space:pre-wrap;">${this.escapeHtml(b.isi || '')}</div>
          </div>`;
        }).join('');
      }
      const balasFrm = document.getElementById("forum-balas-form");
      if (balasFrm) balasFrm.style.display = topik.dikunci ? "none" : "block";
    } catch (e) {
      document.getElementById("forum-topik-header").innerHTML = `<div class="empty-state">⚠️ Gagal memuat topik.</div>`;
    }
  },

  closeForum() {
    document.getElementById("forum-list").style.display = "block";
    document.getElementById("forum-detail").style.display = "none";
    this._currentTopikId = null;
  },

  async kirimBalasan() {
    const isi = document.getElementById("forum-balas-isi")?.value?.trim();
    if (!isi) { alert("Isi balasan tidak boleh kosong bro!"); return; }
    if (!this._currentTopikId) return;
    try {
      const res = await fetch(`${this.apiBase}/collections/forum_balasan/records`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ topik: this._currentTopikId, isi, penulis: this.user.id })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Gagal"); }
      document.getElementById("forum-balas-isi").value = "";
      await this.openTopik(this._currentTopikId);
      Hero.setExpression("senang", "Mantap! Balasan kamu udah masuk bro!");
    } catch (e) {
      alert("Gagal kirim balasan: " + e.message);
    }
  },

  openBuatTopik() {
    const judul = prompt("Judul topik diskusi kamu:");
    if (!judul?.trim()) return;
    const isi = prompt("Isi/deskripsi topik:");
    if (!isi?.trim()) return;
    const kategori = prompt("Kategori (umum/tanya_jawab/saran/info_orderan/curhat/lainnya):", "umum");
    this.submitTopikBaru(judul.trim(), isi.trim(), kategori?.trim() || "umum");
  },

  async submitTopikBaru(judul, isi, kategori) {
    try {
      const res = await fetch(`${this.apiBase}/collections/forum_topik/records`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ judul, isi, kategori, penulis: this.user.id, disematkan: false, dikunci: false })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Gagal"); }
      Hero.setExpression("senang", "Topik baru berhasil dibuat. Gas ngobrolnya bro!");
      await this.loadForum();
    } catch (e) {
      alert("Gagal buat topik: " + e.message);
    }
  },

  // ============================================================
  // PANDUAN (F3d / Plan §6.4)
  // ============================================================
  _allPanduan: [],

  async loadPanduan() {
    const el = document.getElementById("panduan-list");
    if (el) el.innerHTML = `<div class="empty-state">⏳ Memuat panduan...</div>`;
    if (document.getElementById("panduan-detail")) {
      document.getElementById("panduan-detail").style.display = "none";
      document.getElementById("panduan-list").style.display = "block";
    }
    try {
      const res = await fetch(`${this.apiBase}/collections/panduan/records?filter=(diterbitkan=true)&sort=-created&perPage=50`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) throw new Error("Gagal");
      const data = await res.json();
      this._allPanduan = data.items || [];
      this.renderPanduanList(this._allPanduan);
    } catch (e) {
      if (el) el.innerHTML = `<div class="empty-state">⚠️ Gagal memuat panduan.</div>`;
    }
  },

  filterPanduan() {
    const q = (document.getElementById("panduan-search")?.value || "").toLowerCase();
    const filtered = q ? this._allPanduan.filter(p => (p.judul + p.ringkasan + (p.tag || "")).toLowerCase().includes(q)) : this._allPanduan;
    this.renderPanduanList(filtered);
  },

  renderPanduanList(items) {
    const el = document.getElementById("panduan-list");
    if (!el) return;
    if (!items.length) {
      el.innerHTML = `<div class="empty-state">📚 Belum ada panduan yang diterbitkan.</div>`;
      return;
    }
    const katLabel = { masalah_umum: "Masalah Umum", aturan: "Aturan", tutorial: "Tutorial", keselamatan: "Keselamatan", keuangan: "Keuangan", lainnya: "Lainnya" };
    const katColor = { masalah_umum: "#3b82f6", aturan: "#8b5cf6", tutorial: "var(--warna-utama)", keselamatan: "#ef4444", keuangan: "#f59e0b", lainnya: "var(--text-sub)" };
    el.innerHTML = items.map(p => `
      <div onclick="App.openPanduan('${p.id}')" style="margin-bottom:10px; padding:12px 14px; border-radius:12px; background:var(--bg-card); border:1px solid var(--border-color); cursor:pointer;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
          <div style="font-weight:700; font-size:0.92rem;">${this.escapeHtml(p.judul)}</div>
          <span style="background:${katColor[p.kategori] || 'var(--text-sub)'}22; color:${katColor[p.kategori] || 'var(--text-sub)'}; border-radius:8px; padding:2px 7px; font-size:0.68rem; font-weight:600; flex-shrink:0;">${katLabel[p.kategori] || p.kategori}</span>
        </div>
        ${p.ringkasan ? `<div style="font-size:0.8rem; color:var(--text-sub); margin-top:4px;">${this.escapeHtml(p.ringkasan)}</div>` : ''}
        ${p.tag ? `<div style="margin-top:5px;">${p.tag.split(',').map(t => `<span style="background:var(--bg-input); border-radius:6px; padding:1px 6px; font-size:0.68rem; margin-right:4px;">${this.escapeHtml(t.trim())}</span>`).join('')}</div>` : ''}
      </div>
    `).join('');
  },

  openPanduan(id) {
    const p = this._allPanduan.find(x => x.id === id);
    if (!p) return;
    document.getElementById("panduan-list").style.display = "none";
    const detail = document.getElementById("panduan-detail");
    detail.style.display = "block";
    document.getElementById("panduan-detail-content").innerHTML = `
      <div style="padding:14px; background:var(--bg-card); border-radius:12px; border:1px solid var(--border-color);">
        <div style="font-weight:700; font-size:1.1rem; margin-bottom:8px;">${this.escapeHtml(p.judul)}</div>
        ${p.ringkasan ? `<div style="font-size:0.85rem; color:var(--text-sub); margin-bottom:12px; font-style:italic;">${this.escapeHtml(p.ringkasan)}</div>` : ''}
        <div style="font-size:0.9rem; line-height:1.7; white-space:pre-wrap;">${this.escapeHtml(p.isi || '')}</div>
        <div style="margin-top:16px; padding-top:12px; border-top:1px solid var(--border-color); display:flex; gap:10px; align-items:center;">
          <span style="font-size:0.75rem; color:var(--text-muted);">Bagikan ke WhatsApp:</span>
          <a href="https://wa.me/?text=${encodeURIComponent(p.judul + '\n\n' + (p.ringkasan || '') + '\n\nBaca panduan lengkap di Basecamp Ojol.')}" target="_blank" style="color:var(--warna-utama); font-size:0.8rem; text-decoration:none;">📲 Bagikan</a>
        </div>
      </div>`;
  },

  closePanduan() {
    document.getElementById("panduan-list").style.display = "block";
    document.getElementById("panduan-detail").style.display = "none";
  },

  // ============================================================
  // POLLING (F3f / Plan §6.6 §4)
  // ============================================================
  async loadPolling() {
    const el = document.getElementById("polling-list");
    if (el) el.innerHTML = `<div class="empty-state">⏳ Memuat polling...</div>`;
    try {
      const now = new Date().toISOString();
      const res = await fetch(`${this.apiBase}/collections/polling/records?sort=-created&perPage=20&expand=dibuat_oleh`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) throw new Error("Gagal");
      const data = await res.json();
      const items = data.items || [];
      // Ambil suara user untuk tiap polling
      const myVotesRes = await fetch(`${this.apiBase}/collections/polling_suara/records?filter=(anggota='${this.user.id}')&perPage=50`, {
        headers: this.getAuthHeaders()
      });
      const myVotesData = myVotesRes.ok ? await myVotesRes.json() : { items: [] };
      const myVotes = {};
      (myVotesData.items || []).forEach(v => { myVotes[v.polling] = v.pilihan; });
      this.renderPolling(items, myVotes);
    } catch (e) {
      if (el) el.innerHTML = `<div class="empty-state">⚠️ Gagal memuat polling.</div>`;
    }
  },

  renderPolling(items, myVotes) {
    const el = document.getElementById("polling-list");
    if (!el) return;
    if (!items.length) {
      el.innerHTML = `<div class="empty-state">🗳️ Belum ada polling aktif saat ini.</div>`;
      return;
    }
    el.innerHTML = items.map(p => {
      const opsi = (() => { try { return JSON.parse(p.opsi || "[]"); } catch { return []; } })();
      const tutup = p.batas_waktu ? new Date(p.batas_waktu) < new Date() : false;
      const sudahVote = myVotes[p.id];
      const pembuat = p.expand?.dibuat_oleh?.nama || p.expand?.dibuat_oleh?.username || "Pengurus";
      return `<div style="margin-bottom:14px; padding:14px; border-radius:12px; background:var(--bg-card); border:1px solid var(--border-color);">
        <div style="font-weight:700; font-size:0.98rem; margin-bottom:4px;">${this.escapeHtml(p.pertanyaan)}</div>
        <div style="font-size:0.73rem; color:var(--text-sub); margin-bottom:10px;">oleh ${this.escapeHtml(pembuat)} ${tutup ? '· ⏹️ Sudah ditutup' : (p.batas_waktu ? '· ⏰ Tutup ' + this.formatTanggal(p.batas_waktu) : '')}</div>
        ${sudahVote || tutup
          ? opsi.map(o => `<div style="margin-bottom:6px; padding:8px 10px; border-radius:8px; background:var(--bg-input); border:1px solid ${o === sudahVote ? 'var(--warna-utama)' : 'var(--border-color)'}; font-size:0.85rem;">${o === sudahVote ? '✅ ' : ''}${this.escapeHtml(o)}</div>`).join('')
          : opsi.map((o, i) => `<button onclick="App.submitVote('${p.id}','${o.replace(/'/g,"\\'")}',this.closest('[data-pid]'))" data-pid="${p.id}" style="display:block; width:100%; margin-bottom:6px; padding:8px 10px; border-radius:8px; background:var(--bg-input); border:1px solid var(--border-color); color:var(--text-primary); font-size:0.85rem; cursor:pointer; text-align:left;">${this.escapeHtml(o)}</button>`).join('')
        }
        ${sudahVote ? `<div style="font-size:0.75rem; color:var(--warna-utama); margin-top:6px;">✓ Kamu sudah memilih${p.anonim ? '' : ': ' + this.escapeHtml(sudahVote)}</div>` : ''}
      </div>`;
    }).join('');
  },

  async submitVote(pollingId, pilihan, container) {
    try {
      const res = await fetch(`${this.apiBase}/collections/polling_suara/records`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ polling: pollingId, anggota: this.user.id, pilihan })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Gagal"); }
      Hero.setExpression("senang", "Suara kamu udah masuk bro! Makasih udah ikut polling.");
      await this.loadPolling();
    } catch (e) {
      alert("Gagal voting: " + (e.message || "Sudah pernah vote atau terjadi kesalahan."));
    }
  },

  // ============================================================
  // AGENDA & NOTULEN (F3f-2 / Plan §6.6 §3)
  // ============================================================
  async loadAgenda() {
    const el = document.getElementById("agenda-list");
    if (el) el.innerHTML = `<div class="empty-state">⏳ Memuat agenda...</div>`;
    document.getElementById("agenda-list").style.display = "block";
    document.getElementById("agenda-detail").style.display = "none";
    try {
      const res = await fetch(`${this.apiBase}/collections/agenda/records?sort=-tanggal&perPage=20`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) throw new Error("Gagal");
      const data = await res.json();
      this.renderAgendaList(data.items || []);
    } catch (e) {
      if (el) el.innerHTML = `<div class="empty-state">⚠️ Gagal memuat agenda.</div>`;
    }
  },

  renderAgendaList(items) {
    const el = document.getElementById("agenda-list");
    if (!el) return;
    if (!items.length) {
      el.innerHTML = `<div class="empty-state">📅 Belum ada agenda yang dijadwalkan.</div>`;
      return;
    }
    const now = new Date();
    el.innerHTML = items.map(a => {
      const tgl = new Date(a.tanggal);
      const isMendatang = tgl >= now;
      return `<div onclick="App.openAgendaDetail('${a.id}')" style="margin-bottom:10px; padding:12px 14px; border-radius:12px; background:var(--bg-card); border:1px solid ${isMendatang ? 'var(--warna-utama)' : 'var(--border-color)'}; cursor:pointer; display:flex; gap:12px; align-items:flex-start;">
        <div style="text-align:center; min-width:40px; background:${isMendatang ? 'var(--warna-utama)' : 'var(--bg-input)'}; border-radius:8px; padding:4px 6px;">
          <div style="font-size:1.2rem; font-weight:700; color:${isMendatang ? '#fff' : 'var(--text-primary)'};">${tgl.getDate()}</div>
          <div style="font-size:0.65rem; color:${isMendatang ? 'rgba(255,255,255,0.8)' : 'var(--text-sub)'};">${tgl.toLocaleDateString('id-ID', {month:'short'})}</div>
        </div>
        <div>
          <div style="font-weight:700; font-size:0.92rem;">${this.escapeHtml(a.judul)}</div>
          ${a.lokasi ? `<div style="font-size:0.78rem; color:var(--text-sub); margin-top:3px;">📍 ${this.escapeHtml(a.lokasi)}</div>` : ''}
          ${a.catatan ? `<div style="font-size:0.78rem; color:var(--text-muted); margin-top:3px;">${this.escapeHtml(a.catatan).substring(0, 80)}${a.catatan.length > 80 ? '...' : ''}</div>` : ''}
          <div style="font-size:0.68rem; color:var(--text-muted); margin-top:4px;">Klik untuk lihat notulen & kehadiran</div>
        </div>
      </div>`;
    }).join('');
  },

  async openAgendaDetail(id) {
    document.getElementById("agenda-list").style.display = "none";
    const detail = document.getElementById("agenda-detail");
    const content = document.getElementById("agenda-detail-content");
    detail.style.display = "block";
    content.innerHTML = `<div class="empty-state">⏳ Memuat detail agenda...</div>`;
    try {
      const [agRes, notRes, hadRes] = await Promise.all([
        fetch(`${this.apiBase}/collections/agenda/records/${id}`, { headers: this.getAuthHeaders() }),
        fetch(`${this.apiBase}/collections/notulen/records?filter=(agenda='${id}')&expand=penulis`, { headers: this.getAuthHeaders() }),
        fetch(`${this.apiBase}/collections/kehadiran/records?filter=(agenda='${id}')&expand=anggota&perPage=50`, { headers: this.getAuthHeaders() })
      ]);
      const ag = await agRes.json();
      const notData = await notRes.json();
      const hadData = await hadRes.json();
      const notulen = notData.items?.[0];
      const kehadiran = hadData.items || [];
      const myHadir = kehadiran.find(k => k.anggota === this.user?.id);
      const statLabel = { hadir: "✅ Hadir", izin: "📋 Izin", tidak_hadir: "❌ Tidak Hadir" };
      content.innerHTML = `
        <div style="padding:14px; background:var(--bg-card); border-radius:12px; border:1px solid var(--border-color); margin-bottom:12px;">
          <div style="font-weight:700; font-size:1.05rem;">${this.escapeHtml(ag.judul)}</div>
          <div style="font-size:0.8rem; color:var(--text-sub); margin-top:4px;">📅 ${this.formatTanggal(ag.tanggal)}${ag.lokasi ? ' · 📍 ' + this.escapeHtml(ag.lokasi) : ''}</div>
          ${ag.catatan ? `<div style="font-size:0.88rem; line-height:1.6; margin-top:10px; white-space:pre-wrap;">${this.escapeHtml(ag.catatan)}</div>` : ''}
        </div>
        ${notulen ? `<div style="padding:14px; background:var(--bg-card); border-radius:12px; border:1px solid var(--border-color); margin-bottom:12px;">
          <div style="font-weight:700; font-size:0.88rem; margin-bottom:6px;">📝 Notulen Rapat</div>
          <div style="font-size:0.85rem; line-height:1.6; white-space:pre-wrap;">${this.escapeHtml(notulen.isi || '')}</div>
          ${notulen.keputusan ? `<div style="margin-top:10px; padding:8px; background:rgba(31,164,99,0.1); border-radius:8px;">
            <div style="font-weight:600; font-size:0.8rem; color:var(--warna-utama);">📋 Keputusan:</div>
            <div style="font-size:0.83rem; white-space:pre-wrap;">${this.escapeHtml(notulen.keputusan)}</div>
          </div>` : ''}
        </div>` : `<div style="padding:12px; background:var(--bg-input); border-radius:10px; margin-bottom:12px; color:var(--text-muted); font-size:0.83rem;">📝 Notulen belum tersedia</div>`}
        <div style="padding:14px; background:var(--bg-card); border-radius:12px; border:1px solid var(--border-color);">
          <div style="font-weight:700; font-size:0.88rem; margin-bottom:8px;">👥 Kehadiran (${kehadiran.length} tercatat)</div>
          ${!kehadiran.length ? '<div style="color:var(--text-muted); font-size:0.83rem;">Belum ada data kehadiran</div>' : kehadiran.map(k => {
            const nama = k.expand?.anggota?.nama || k.expand?.anggota?.username || "?";
            return `<div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid var(--border-color); font-size:0.83rem;">
              <span>${this.escapeHtml(nama)}</span>
              <span>${statLabel[k.status] || k.status}</span>
            </div>`;
          }).join('')}
          ${!myHadir ? `<div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
            <span style="font-size:0.8rem; color:var(--text-sub);">Tandai kehadiranmu:</span>
            ${['hadir','izin','tidak_hadir'].map(s => `<button onclick="App.tandaiHadir('${id}','${s}')" style="padding:5px 10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-input); color:var(--text-primary); font-size:0.78rem; cursor:pointer;">${statLabel[s]}</button>`).join('')}
          </div>` : `<div style="margin-top:8px; font-size:0.8rem; color:var(--warna-utama);">Status kamu: ${statLabel[myHadir.status]}</div>`}
        </div>`;
    } catch (e) {
      content.innerHTML = `<div class="empty-state">⚠️ Gagal memuat detail agenda.</div>`;
    }
  },

  async tandaiHadir(agendaId, status) {
    try {
      const res = await fetch(`${this.apiBase}/collections/kehadiran/records`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ agenda: agendaId, anggota: this.user.id, status })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Gagal"); }
      Hero.setExpression("senang", "Kehadiran kamu udah tercatat bro!");
      await this.openAgendaDetail(agendaId);
    } catch (e) {
      alert("Gagal tandai kehadiran: " + e.message);
    }
  },

  closeAgenda() {
    document.getElementById("agenda-list").style.display = "block";
    document.getElementById("agenda-detail").style.display = "none";
  },

  // ============================================================
  // PENGADUAN (F3f-3 / Plan §6.6 §2)
  // ============================================================
  initPengaduanTab() {
    this.switchPengaduanTab('baru');
  },

  switchPengaduanTab(tab) {
    ['baru', 'cek'].forEach(t => {
      document.getElementById(`btn-pengaduan-tab-${t}`)?.classList.toggle('active', t === tab);
      document.getElementById(`pengaduan-panel-${t}`)?.style && (document.getElementById(`pengaduan-panel-${t}`).style.display = t === tab ? 'block' : 'none');
    });
  },

  async kirimPengaduan() {
    const isi = document.getElementById("pengaduan-isi")?.value?.trim();
    const kategori = document.getElementById("pengaduan-kategori")?.value;
    const anonim = document.getElementById("pengaduan-anonim")?.checked ?? true;
    const hp = document.getElementById("pengaduan-hp")?.value;
    const resultEl = document.getElementById("pengaduan-result");

    if (hp) return; // Honeypot check
    if (!isi || isi.length < 20) {
      resultEl.innerHTML = `<div class="confirm-warning-box">⚠️ Isi laporan terlalu singkat bro. Ceritakan dengan lebih jelas ya.</div>`;
      return;
    }

    const kode = "RPT-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const body = { kategori, isi, anonim, kode_cek: kode, status: "baru" };
    if (!anonim) body.pelapor = this.user.id;

    try {
      resultEl.innerHTML = `<div class="empty-state">⏳ Mengirim laporan...</div>`;
      const res = await fetch(`${this.apiBase}/collections/pengaduan/records`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(body)
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Gagal"); }
      resultEl.innerHTML = `<div style="padding:14px; border-radius:12px; background:rgba(31,164,99,0.1); border:1px solid var(--warna-utama);">
        <div style="font-weight:700; color:var(--warna-utama); margin-bottom:6px;">✅ Laporan berhasil dikirim!</div>
        <div style="font-size:0.85rem; margin-bottom:8px;">Simpan kode ini untuk memantau status laporan kamu:</div>
        <div style="font-size:1.3rem; font-weight:900; letter-spacing:3px; text-align:center; padding:10px; background:var(--bg-card); border-radius:8px;">${kode}</div>
        <div style="font-size:0.75rem; color:var(--text-sub); margin-top:8px;">Kode cek: <strong>${kode}</strong>. Screenshot halaman ini untuk menyimpan kode.</div>
      </div>`;
      document.getElementById("pengaduan-isi").value = "";
      Hero.setExpression("senang", "Laporan kamu udah sampai ke Dewan Etik. Simpan kode ceknya ya bro!");
    } catch (e) {
      resultEl.innerHTML = `<div class="confirm-warning-box">⚠️ Gagal kirim laporan: ${this.escapeHtml(e.message)}</div>`;
    }
  },

  async cekStatusPengaduan() {
    const kode = (document.getElementById("pengaduan-kode-cek")?.value || "").trim().toUpperCase();
    const resultEl = document.getElementById("pengaduan-status-result");
    if (!kode) { resultEl.innerHTML = `<div class="confirm-warning-box">⚠️ Masukkan kode cek laporan dulu bro.</div>`; return; }
    try {
      resultEl.innerHTML = `<div class="empty-state">⏳ Mencari laporan...</div>`;
      const res = await fetch(`${this.apiBase}/collections/pengaduan/records?filter=(kode_cek='${kode}')&perPage=1`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) throw new Error("Gagal");
      const data = await res.json();
      if (!data.items?.length) {
        resultEl.innerHTML = `<div class="confirm-warning-box">⚠️ Kode tidak ditemukan. Pastikan kamu memasukkan kode yang benar.</div>`;
        return;
      }
      const p = data.items[0];
      const statColor = { baru: "#f59e0b", diproses: "#3b82f6", selesai: "#10b981", ditolak: "#ef4444" };
      const statLabel = { baru: "🟡 Menunggu diproses", diproses: "🔵 Sedang diproses Dewan Etik", selesai: "🟢 Selesai ditangani", ditolak: "🔴 Ditolak" };
      resultEl.innerHTML = `<div style="padding:14px; border-radius:12px; background:var(--bg-card); border:1px solid var(--border-color);">
        <div style="font-weight:700; margin-bottom:6px;">Status Laporan: <span style="color:${statColor[p.status] || '#888'};">${statLabel[p.status] || p.status}</span></div>
        <div style="font-size:0.8rem; color:var(--text-sub);">Kategori: ${this.escapeHtml(p.kategori)} · Dilaporkan: ${this.formatTanggal(p.created)}</div>
        ${p.catatan_dewan ? `<div style="margin-top:10px; padding:8px; background:var(--bg-input); border-radius:8px; font-size:0.85rem;"><strong>Catatan Dewan Etik:</strong><br>${this.escapeHtml(p.catatan_dewan)}</div>` : ''}
      </div>`;
    } catch (e) {
      resultEl.innerHTML = `<div class="confirm-warning-box">⚠️ Gagal cek status.</div>`;
    }
  },

  // ============================================================
  // KONFIGURASI EDITOR (F1b / Plan §6.13)
  // ============================================================
  _konfigurasiLoaded: false,

  async toggleKonfigurasiEditor() {
    const container = document.getElementById("konfigurasi-editor-container");
    if (!container) return;
    const isVisible = container.style.display !== "none";
    container.style.display = isVisible ? "none" : "block";
    if (!isVisible && !this._konfigurasiLoaded) {
      await this.loadKonfigurasi();
    }
  },

  async loadKonfigurasi() {
    const el = document.getElementById("konfigurasi-list-items");
    if (el) el.innerHTML = `<div class="empty-state">⏳ Memuat konfigurasi...</div>`;
    try {
      const res = await fetch(`${this.apiBase}/collections/konfigurasi/records?sort=kunci&perPage=200`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) throw new Error("Gagal memuat");
      const data = await res.json();
      const items = data.items || [];
      this._konfigurasiLoaded = true;
      this.renderKonfigurasi(items);
    } catch (e) {
      if (el) el.innerHTML = `<div class="empty-state">⚠️ Gagal memuat konfigurasi. ${this.escapeHtml(e.message)}</div>`;
    }
  },

  renderKonfigurasi(items) {
    const el = document.getElementById("konfigurasi-list-items");
    if (!el) return;
    if (!items.length) {
      el.innerHTML = `<div class="empty-state">Belum ada parameter konfigurasi.</div>`;
      return;
    }
    const canEdit = this.user && (this.user.role === "admin" || this.user.role === "pengurus");
    el.innerHTML = items.map(k => {
      const nilaiStr = (typeof k.nilai === "object") ? JSON.stringify(k.nilai) : (k.nilai ?? "");
      return `<div style="padding:10px 12px; border-bottom:1px solid var(--border-color); display:flex; flex-direction:column; gap:4px;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <div style="font-weight:700; font-size:0.88rem;">${this.escapeHtml(k.kunci)}</div>
          ${canEdit ? `<button class="btn btn-outline" style="width:auto; padding:3px 8px; font-size:0.72rem;" onclick="App.editKonfigurasi('${k.id}','${this.escapeHtml(k.kunci)}')">✏️ Ubah</button>` : ''}
        </div>
        <div style="font-size:0.82rem; color:var(--text-sub); word-break:break-all;">Nilai: <strong>${this.escapeHtml(nilaiStr)}</strong></div>
        ${k.deskripsi ? `<div style="font-size:0.75rem; color:var(--text-muted);">${this.escapeHtml(k.deskripsi)}</div>` : ''}
        <div style="font-size:0.7rem; color:var(--text-muted);">Wewenang: ${this.escapeHtml(k.wewenang || '-')}</div>
      </div>`;
    }).join('');
  },

  async editKonfigurasi(id, kunci) {
    const current = (this._allKonfigurasi || []).find(x => x.id === id);
    const newVal = prompt(`Nilai baru untuk "${kunci}" (JSON atau teks):`, current ? JSON.stringify(current.nilai) : "");
    if (newVal === null) return;
    let parsed = newVal;
    try { parsed = JSON.parse(newVal); } catch (_) { /* keep as text */ }
    try {
      const res = await fetch(`${this.apiBase}/collections/konfigurasi/records/${id}`, {
        method: "PATCH",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ nilai: parsed, diubah_oleh: this.user.id, diubah_pada: new Date().toISOString() })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Gagal"); }
      Hero.setExpression("senang", "Konfigurasi udah diperbarui bro!");
      this._konfigurasiLoaded = false;
      await this.loadKonfigurasi();
    } catch (e) {
      alert("Gagal ubah konfigurasi: " + e.message);
    }
  },

  // ============================================================
  // DASH PANITIA BANNER (F3g / Plan §6.8 B)
  // ============================================================
  async loadDashPanitiaBanner() {
    const el = document.getElementById("dash-panitia-banner");
    if (!el || !this.user) return;
    try {
      const res = await fetch(`${this.apiBase}/collections/event_panitia/records?filter=(anggota='${this.user.id}' && aktif=true)&expand=event`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) return;
      const data = await res.json();
      const items = data.items || [];
      if (!items.length) { el.style.display = "none"; return; }
      const ev = items[0].expand?.event;
      const namaEvent = ev ? ev.judul : "event";
      const seksi = items[0].seksi || "-";
      el.style.display = "block";
      el.innerHTML = `🎉 Kamu ditunjuk di <strong>${this.escapeHtml(namaEvent)}</strong> sebagai seksi <strong>${this.escapeHtml(seksi)}</strong>. <button onclick="App.switchTab('event')" style="background:none;border:none;color:var(--warna-utama);cursor:pointer;font-weight:700;">Lihat event →</button>`;
    } catch (e) {
      if (el) el.style.display = "none";
    }
  },

  // ============================================================
  // KUESIONER (F3e / Plan §6.5)
  // ============================================================
  _allKuesioner: [],
  _currentKuesioner: null,
  _currentQuestions: [],
  _quizAnswers: {},

  async loadKuesioner() {
    const el = document.getElementById("kuesioner-list");
    const quizEl = document.getElementById("kuesioner-quiz");
    if (quizEl) quizEl.style.display = "none";
    if (el) { el.style.display = "block"; el.innerHTML = `<div class="empty-state">⏳ Memuat kuesioner...</div>`; }
    try {
      const res = await fetch(`${this.apiBase}/collections/kuesioner/records?filter=(aktif=true)&sort=-created&perPage=30`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) throw new Error("Gagal memuat");
      const data = await res.json();
      this._allKuesioner = data.items || [];
      this.renderKuesionerList();
    } catch (e) {
      if (el) el.innerHTML = `<div class="empty-state">⚠️ Gagal memuat kuesioner.</div>`;
    }
  },

  renderKuesionerList() {
    const el = document.getElementById("kuesioner-list");
    if (!el) return;
    if (!this._allKuesioner.length) {
      el.innerHTML = `<div class="empty-state">📝 Belum ada kuesioner aktif.</div>`;
      return;
    }
    el.innerHTML = this._allKuesioner.map(k => `
      <div style="margin-bottom:10px; padding:12px 14px; border-radius:12px; background:var(--bg-card); border:1px solid var(--border-color);">
        <div style="font-weight:700; font-size:0.95rem;">${this.escapeHtml(k.judul)}</div>
        ${k.deskripsi ? `<div style="font-size:0.8rem; color:var(--text-sub); margin-top:4px;">${this.escapeHtml(k.deskripsi)}</div>` : ''}
        <div style="font-size:0.73rem; color:var(--text-muted); margin-top:6px;">Jenis: ${this.escapeHtml(k.jenis)} · Nilai lulus: ${k.nilai_lulus || 70}%</div>
        <button class="btn btn-primary" style="margin-top:8px; width:auto; padding:6px 12px; font-size:0.78rem;" onclick="App.startQuiz('${k.id}')">Mulai Uji</button>
      </div>
    `).join('');
  },

  async startQuiz(id) {
    const k = this._allKuesioner.find(x => x.id === id);
    if (!k) return;
    this._currentKuesioner = k;
    this._quizAnswers = {};
    const listEl = document.getElementById("kuesioner-list");
    const quizEl = document.getElementById("kuesioner-quiz");
    if (listEl) listEl.style.display = "none";
    if (quizEl) { quizEl.style.display = "block"; quizEl.innerHTML = `<div class="empty-state">⏳ Memuat soal...</div>`; }
    try {
      const res = await fetch(`${this.apiBase}/collections/pertanyaan/records?filter=(kuesioner='${id}')&sort=urutan&perPage=100`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) throw new Error("Gagal memuat soal");
      const data = await res.json();
      this._currentQuestions = data.items || [];
      this.renderQuiz();
    } catch (e) {
      if (quizEl) quizEl.innerHTML = `<div class="empty-state">⚠️ Gagal memuat soal.</div>`;
    }
  },

  renderQuiz() {
    const quizEl = document.getElementById("kuesioner-quiz");
    if (!quizEl) return;
    const qs = this._currentQuestions;
    if (!qs.length) {
      quizEl.innerHTML = `<div class="empty-state">Belum ada soal untuk kuesioner ini.</div><button class="btn btn-outline" onclick="App.loadKuesioner()">Kembali</button>`;
      return;
    }
    quizEl.innerHTML = `
      <h3 style="font-size:1.05rem; font-weight:700; margin-bottom:12px;">${this.escapeHtml(this._currentKuesioner.judul)}</h3>
      ${qs.map((q, idx) => {
        const opsi = (() => { try { return JSON.parse(q.opsi || "[]"); } catch { return []; } })();
        return `<div style="margin-bottom:14px; padding:12px; border-radius:12px; background:var(--bg-card); border:1px solid var(--border-color);">
          <div style="font-weight:600; font-size:0.9rem; margin-bottom:8px;">${idx+1}. ${this.escapeHtml(q.teks)}</div>
          ${opsi.length ? opsi.map(o => `<label style="display:block; margin-bottom:4px; font-size:0.85rem;"><input type="radio" name="q_${q.id}" value="${this.escapeHtml(o)}" onchange="App.setQuizAnswer('${q.id}','${this.escapeHtml(o)}')"> ${this.escapeHtml(o)}</label>`).join('') : `<textarea class="form-control" rows="2" placeholder="Jawaban kamu..." onchange="App.setQuizAnswer('${q.id}', this.value)"></textarea>`}
        </div>`;
      }).join('')}
      <button class="btn btn-primary" onclick="App.submitQuiz()">Kirim Jawaban</button>
      <button class="btn btn-outline" style="margin-left:8px;" onclick="App.loadKuesioner()">Batal</button>
    `;
  },

  setQuizAnswer(qId, val) {
    this._quizAnswers[qId] = val;
  },

  async submitQuiz() {
    if (!this._currentKuesioner) return;
    const jawaban = this._currentQuestions.map(q => ({ pertanyaan: q.id, jawaban: this._quizAnswers[q.id] ?? null }));
    try {
      const res = await fetch(`${this.apiBase}/collections/hasil/records`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          kuesioner: this._currentKuesioner.id,
          jawaban: jawaban,
          mulai: new Date().toISOString()
        })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Gagal"); }
      const data = await res.json();
      Hero.setExpression("senang", "Jawaban kamu udah masuk bro!");
      const quizEl = document.getElementById("kuesioner-quiz");
      if (quizEl) {
        quizEl.innerHTML = `<div style="padding:14px; border-radius:12px; background:rgba(31,164,99,0.1); border:1px solid var(--warna-utama);">
          <div style="font-weight:700; color:var(--warna-utama); margin-bottom:6px;">✅ Uji selesai!</div>
          <div style="font-size:0.9rem;">Nilai kamu: <strong>${data.nilai ?? '-'}%</strong> ${data.lulus ? '· ✅ Lulus' : '· ❌ Belum lulus'}</div>
          <button class="btn btn-outline" style="margin-top:10px;" onclick="App.loadKuesioner()">Kembali ke daftar</button>
        </div>`;
      }
    } catch (e) {
      alert("Gagal kirim jawaban: " + e.message);
    }
  },

  // ============================================================
  // MODUL AKTIF (F1b / Plan §6.13 B)
  // ============================================================
  _modulAktif: null,

  async applyModulAktif() {
    if (!this.user) return;
    try {
      const res = await fetch(`${this.apiBase}/collections/konfigurasi/records?filter=(kunci='modul_aktif')&perPage=1`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) return;
      const data = await res.json();
      const item = (data.items || [])[0];
      const mods = (item && Array.isArray(item.nilai)) ? item.nilai : null;
      if (!mods) return;
      this._modulAktif = mods;
      const modSet = new Set(mods);
      const tabToModule = {
        kas: "kas", iuran: "kas",
        struktur: "struktur",
        profil: "profil",
        aturan: "aturan",
        forum: "forum",
        panduan: "panduan",
        kuesioner: "kuesioner",
        event: "event",
        progres: "progres",
        pengumuman: "pengumuman",
        pengaduan: "pengaduan",
        polling: "polling",
        agenda: "agenda"
      };
      document.querySelectorAll(".dropdown-item").forEach(btn => {
        const m = (btn.getAttribute("onclick") || "").match(/switchTab\('([^']+)'\)/);
        if (!m) return;
        const tab = m[1];
        const mod = tabToModule[tab];
        if (mod && !modSet.has(mod)) btn.style.display = "none";
        else btn.style.display = "";
      });
    } catch (e) {}
  },

  // ============================================================
  // HELPER: Format Tanggal
  // ============================================================
  formatTanggal(dt) {
    if (!dt) return "";
    const d = new Date(dt);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
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

window.App = App;
window.addEventListener("DOMContentLoaded", () => App.init());
