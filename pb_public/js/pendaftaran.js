// js/pendaftaran.js - Pendaftaran Anggota Mandiri & Cek Status
window.AppModules = window.AppModules || {};

window.AppModules.Pendaftaran = {
  async handleDaftarSubmit(e) {
    if (e) e.preventDefault();

    const hp = document.getElementById("reg-honeypot")?.value;
    if (hp) return;

    const nama_lengkap = document.getElementById("reg-nama")?.value.trim();
    const whatsapp = document.getElementById("reg-wa")?.value.trim();
    const domisili = document.getElementById("reg-domisili")?.value.trim() || "";
    const password = document.getElementById("reg-password")?.value;
    const alasan_bergabung = document.getElementById("reg-alasan")?.value.trim() || "";
    const setuju = document.getElementById("reg-setuju")?.checked;

    if (!nama_lengkap || !whatsapp || !password) {
      alert("Harap lengkapi nama, nomor WhatsApp, dan password!");
      return;
    }
    if (password.length < 8) {
      alert("Password minimal 8 karakter!");
      return;
    }
    if (!setuju) {
      alert("Kamu wajib menyetujui aturan dan transparansi basecamp!");
      return;
    }

    try {
      Hero.setExpression("berpikir", "Mengirim formulir pendaftaran pangkalan...");
      const res = await fetch(`${this.apiBase}/komunitas/daftar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama_lengkap,
          whatsapp,
          domisili,
          password,
          alasan_bergabung,
          setuju_privasi: setuju,
          setuju_aturan: setuju
        })
      });

      const data = await res.json();
      if (!res.ok) {
        Hero.setExpression("waspada", "Waduh, pengajuan pendaftaran gagal.");
        alert("Gagal daftar: " + (data.message || JSON.stringify(data)));
        return;
      }

      const msgBox = document.getElementById("daftar-success-msg");
      if (msgBox) {
        msgBox.innerHTML = `
          <div style="font-weight:700; color:var(--warna-utama); margin-bottom:6px;">🎉 PENDAFTARAN BERHASIL DIAJUKAN!</div>
          <div>Simpan <strong>Kode Registrasi</strong> kamu bro:</div>
          <div style="font-size:1.2rem; font-weight:800; letter-spacing:1px; margin:8px 0; color:var(--warna-aksen);">${data.kode_cek}</div>
          <div style="font-size:0.75rem; color:var(--text-sub);">
            Username akun kamu: <strong>${data.username}</strong><br>
            Status akun masih <em>menunggu verifikasi pengurus</em>. Kamu bisa cek berkala di tab <strong>Cek Status</strong>.
          </div>
        `;
        msgBox.style.display = "block";
      }

      document.getElementById("daftar-form").reset();
      Hero.setExpression("senang", "Pendaftaran terkirim! Simpan kode cek kamu ya bro.");
    } catch (err) {
      console.error(err);
      Hero.setExpression("waspada", "Koneksi ke server pendaftaran terganggu.");
      alert("Terjadi kendala jaringan saat mendaftar.");
    }
  },

  async handleCekStatusSubmit(e) {
    if (e) e.preventDefault();
    const kode = document.getElementById("status-kode")?.value.trim().toUpperCase();
    if (!kode) return;

    try {
      Hero.setExpression("berpikir", "Mengecek status pendaftaran...");
      const res = await fetch(`${this.apiBase}/komunitas/cek-status?kode=${encodeURIComponent(kode)}`);
      const data = await res.json();

      const resultBox = document.getElementById("status-result-box");
      if (!resultBox) return;

      if (!res.ok) {
        resultBox.innerHTML = `<span style="color:var(--warna-merah);">❌ ${this.escapeHtml(data.message || 'Kode pendaftaran tidak ditemukan.')}</span>`;
        resultBox.style.display = "block";
        Hero.setExpression("waspada", "Kode pendaftaran nggak ditemukan bro, coba cek lagi.");
        return;
      }

      let statusColor = "var(--warna-aksen)";
      let statusLabel = "⏳ Menunggu Verifikasi Pengurus";
      if (data.status === "disetujui") {
        statusColor = "var(--warna-utama)";
        statusLabel = "✅ Disetujui! Akun kamu sudah aktif.";
      } else if (data.status === "ditolak") {
        statusColor = "var(--warna-merah)";
        statusLabel = "❌ Pendaftaran Belum Diterima";
      }

      resultBox.innerHTML = `
        <div style="font-weight:700; margin-bottom:6px;">Status Pengajuan: <span style="color:${statusColor};">${statusLabel}</span></div>
        <div>👤 Pendaftar: <strong>${this.escapeHtml(data.nama_lengkap || data.nama || '-')}</strong></div>
        <div>📱 Kontak: ${this.escapeHtml(data.whatsapp)}</div>
        <div style="margin-top:6px; font-size:0.78rem; color:var(--text-sub);">
          ${data.status === 'disetujui' ? 'Silakan masuk di tab <strong>Masuk</strong> menggunakan username atau email kamu!' : 'Pengurus basecamp sedang meninjau data kamu.'}
        </div>
      `;
      resultBox.style.display = "block";
      Hero.setExpression("senang", "Ini dia status pendaftaran kamu!");
    } catch (err) {
      console.error(err);
      alert("Gagal memeriksa status: kendala jaringan.");
    }
  }
};
