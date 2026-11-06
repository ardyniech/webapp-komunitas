// js/app-fetch.js - Fetcher data inti (kas, anggota, iuran) — atomik dari app.js, <200 baris.
window.AppModules = window.AppModules || {};

window.AppModules.AppFetch = {
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
};
