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

    return `
      <div class="kas-card">
        <div class="kas-icon-badge ${t.jenis}">
          ${isMasuk ? '🪙' : '🧾'}
        </div>
        <div class="kas-info">
          <div class="kas-keterangan">${this.escapeHtml(t.keterangan)}</div>
          <div class="kas-sub">
            <span>📅 ${t.tanggal ? t.tanggal.split(" ")[0] : '-'}</span>
            <span>🏷️ ${t.kategori}</span>
            <span>👤 ${dicatatOleh}</span>
          </div>
        </div>
        <div style="text-align:right;">
          <div class="kas-nominal ${t.jenis}">${nomStr}</div>
          ${hasBukti ? `
            <button class="btn btn-outline" style="padding:2px 8px; font-size:0.7rem; margin-top:4px;" 
              onclick="App.showBuktiModal('${t.collectionId}', '${t.id}', '${t.bukti}')">
              🖼️ Bukti
            </button>
          ` : ''}
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
        // Fetch sub-data: dana, anggaran, transaksi
        const [resDana, resAnggaran, resTrans] = await Promise.all([
          fetch(`${this.apiBase}/collections/event_dana/records?filter=(event='${ev.id}')`, { headers: this.getAuthHeaders() }),
          fetch(`${this.apiBase}/collections/event_anggaran/records?filter=(event='${ev.id}')`, { headers: this.getAuthHeaders() }),
          fetch(`${this.apiBase}/collections/event_transaksi/records?filter=(event='${ev.id}')&sort=-tanggal`, { headers: this.getAuthHeaders() })
        ]);

        const danaItems = resDana.ok ? (await resDana.json()).items : [];
        const anggaranItems = resAnggaran.ok ? (await resAnggaran.json()).items : [];
        const transItems = resTrans.ok ? (await resTrans.json()).items : [];

        const totalDanaMasuk = danaItems.reduce((acc, d) => acc + (d.nominal_diterima || 0), 0);
        const totalPengeluaran = transItems.filter(t => t.jenis === 'keluar').reduce((acc, t) => acc + (t.nominal || 0), 0);
        const sisaSaldo = totalDanaMasuk - totalPengeluaran;

        const ketuaObj = ev.expand?.ketua_pelaksana;
        const namaKetua = ketuaObj ? (ketuaObj.nama || ketuaObj.username) : "Belum ditentukan";

        const statusColor = ev.status === "selesai" || ev.status === "ditutup" ? "#10b981" :
                            (ev.status === "persiapan" || ev.status === "berlangsung" ? "var(--warna-aksen)" : "var(--text-sub)");

        const tglText = ev.tanggal_mulai ? new Date(ev.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : "-";

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
            </div>

            ${ev.deskripsi ? `
              <div style="font-size:0.8rem; color:var(--text-main); line-height:1.4;">${this.escapeHtml(ev.deskripsi)}</div>
            ` : ''}

            <div style="font-size:0.75rem; color:var(--text-sub);">
              👤 <strong>Ketua Pelaksana:</strong> ${this.escapeHtml(namaKetua)} • 🎯 <strong>Target:</strong> ${ev.target_peserta || 0} Pejuang Aspal
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
