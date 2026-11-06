// js/pendaftaran.js - Pendaftaran Anggota Mandiri & Cek Status
window.AppModules = window.AppModules || {};

window.AppModules.Pendaftaran = {
  async handleDaftarSubmit(e) {
    if (e) e.preventDefault();

    const hp = document.getElementById("reg-honeypot")?.value;
    if (hp) return;

    const nama_lengkap = document.getElementById("reg-nama")?.value.trim();
    const whatsapp = document.getElementById("reg-wa")?.value.trim();
    const email = document.getElementById("reg-email")?.value.trim().toLowerCase();
    const domisili = document.getElementById("reg-domisili")?.value.trim() || "";
    const password = document.getElementById("reg-password")?.value;
    const alasan_bergabung = document.getElementById("reg-alasan")?.value.trim() || "";
    const setuju = document.getElementById("reg-setuju")?.checked;
    const btn = document.querySelector('#daftar-form button[type="submit"]');
    const btnLabel = btn ? btn.innerHTML : "";

    if (!nama_lengkap || !whatsapp || !email || !password) {
      alert("Harap lengkapi nama, nomor WhatsApp, email, dan password!");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Format email tidak valid. Gunakan email aktif yang bisa kamu buka.");
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

    if (btn) { btn.disabled = true; btn.innerHTML = "⏳ Mengirim ke server..."; }
    try {
      Hero.setExpression("berpikir", "Mengirim formulir pendaftaran pangkalan...");
      const res = await fetch(`${this.apiBase}/komunitas/daftar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama_lengkap,
          whatsapp,
          email,
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
        alert("Gagal daftar: " + (data.error || data.message || JSON.stringify(data)));
        if (btn) { btn.disabled = false; btn.innerHTML = btnLabel; }
        return;
      }

      const msgBox = document.getElementById("daftar-success-msg");
      if (msgBox) {
        msgBox.innerHTML = `
          <div style="font-weight:700; color:var(--warna-utama); margin-bottom:6px;">🎉 PENDAFTARAN BERHASIL DIAJUKAN + SERVER TERIMA!</div>
          <div>Kode cek kamu:</div>
          <div style="font-size:1.2rem; font-weight:800; letter-spacing:1px; margin:8px 0; color:var(--warna-aksen);">${data.kode_cek}</div>
          <div style="font-size:0.78rem; color:var(--text-sub); line-height:1.5;">
            ✅ Data masuk server (diterima).<br>
            ⏳ Status: <em>menunggu verifikasi admin</em> (tidak otomatis aktif).<br>
            🔑 Setelah disetujui: masuk pakai <strong>email ${data.email || email}</strong> + password yang kamu buat. Username (${data.username}) dibuat sistem, tidak perlu dihafal.<br>
            🔍 Pantau berkala di tab <strong>Cek Status</strong> dengan kode di atas.
          </div>
        `;
        msgBox.style.display = "block";
      }

      document.getElementById("daftar-form").reset();
      Hero.setExpression("senang", "Pendaftaran tercatat di server! Simpan kode cek kamu ya bro.");
    } catch (err) {
      console.error(err);
      // Bedakan: network gagal vs response lambat. Jangan vonis "gagal jaringan" membabi-buta.
      const network = err instanceof TypeError || /network|fetch|failed/i.test(String(err && err.message));
      Hero.setExpression("waspada", network ? "Koneksi ke server putus/pelan. Pastikan WiFi/data menyala, lalu coba lagi." : "Terjadi kesalahan saat mendaftar.");
      alert(network
        ? "Koneksi ke server gagal/terputus.\n\nPastikan WiFi/data menyala, lalu tekan kirim ulang.\nData BELUM terkirim (tidak ada kode cek)."
        : "Gagal mendaftar: " + (err.message || err));
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = btnLabel; }
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
