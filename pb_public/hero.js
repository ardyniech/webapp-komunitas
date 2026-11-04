// hero.js - Karakter Maskot Driver Ojol Pemandu Aplikasi
const Hero = {
  container: null,
  bubbleEl: null,
  avatarEl: null,
  currentExpression: "menyapa",
  isVisible: true,
  autoHideTimer: null,

  init() {
    this.container = document.getElementById("hero-widget");
    if (!this.container) return;

    const savedHidden = localStorage.getItem("komunitas_hide_hero") === "true";
    this.isVisible = !savedHidden;

    this.render();
    if (!this.isVisible) {
      this.container.style.display = "none";
    }

    // Auto-hide bubble awal setelah 4 detik agar tidak menutupi layar
    this.scheduleAutoHide(4000);
  },

  setExpression(expr, text = null) {
    this.currentExpression = expr;
    const svgWrap = this.container ? this.container.querySelector(".hero-avatar-svg") : null;
    if (svgWrap) {
      svgWrap.className = `hero-avatar-svg expr-${expr}`;
    }
    if (text) {
      this.say(text);
    }
  },

  say(text) {
    if (!this.container || !this.isVisible) return;
    const bubble = this.container.querySelector(".hero-bubble-text");
    if (bubble) {
      bubble.innerText = Teks.fmt(text);
      const wrap = this.container.querySelector(".hero-bubble");
      if (wrap) {
        wrap.classList.remove("fade-out");
        wrap.classList.add("fade-in");
        this.scheduleAutoHide(4500); // Otomatis sembunyi setelah 4.5 detik
      }
    }
  },

  scheduleAutoHide(delayMs = 4000) {
    if (this.autoHideTimer) clearTimeout(this.autoHideTimer);
    this.autoHideTimer = setTimeout(() => {
      this.hideBubble();
    }, delayMs);
  },

  toggleVisibility(show) {
    this.isVisible = show;
    localStorage.setItem("komunitas_hide_hero", (!show).toString());
    if (this.container) {
      this.container.style.display = show ? "flex" : "none";
    }
  },

  render() {
    this.container.innerHTML = `
      <div class="hero-bubble fade-in">
        <span class="hero-bubble-text">${Teks.fmt(Teks.hero.welcome_login)}</span>
        <button class="hero-bubble-close" onclick="Hero.hideBubble()" title="Tutup pesan">&times;</button>
      </div>
      <div class="hero-avatar-wrap" onclick="Hero.onAvatarClick()" title="Klik buat sapaan!">
        <div class="hero-avatar-svg expr-${this.currentExpression}">
          <svg viewBox="0 0 100 100" width="68" height="68" xmlns="http://www.w3.org/2000/svg">
            <!-- Bayangan -->
            <ellipse cx="50" cy="94" rx="30" ry="5" fill="rgba(0,0,0,0.2)"/>
            
            <!-- Badan & Jaket Hijau Ojol -->
            <path d="M 24 90 C 24 62 38 58 50 58 C 62 58 76 62 76 90 Z" fill="var(--warna-utama, #10b981)"/>
            <!-- Kerah & Resleting Jaket Hitam -->
            <path d="M 44 58 L 50 72 L 56 58 Z" fill="#1e293b"/>
            <line x1="50" y1="72" x2="50" y2="90" stroke="#f8fafc" stroke-width="2" stroke-dasharray="3,2"/>
            <!-- Strip Reflektor Putih di Dada -->
            <path d="M 28 78 Q 50 84 72 78" stroke="#ffffff" stroke-width="3" fill="none"/>

            <!-- Tangan Kiri & Kanan Berdasarkan Pose -->
            <!-- Tangan Kanan (Kiri Layar) -->
            <g class="arm-right">
              <path d="M 25 68 Q 12 60 16 48" stroke="var(--warna-utama, #10b981)" stroke-width="7" stroke-linecap="round" fill="none"/>
              <!-- Sarung Tangan Jempol -->
              <circle cx="16" cy="46" r="5" fill="#334155"/>
            </g>
            <!-- Tangan Kiri (Kanan Layar) -->
            <g class="arm-left">
              <path d="M 75 68 Q 88 64 84 52" stroke="var(--warna-utama, #10b981)" stroke-width="7" stroke-linecap="round" fill="none"/>
              <circle cx="84" cy="50" r="5" fill="#334155"/>
            </g>

            <!-- Leher -->
            <rect x="44" y="48" width="12" height="12" rx="3" fill="#fbcfe8"/>

            <!-- Kepala & Wajah -->
            <ellipse cx="50" cy="40" rx="19" ry="18" fill="#fed7aa"/>

            <!-- Helm Hijau Khas Ojol -->
            <path d="M 31 38 C 31 16 69 16 69 38 C 69 42 67 44 65 44 L 35 44 C 33 44 31 42 31 38 Z" fill="var(--warna-utama, #10b981)"/>
            <!-- Garis Hitam Helm -->
            <path d="M 34 32 C 40 22 60 22 66 32" stroke="#1e293b" stroke-width="3" fill="none"/>
            <!-- Kaca Helm (Visor) Naik/Buka -->
            <path d="M 32 30 Q 50 24 68 30" stroke="#38bdf8" stroke-width="4" stroke-linecap="round" fill="none"/>

            <!-- Mata & Alis Sesuai Ekspresi -->
            <g class="face-features">
              <ellipse class="eye-left" cx="44" cy="38" rx="2.5" ry="3" fill="#0f172a"/>
              <ellipse class="eye-right" cx="56" cy="38" rx="2.5" ry="3" fill="#0f172a"/>
              <circle cx="45" cy="37" r="1" fill="#ffffff"/>
              <circle cx="57" cy="37" r="1" fill="#ffffff"/>
              <!-- Senyum Ramah -->
              <path class="mouth" d="M 45 44 Q 50 49 55 44" stroke="#0f172a" stroke-width="2" stroke-linecap="round" fill="none"/>
              <!-- Pipi Merona -->
              <circle cx="39" cy="42" r="2.5" fill="#f43f5e" opacity="0.4"/>
              <circle cx="61" cy="42" r="2.5" fill="#f43f5e" opacity="0.4"/>
            </g>
          </svg>
        </div>
      </div>
    `;
  },

  hideBubble() {
    if (this.autoHideTimer) clearTimeout(this.autoHideTimer);
    const wrap = this.container ? this.container.querySelector(".hero-bubble") : null;
    if (wrap) {
      wrap.classList.remove("fade-in");
      wrap.classList.add("fade-out");
    }
  },

  onAvatarClick() {
    const quotes = [
      Teks.fmt("Semangat aspalnya bro! Rezeki ngalir terus asal halal."),
      Teks.fmt("Jangan lupa isi bensin iuran ya, biar basecamp makin kokoh!"),
      Teks.fmt("Kas transparan, anggota tenang, jalanan aman jaya!"),
      Teks.fmt("Ada nota pengeluaran? Cepetan diunggah biar saldo klop.")
    ];
    const q = quotes[Math.floor(Math.random() * quotes.length)];
    this.say(q);
  }
};

window.Hero = Hero;
