// teks.js - Kamus Teks Terpusat Antarmuka Santuy Komunitas Ojol
const Teks = {
  nama_komunitas: "Basecamp Ojol",
  sapaan: "bro",
  nama_hero: "Bang Gas",

  init(komunitas) {
    if (komunitas) {
      if (komunitas.nama) this.nama_komunitas = komunitas.nama;
      if (komunitas.sapaan) this.sapaan = komunitas.sapaan;
      if (komunitas.nama_hero) this.nama_hero = komunitas.nama_hero;
    }
  },

  fmt(str, params = {}) {
    let out = str
      .replace(/{nama_komunitas}/g, this.nama_komunitas)
      .replace(/{sapaan}/g, this.sapaan)
      .replace(/{nama_hero}/g, this.nama_hero);
    for (const [k, v] of Object.entries(params)) {
      out = out.replace(new RegExp(`{${k}}`, "g"), v);
    }
    return out;
  },

  hero: {
    welcome_login: "Yo, {sapaan}! Udah nongkrong di basecamp, yuk login buat cek saldo kas!",
    welcome_dash: "Mantap jiwa, {sapaan}! Ini kondisi pangkalan kita hari ini. Kas aman, aspal lancar!",
    kas_masuk: "Wih ada koin masuk! Rezeki anak soleh pangkalan.",
    kas_keluar_warn: "Eits, cek teliti bos! Transaksi pengeluaran wajib ada foto struk/nota asli ya.",
    confirm_save: "Perhatian penting: Data kas yang udah kesimpan nggak bisa diedit atau dihapus! Cek lagi ya.",
    kas_saved: "Joss gandos! Transaksi udah masuk buku kas dan transparan buat semua {sapaan}.",
    iuran_unpaid: "Bensin masih setengah tangki nih, {sapaan}. Yuk setor iuran bulan ini biar operasional lancar jaya!",
    iuran_paid: "Tangki bensin full tank! Mantap, iuran bulan ini udah beres semua.",
    loading: "Bentar ya {sapaan}, lagi ngebut narik data...",
    error_bukti: "Waduh, bukti belum diupload nih! Pengeluaran wajib ada struknya biar transparan.",
    error_auth: "Waduh, akun atau password-nya keliru bro. Cek lagi ya!"
  },

  auth: {
    title: "Masuk Basecamp",
    subtitle: "Aplikasi Komunitas & Kas Transparan",
    email_or_phone: "Email atau No. WhatsApp",
    password: "Password Akun",
    login_btn: "Nongkrong Sekarang (Login)",
    logout_btn: "Keluar Basecamp",
    admin_notice: "Akun baru didaftarkan langsung oleh Pengurus / Admin ya bro."
  },

  nav: {
    markas: "Markas",
    kas: "Buku Kas",
    iuran: "Iuran",
    anggota: "Anggota",
    pengaturan: "Setelan"
  },

  dashboard: {
    saldo_label: "DOMPET KAS BASECAMP",
    bulan_ini: "Bulan Ini",
    masuk: "Pemasukan",
    keluar: "Pengeluaran",
    bensin_title: "Indikator Setoran Iuran",
    transaksi_terakhir: "5 Transaksi Terbaru",
    status_anggota: "Kesiapan Anggota",
    lihat_semua: "Lihat Semua Transaksi"
  },

  kas: {
    title: "Riwayat Kas Basecamp",
    filter_all: "Semua Jenis",
    filter_masuk: "Masuk Saja",
    filter_keluar: "Keluar Saja",
    export_csv: "Ekspor ke CSV",
    btn_tambah: "+ Catat Kas Baru",
    tgl: "Tanggal",
    kategori: "Kategori",
    keterangan: "Keterangan",
    nominal: "Nominal",
    bukti: "Bukti",
    dicatat: "Dicatat Oleh",
    tanpa_bukti: "Tidak Ada",
    lihat_bukti: "Lihat Foto"
  },

  wizard: {
    step1_title: "Langkah 1: Jenis & Nominal",
    step2_title: "Langkah 2: Keterangan & Struk",
    step3_title: "Langkah 3: Cek & Konfirmasi",
    jenis_label: "Jenis Transaksi",
    nominal_label: "Nominal (Rp)",
    kategori_label: "Kategori Kas",
    keterangan_label: "Keterangan / Keperluan",
    bukti_label: "Foto Bukti / Struk (Wajib untuk Pengeluaran)",
    btn_next: "Lanjut",
    btn_prev: "Kembali",
    btn_simpan: "Kunci & Simpan Transaksi",
    mode_cepat: "Mode Cepat (Form Langsung)"
  }
};

window.Teks = Teks;
