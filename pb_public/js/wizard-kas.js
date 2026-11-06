// js/wizard-kas.js - Wizard Input Transaksi Kas
window.AppModules = window.AppModules || {};

window.AppModules.WizardKas = {
  openCatatKas() {
    this.wizardStep = 1;
    this.wizardData = {
      jenis: "masuk",
      nominal: 0,
      kategori: "iuran",
      keterangan: "",
      buktiFile: null,
      modeCepat: false
    };
    const modal = document.getElementById("wizard-modal");
    if (modal) modal.classList.add("show");
    this.renderWizardStep();
    Hero.setExpression("senang", Teks.hero.catat_kas);
  },

  toggleModeCepat() {
    const cb = document.getElementById("wiz-mode-cepat");
    const nomInput = document.getElementById("wiz-nominal");
    const jenisSel = document.getElementById("wiz-jenis");
    const katSel = document.getElementById("wiz-kategori");
    this.wizardData.modeCepat = cb.checked;
    if (cb.checked) {
      // Isi otomatis dari konfigurasi komunitas (iuran_default) atau default 20000
      const nominalOtomatis = Number(this.komunitas && this.komunitas.iuran_default ? this.komunitas.iuran_default : 20000);
      this.wizardData.nominal = nominalOtomatis;
      this.wizardData.kategori = "iuran";
      this.wizardData.jenis = "masuk";
      if (nomInput) nomInput.value = nominalOtomatis;
      if (jenisSel) jenisSel.value = "masuk";
      if (katSel) {
        katSel.innerHTML = `
          <option value="iuran">Iuran Anggota</option>
          <option value="donasi">Donasi / Sukarela</option>
          <option value="sisa_dana_event">Sisa Dana Event</option>
          <option value="lainnya">Pemasukan Lainnya</option>
        `;
        katSel.value = "iuran";
      }
      Hero.setExpression("berpikir", "Mode cepat aktif — nominal diisi otomatis dari konfigurasi komunitas.");
    } else {
      this.wizardData.nominal = 0;
      if (nomInput) nomInput.value = "";
      Hero.setExpression("senang", Teks.hero.catat_kas);
    }
  },

  closeWizard() {
    const modal = document.getElementById("wizard-modal");
    if (modal) modal.classList.remove("show");
  },

  renderWizardStep() {
    const panels = document.querySelectorAll(".wizard-panel");
    panels.forEach(p => p.classList.remove("active"));
    const curPanel = document.getElementById(`wizard-step-${this.wizardStep}`);
    if (curPanel) curPanel.classList.add("active");

    const indicators = document.querySelectorAll(".step-indicator");
    indicators.forEach((ind, idx) => {
      ind.classList.toggle("active", (idx + 1) === this.wizardStep);
    });

    if (this.wizardStep === 3) {
      // Ringkasan ditulis ke container yang benar-benar ada di HTML
      const sumEl = document.getElementById("wizard-summary-content");
      if (sumEl) {
        const buktiLabel = this.wizardData.buktiFile ? this.wizardData.buktiFile.name : (this.wizardData.jenis === 'keluar' ? '⚠️ Wajib ada!' : 'Tidak ada');
        sumEl.innerHTML =
          `<div><b>Jenis:</b> ${this.escapeHtml(this.wizardData.jenis.toUpperCase())}</div>` +
          `<div><b>Nominal:</b> Rp ${Number(this.wizardData.nominal).toLocaleString('id-ID')}</div>` +
          `<div><b>Kategori:</b> ${this.escapeHtml(this.wizardData.kategori || '-')}</div>` +
          `<div><b>Keterangan:</b> ${this.escapeHtml(this.wizardData.keterangan || '-')}</div>` +
          `<div><b>Bukti:</b> ${this.escapeHtml(buktiLabel)}</div>`;
      }
    }
  },

  wizardNext() {
    if (this.wizardStep === 1) {
      if (this.wizardData.modeCepat) {
        // Mode cepat: lewati step 2, langsung ke konfirmasi (step 3)
        this.wizardData.keterangan = `Iuran ${this.currentPeriod || ""} — mode cepat`;
        this.wizardStep = 3;
        this.renderWizardStep();
        return;
      }
      const checked = document.querySelector('input[name="wiz-jenis"]:checked');
      if (!checked) return;
      this.wizardData.jenis = checked.value;
      const selectKategori = document.getElementById("wiz-kategori");
      if (selectKategori) {
        if (this.wizardData.jenis === "masuk") {
          selectKategori.innerHTML = `
            <option value="iuran">Iuran Anggota</option>
            <option value="donasi">Donasi / Sukarela</option>
            <option value="sisa_dana_event">Sisa Dana Event</option>
            <option value="lainnya">Pemasukan Lainnya</option>
          `;
        } else {
          selectKategori.innerHTML = `
            <option value="operasional">Operasional Basecamp</option>
            <option value="sosial">Bantuan Sosial / Sakit</option>
            <option value="dana_event">Pencairan Dana Event</option>
            <option value="lainnya">Pengeluaran Lainnya</option>
          `;
        }
      }
    } else if (this.wizardStep === 2) {
      const nom = Number(document.getElementById("wiz-nominal").value);
      if (!nom || nom <= 0) {
        alert("Nominal harus lebih dari 0!");
        return;
      }
      this.wizardData.nominal = nom;
      this.wizardData.kategori = document.getElementById("wiz-kategori").value;
    } else if (this.wizardStep === 3) {
      const ket = document.getElementById("wiz-keterangan").value.trim();
      if (!ket) {
        alert("Keterangan transaksi wajib diisi!");
        return;
      }
      this.wizardData.keterangan = ket;
      const fileInput = document.getElementById("wiz-bukti");
      this.wizardData.buktiFile = fileInput.files[0] || null;

      if (this.wizardData.jenis === "keluar" && !this.wizardData.buktiFile) {
        alert("Peringatan: Pengeluaran wajib ada foto nota/struk bukti!");
        Hero.setExpression("waspada", Teks.hero.bukti_wajib);
        return;
      }
    }

    if (this.wizardStep < 4) {
      this.wizardStep++;
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
      formData.append("tanggal", `${today} 12:00:00.000Z`);
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
        throw new Error(err.message || "Gagal menyimpan");
      }

      Hero.setExpression("senang", Teks.hero.sukses_kas);
      this.closeWizard();
      await this.refreshData();
    } catch (err) {
      console.error(err);
      Hero.setExpression("waspada", "Waduh, gagal mencatat transaksi!");
      alert("Gagal mencatat transaksi: " + err.message);
    }
  }
};
