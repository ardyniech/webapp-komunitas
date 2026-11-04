# Plan: Webapp Komunitas Ringan (Anggota + Kas Transparan)

Dokumen ini untuk AI dev yang mengerjakan proyek di server. Baca seluruhnya sebelum menulis kode. Kerjakan per tahap, jangan loncat.

## 1. Tujuan

Webapp untuk mengelola komunitas kecil (di bawah 100 anggota) agar data anggota dan keuangan transparan. Semua anggota bisa melihat saldo dan riwayat kas. Hanya pengurus yang bisa mengubah data.

## 2. Prinsip (wajib)

1. **Ringan.** Server hanya laptop tua: RAM 8GB, SSD 250GB, dan dipakai bersama service lain. Target pemakaian aplikasi ini di bawah 150MB RAM saat idle.
2. **Sederhana.** Satu service backend, satu database file. Dilarang menambah Postgres, Redis, queue, Socket.IO, atau microservices.
3. **Transparan.** Transaksi kas tidak boleh dihapus atau diedit. Koreksi dilakukan dengan transaksi baru.
4. **Mobile-first.** Anggota membuka dari HP. Jadikan PWA.
5. **Ikuti aturan server.** Baca `/home/ardy/AGENTS.md` dulu. Service internal di-bind ke IP Tailscale, bukan `127.0.0.1`. Dokumentasi taruh di `/home/ardy/docs`.

## 3. Stack

| Bagian | Pilihan |
|---|---|
| Backend + DB + Auth + Admin UI | **PocketBase** (satu binary Go, SQLite bawaan). Pakai rilis stabil terbaru, cek dokumentasi resmi untuk sintaks aturan akses |
| Frontend | HTML + htmx **atau** SvelteKit/React yang di-build jadi file statis (pilih satu saja, utamakan yang paling sederhana) |
| Reverse proxy | Caddy |
| Akses publik | Cloudflare Tunnel (tanpa buka port router) |
| Proses | systemd service (bukan Docker, kecuali ada alasan kuat) |

Frontend statis diletakkan di folder `pb_public` PocketBase atau disajikan Caddy.

## 4. Peran pengguna

| Role | Hak |
|---|---|
| `admin` | Kelola anggota, role, pengaturan |
| `pengurus` | Kelola konten komunitas (panduan, pengumuman, kuesioner, moderasi forum) |
| `bendahara` | Input kas dan iuran |
| `anggota` | Baca saldo, riwayat kas, daftar anggota (data terbatas), agenda |

Field `role` ada di collection auth `users`. Anggota baru tidak boleh mendaftar sendiri; admin yang membuat akun.

## 5. Skema data

**users** (auth collection bawaan PocketBase, tambah field)
- `nama` (text, wajib)
- `kontak` (text)
- `role` (select: admin, pengurus, bendahara, anggota). Menentukan hak akses dasar
- `tim` (select multiple: dewan_etik, satgas, pengurus_tetap, pengurus_harian). Keanggotaan unit struktur, dipakai untuk aturan akses khusus
- `izin` (json, daftar izin efektif; **diisi hook** dari jabatan dan pemetaan izin di 6.13, tidak bisa diubah user)
- Field profil tambahan (nama panggilan, WhatsApp, domisili, bidang kustom, dll.) ada di 5.8
- `foto` (file, gambar, opsional)
- `status` (select: menunggu, aktif, nonaktif, ditolak). Login **hanya** untuk `aktif` (atur lewat auth rule collection users). Lihat 6.12
- `tanggal_gabung` (date)

**kas** (transaksi)
- `tanggal` (date, wajib)
- `jenis` (select: masuk, keluar)
- `nominal` (number, > 0)
- `kategori` (select: iuran, donasi, operasional, sosial, dana_event, sisa_dana_event, lainnya)
- `keterangan` (text, wajib)
- `bukti` (file, gambar; wajib jika jenis = keluar)
- `dicatat_oleh` (relation ke users)
- `mengoreksi` (relation ke kas, opsional, untuk transaksi koreksi)
- `event` (relation ke event, opsional; terisi untuk `dana_event` dan `sisa_dana_event`, lihat 5.4)

**iuran**
- `anggota` (relation ke users)
- `periode` (text, format YYYY-MM)
- `nominal` (number)
- `status` (select: lunas, belum)
- `kas` (relation ke kas, opsional, terisi saat lunas)

**agenda** (opsional, tahap akhir)
- `judul`, `tanggal`, `lokasi`, `catatan`

## 5.1 Aturan akses (API rules PocketBase)

- `kas`: list/view untuk semua user login. Create hanya `admin` atau `bendahara`. **Update dan delete dikunci (null).**
- `iuran`: list/view untuk semua user login. Create/update hanya `admin` atau `bendahara`. Delete dikunci.
- `users`: anggota hanya membaca dan mengubah dirinya sendiri. Anggota lain dilihat lewat `profil_publik` (5.8). Role dan izin hanya bisa diubah pihak berwenang. Detail lengkap di 5.9.
- `agenda`: baca semua user login, tulis admin.

Tulis aturan ini lalu **uji dengan akun anggota biasa** untuk memastikan tidak bisa menulis atau menghapus.

## 5.2 Skema Tambahan (fitur komunitas)

Semua collection tambahan dibuat lewat migrasi, sama seperti collection inti.

**komunitas** (satu record saja, pengaturan dan identitas)
- `nama` (text, wajib), `tagline` (text)
- `logo` (file: png/jpg/webp saja, maks 500KB; **SVG dilarang** karena risiko XSS)
- `warna_utama`, `warna_aksen` (text hex)
- `nama_hero` (text, default "Hero"), `sapaan` (text, default "bro")
- `tentang`, `visi_misi` (editor teks)
- `kontak` (text), `iuran_default` (number)

**unit** (struktur komunitas)
- `nama`, `jenis` (select: dewan_etik, satgas, pengurus_tetap, pengurus_harian, lainnya)
- `deskripsi`, `tugas` (text), `urutan` (number)

**jabatan** (siapa menjabat apa)
- `unit` (relation), `anggota` (relation ke users), `jabatan` (text, misal Ketua, Sekretaris, Anggota)
- `periode_mulai`, `periode_selesai` (date), `aktif` (bool)

**pengumuman**
- `judul`, `isi`, `penting` (bool), `disematkan` (bool), `kadaluarsa` (date, opsional), `penulis` (relation)

**forum_topik**
- `judul`, `isi`, `kategori` (select: umum, tanya_jawab, saran, info_orderan, curhat, lainnya)
- `penulis` (relation), `disematkan` (bool), `dikunci` (bool)

**forum_balasan**
- `topik` (relation), `isi`, `penulis` (relation)

**panduan** (blog/pusat bantuan untuk masalah yang sering muncul)
- `judul`, `slug` (unik), `ringkasan`, `isi` (editor teks)
- `kategori` (select: masalah_umum, aturan, tutorial, keselamatan, keuangan, lainnya), `tag` (text)
- `sampul` (file gambar, opsional), `diterbitkan` (bool), `penulis` (relation)

**kuesioner**
- `judul`, `deskripsi`
- `jenis` (select: uji_pengetahuan, evaluasi, survei)
- `nilai_lulus` (number, persen), `acak_soal` (bool), `batas_waktu_menit` (number, opsional)
- `aktif` (bool), `dibuat_oleh` (relation)

**pertanyaan**
- `kuesioner` (relation), `urutan` (number), `teks`
- `tipe` (select: pilihan_ganda, benar_salah, esai_singkat, skala)
- `opsi` (json, untuk pilihan ganda), `bobot` (number, default 1), `penjelasan` (text, tampil setelah jawab)
- `pasal` (relation ke aturan_pasal, opsional; menautkan soal ke aturan yang diuji)

**kunci_jawaban** (**terpisah** dari pertanyaan supaya tidak bocor lewat API)
- `pertanyaan` (relation), `jawaban` (json)

**siklus_penyaringan** (penyaringan berkala)
- `kuesioner` (relation), `label` (misal "Triwulan I 2027"), `mulai`, `selesai` (date), `wajib_semua` (bool)

**hasil** (satu percobaan mengerjakan kuesioner)
- `kuesioner` (relation), `siklus` (relation, opsional), `anggota` (relation)
- `jawaban` (json), `nilai` (number, **diisi server**), `lulus` (bool, **diisi server**)
- `mulai`, `selesai` (datetime)

**pembinaan** (tindak lanjut bagi yang belum lulus, diurus manusia)
- `anggota` (relation), `hasil` (relation), `catatan` (text), `tindakan` (text)
- `status` (select: perlu_dibina, dalam_pembinaan, selesai), `ditangani_oleh` (relation)

**pengaduan** (laporan ke Dewan Etik)
- `kategori`, `isi`, `anonim` (bool), `pelapor` (relation, kosong jika anonim)
- `kode_cek` (text acak, untuk pelapor anonim cek status), `status` (select: baru, diproses, selesai, ditolak), `catatan_dewan` (text)

**polling** dan **polling_suara**
- `polling`: `pertanyaan`, `opsi` (json), `anonim` (bool), `batas_waktu` (datetime), `dibuat_oleh`
- `polling_suara`: `polling`, `anggota`, `pilihan` (satu suara per anggota per polling, dikunci unik)

**notulen** dan **kehadiran** (terkait agenda)
- `notulen`: `agenda` (relation), `isi`, `keputusan` (text), `penulis`
- `kehadiran`: `agenda`, `anggota`, `status` (hadir, izin, tidak hadir)

**dokumen** (AD/ART, aturan, template)
- `judul`, `berkas` (file pdf/gambar), `kategori`, `hanya_pengurus` (bool)

**log_aktivitas** (jejak aksi penting, hanya ditulis oleh hook server)
- `aktor` (relation), `aksi` (text), `target` (text), `waktu` (datetime)

**pangkat** (gamifikasi ringan, opsional tahap akhir)
- Dihitung dari kehadiran, iuran lunas, dan lulus uji. Hanya tampilan, tidak memengaruhi hak akses.

## 5.3 Aturan Akses Tambahan

- `komunitas`: **view terbuka untuk publik hanya field branding** (nama, tagline, logo, warna) supaya halaman login bisa tampil sesuai identitas. Field lain hanya untuk user login. Update hanya `admin`.
- `unit`, `jabatan`: baca semua user login, tulis hanya `admin`.
- `pengumuman`: baca semua user login, tulis `admin` atau `pengurus`.
- `forum_topik`, `forum_balasan`: baca dan buat oleh semua user login. Edit/hapus hanya milik sendiri atau `pengurus`/`admin` (moderasi). Topik yang `dikunci` tidak boleh dibalas.
- `panduan`: user login hanya melihat yang `diterbitkan = true`. Tulis hanya `pengurus`/`admin`.
- `kuesioner`, `pertanyaan`: baca untuk user login hanya yang `aktif`. Tulis hanya `pengurus`/`admin`.
- `kunci_jawaban`: **tidak boleh dibaca anggota sama sekali.** Hanya `pengurus`/`admin`.
- `hasil`: anggota hanya boleh **membuat** hasil atas namanya sendiri dan melihat hasilnya sendiri. Nilai dan lulus dihitung **server** lewat hook (lihat 6.5), anggota tidak boleh mengirim nilai sendiri. Update dan delete dikunci. `pengurus` dan anggota tim `dewan_etik` boleh melihat semua hasil.
- `pembinaan`: hanya `admin` dan anggota tim `dewan_etik`.
- `pengaduan`: anggota boleh membuat dan melihat laporan miliknya (anonim dicek lewat `kode_cek`). Hanya `dewan_etik` dan `admin` yang boleh melihat semua dan mengubah status. Laporan anonim **tidak boleh** menyimpan identitas pelapor di record maupun log.
- `polling_suara`: satu suara per anggota per polling. Hasil agregat boleh dilihat semua, tetapi siapa memilih apa disembunyikan jika `anonim`.
- `dokumen`: baca semua user login (kecuali `hanya_pengurus`), tulis `pengurus`/`admin`.
- `log_aktivitas`: hanya baca oleh `admin`. Tulis hanya oleh hook server.

Seperti sebelumnya, **uji semua aturan dengan akun anggota biasa** sebelum tahap dianggap selesai.

## 5.4 Skema Event Komunitas

Event adalah kegiatan berpanitia (kopdar, bakti sosial, rapat akbar, pelatihan, olahraga, syukuran, dan sejenisnya). Berbeda dengan `agenda` yang hanya jadwal kumpul rutin.

**event**
- `judul`, `jenis` (select: kopdar, bakti_sosial, rapat_akbar, pelatihan, olahraga, syukuran, lainnya)
- `deskripsi`, `tujuan`, `lokasi`, `tanggal_mulai`, `tanggal_selesai`, `target_peserta` (number), `sampul` (file gambar, opsional)
- `status` (select: usulan, disetujui, persiapan, berlangsung, selesai, lpj_diajukan, ditutup, dibatalkan)
- `ketua_pelaksana` (relation ke users, **ditunjuk pengurus/admin**)
- `ditunjuk_oleh` (relation), `disetujui_oleh` (relation), `tanggal_persetujuan` (datetime), `catatan_persetujuan` (text)

**event_panitia** (tim yang **dipilih sendiri oleh ketua pelaksana**)
- `event` (relation), `anggota` (relation ke users)
- `seksi` (select: ketua_pelaksana, wakil, sekretaris, bendahara, acara, humas, perlengkapan, konsumsi, dokumentasi, keamanan, lainnya)
- `tugas` (text), `ditunjuk_oleh` (relation), `aktif` (bool)

**event_tugas** (checklist kerja dari persiapan sampai selesai)
- `event`, `judul`, `penanggung_jawab` (relation ke users), `tenggat` (date)
- `status` (select: belum, berjalan, selesai), `catatan` (text)

**event_anggaran** (RAB, rencana anggaran biaya)
- `event`, `pos` (text, misal Konsumsi), `uraian`, `volume`, `satuan`, `harga_satuan`
- `total_rencana` (number, **dihitung server** dari volume x harga_satuan)

**event_dana** (sumber dana, harus jelas dari mana)
- `event`, `jenis` (select: kas_komunitas, sponsor, donasi, iuran_peserta, lainnya)
- `nama_sumber` (text, misal nama sponsor), `rencana_nominal` (number)
- `nominal_diterima` (number, **dihitung server** dari transaksi), `keterangan`

**event_transaksi** (semua uang masuk dan keluar event)
- `event`, `tanggal`, `jenis` (select: masuk, keluar), `nominal` (number, > 0), `keterangan` (wajib)
- `sumber_dana` (relation ke event_dana, **wajib untuk jenis masuk**)
- `pos_anggaran` (relation ke event_anggaran, **wajib untuk jenis keluar**)
- `bukti` (file gambar/pdf, **wajib untuk jenis keluar**)
- `dicatat_oleh` (relation), `mengoreksi` (relation ke event_transaksi, opsional)
- `verifikasi` (select: belum, terverifikasi, ditolak), `diverifikasi_oleh` (relation), `catatan_verifikasi`

**event_peserta**
- `event`, `anggota`, `status` (select: daftar, hadir, tidak_hadir, izin)

**event_laporan**
- `event`, `jenis` (select: proposal, laporan_kegiatan, lpj_keuangan, evaluasi)
- `isi` (editor teks), `lampiran` (file, banyak), `status` (select: draf, diajukan, direvisi, disetujui)
- `ditulis_oleh`, `ditinjau_oleh` (relation), `catatan_tinjauan`

**event_dokumentasi**
- `event`, `foto` (file gambar), `keterangan`, `diunggah_oleh`

Kuesioner `jenis = evaluasi` boleh dihubungkan ke event dengan menambah field `event` (relation, opsional) pada `kuesioner`, untuk evaluasi dari peserta.

## 5.5 Aturan Akses Event

- `event`: **create dan penunjukan/penggantian `ketua_pelaksana` hanya `pengurus`/`admin`.** Event berstatus `usulan` hanya terlihat oleh pengurus/admin dan pengusul, setelah itu terlihat semua user login. Perubahan status hanya sesuai alur di 6.8 (dijaga hook).
- `event_panitia`: baca semua user login. Tambah/ubah/nonaktifkan **hanya oleh ketua pelaksana event tersebut** (atau `pengurus`/`admin`). Seksi `ketua_pelaksana` hanya boleh diatur pengurus/admin. Ketua tidak boleh menjabat sekaligus seksi `bendahara`.
- `event_tugas`: baca semua user login. Buat oleh ketua. Penanggung jawab hanya boleh mengubah `status` dan `catatan` tugasnya sendiri.
- `event_anggaran`, `event_dana`: baca semua user login (transparan). Tulis oleh ketua atau seksi bendahara panitia, **dikunci setelah status event `disetujui`**. Perubahan setelahnya hanya lewat `pengurus`/`admin` dan tercatat di log.
- `event_transaksi`: **baca semua user login.** Buat hanya oleh seksi `bendahara` panitia (dan hanya saat status `persiapan`, `berlangsung`, `selesai`). **Update dan delete dikunci**, koreksi lewat transaksi baru yang mengacu `mengoreksi`. Verifikasi hanya oleh `bendahara` komunitas atau `admin`, dan **tidak boleh memverifikasi transaksi yang ia catat sendiri**. Perubahan field `verifikasi` hanya lewat hook.
- `event_peserta`: anggota mendaftar atas namanya sendiri. Status hadir diubah oleh panitia.
- `event_laporan`: draf hanya terlihat penulis, ketua, dan pengurus. Yang `disetujui` terlihat semua user login. Tulis oleh panitia, tinjau oleh `pengurus`/`admin`.
- `event_dokumentasi`: baca semua user login, unggah oleh panitia.
- `kas` dengan `kategori = dana_event` atau `sisa_dana_event`: tetap hanya dibuat `bendahara`/`admin` seperti aturan kas biasa.

Uji semua aturan di atas dengan akun anggota biasa, akun panitia, dan akun ketua.

## 5.6 Skema Aturan Komunitas dan Konfigurasi

Aturan komunitas **bukan teks tetap di kode**. Isinya disusun dan diubah oleh Dewan Etik dan pengurus lewat aplikasi, dengan riwayat versi dan pengesahan.

**aturan_versi** (satu versi lengkap aturan)
- `nomor` (text, misal 1.0, 1.1), `judul`, `ringkasan_perubahan` (text)
- `status` (select: draf, ditinjau, disahkan, berlaku, diganti)
- `tanggal_efektif` (date), `disusun_oleh` (relation), `mode_pengesahan` (select: unit, unit_dan_anggota)

**aturan_pasal**
- `versi` (relation ke aturan_versi), `bab` (text), `nomor` (text), `judul`, `isi` (editor teks)
- `kategori` (select: umum, keanggotaan, etika, keuangan, kegiatan, forum, sanksi), `urutan` (number)

**aturan_pengesahan** (suara pihak yang berwenang, tidak bisa diubah)
- `versi`, `pihak` (select: dewan_etik, pengurus), `anggota` (relation), `keputusan` (select: setuju, tolak, revisi), `catatan`, `waktu`

**aturan_persetujuan_anggota** (anggota menyatakan sudah membaca dan memahami)
- `versi`, `anggota`, `waktu`

**aturan_sanksi** (tangga sanksi, bisa diatur Dewan Etik)
- `tingkat` (number), `nama` (misal Teguran lisan), `deskripsi`, `syarat` (text)
- `perlu_persetujuan_pengurus` (bool), `masa_berlaku_hari` (number, opsional)

**keputusan_etik** (keputusan atas satu kasus, ditetapkan manusia)
- `pengaduan` (relation, opsional), `anggota` (terlapor), `pasal` (relation ke aturan_pasal, banyak)
- `ringkasan`, `tindakan` (relation ke aturan_sanksi), `ditetapkan_oleh` (relation, banyak), `tanggal`
- `tidak_ikut_memutus` (relation ke users, banyak; yang punya konflik kepentingan)
- `status` (select: diputuskan, keberatan_diajukan, ditinjau_ulang, final), `batas_keberatan` (date), `catatan`

**keberatan** (hak anggota mengajukan keberatan atas keputusan)
- `keputusan`, `alasan`, `status` (select: diajukan, ditinjau, diterima, ditolak), `ditinjau_oleh` (relation, banyak), `hasil`

**konfigurasi** (parameter yang dipakai aplikasi, bisa diubah lewat Pengaturan)
- `kunci` (text, unik), `nilai` (json), `deskripsi`
- `wewenang` (select: admin, pengurus, dewan_etik; siapa yang boleh mengubah)
- `diubah_oleh` (relation), `diubah_pada` (datetime)

## 5.7 Aturan Akses Aturan dan Konfigurasi

- `aturan_versi`, `aturan_pasal`: versi berstatus `berlaku` terlihat semua user login. Versi `draf` dan `ditinjau` hanya terlihat anggota tim `dewan_etik`, `pengurus`, dan `admin`. Penulisan draf oleh `dewan_etik` atau `pengurus`. **Versi `disahkan`, `berlaku`, dan `diganti` dikunci**, perubahan dilakukan lewat versi baru (riwayat tidak dihapus).
- Perpindahan status hanya lewat hook: `ditinjau` ke `disahkan` baru boleh jika `aturan_pengesahan` memenuhi syarat (lihat 6.9 B). Saat versi baru `berlaku`, versi lama otomatis `diganti`.
- `aturan_pengesahan`: hanya anggota tim `dewan_etik` atau `pengurus` yang membuat suara atas namanya sendiri. Tidak bisa diubah atau dihapus.
- `aturan_persetujuan_anggota`: anggota membuat atas namanya sendiri dan melihat miliknya. `pengurus` dan `dewan_etik` bisa melihat semua (untuk memantau yang belum).
- `aturan_sanksi`: baca semua user login. Tulis hanya `dewan_etik`, setiap perubahan tercatat di log dan dihitung sebagai perubahan besar (6.9 B).
- `keputusan_etik`, `keberatan`: `keputusan_etik` hanya terlihat terlapor, anggota tim `dewan_etik`, dan `admin`. Pelapor hanya melihat status kasus. Yang tercantum di `tidak_ikut_memutus` tidak boleh ikut menetapkan (dijaga hook). `keberatan` dibuat oleh terlapor sendiri dan **ditinjau oleh orang yang tidak ikut memutus perkara itu**.
- `konfigurasi`: baca semua user login. Tulis hanya oleh pihak sesuai field `wewenang`. Setiap perubahan mencatat nilai lama dan baru di `log_aktivitas`.

Uji aturan dengan akun anggota biasa, akun pengurus, dan akun Dewan Etik.

## 5.8 Skema Profil, Pendaftaran, dan Fleksibilitas

**Tambahan field pada `users`** (data profil, diisi dan diubah anggota sendiri)
- `nama_panggilan`, `whatsapp`, `email` (opsional)
- `domisili` (text bebas, misal kecamatan atau kota, **tidak perlu alamat lengkap**)
- `tanggal_lahir` (date, opsional), `bio` (text pendek, opsional)
- `kontak_darurat_nama`, `kontak_darurat_telepon` (opsional)
- `kustom` (json, nilai bidang kustom, divalidasi hook terhadap `bidang_profil`)
- `visibilitas` (json, pilihan anggota tentang siapa boleh melihat tiap bidang)
- `profil_dilengkapi_pada` (datetime, diisi hook), `setuju_privasi_pada` (datetime)

**profil_publik** (tampilan profil yang aman dibaca anggota lain, **dibuat dan diperbarui hook**, bukan ditulis klien)
- `user` (relation, unik), `nama_tampil`, `foto`, `jabatan_ringkas`, `unit_ringkas`
- `bidang_terlihat` (json, hanya bidang yang anggota izinkan untuk dilihat semua anggota)

Anggota lain **tidak** membaca collection `users` secara langsung. Mereka membaca `profil_publik`, sehingga data yang disembunyikan tidak bocor lewat API.

**bidang_profil** (definisi bidang tambahan, diatur admin tanpa kode)
- `kunci` (unik), `label`, `tipe` (select: teks, angka, tanggal, pilihan, ya_tidak)
- `opsi` (json, untuk tipe pilihan), `petunjuk` (text)
- `wajib` (bool), `tampil_di_pendaftaran` (bool), `bisa_diubah_anggota` (bool)
- `terlihat_oleh` (select: pribadi, pengurus, anggota; batas paling terbuka yang boleh dipilih anggota)
- `urutan` (number), `aktif` (bool)

**pendaftaran** (pengajuan anggota baru)
- `user` (relation ke users, status `menunggu`), `nama_lengkap`, `whatsapp`, `domisili`
- `alasan_bergabung` (text), `diajak_oleh` (relation, opsional), `kode_undangan` (text, opsional)
- `jawaban_kustom` (json, dari bidang `tampil_di_pendaftaran`)
- `setuju_aturan_versi` (relation ke aturan_versi), `setuju_privasi` (bool, wajib true)
- `status` (select: menunggu, perlu_data_tambahan, disetujui, ditolak, dibatalkan)
- `diproses_oleh` (relation), `diproses_pada` (datetime), `catatan_admin`, `alasan_penolakan`
- `kode_cek` (text acak, agar pendaftar bisa mengecek status tanpa login)

**referensi** (semua daftar pilihan yang bisa diatur, pengganti `select` tetap)
- `kelompok` (text, misal kas_kategori, forum_kategori, panduan_kategori, event_jenis, event_seksi, unit_jenis, pengaduan_kategori, dokumen_kategori)
- `kode` (text, unik per kelompok), `label`, `urutan` (number), `aktif` (bool)
- `sistem` (bool; entri yang dipakai logika hook, misal `dana_event` dan `sisa_dana_event`, **tidak bisa dihapus atau diganti kodenya**)

Pada skema 5.x, field kategori/jenis/seksi yang berupa `select` untuk **pilihan yang bersifat label** diimplementasikan sebagai text yang divalidasi terhadap `referensi` (nilai yang tertulis di skema menjadi isi awal). Pilihan yang **menggerakkan logika** tetap `select` tetap: status alur (event, aturan, pendaftaran, pengaduan, keputusan etik, verifikasi), `jenis` masuk/keluar, tipe soal, dan role dasar.

**pemetaan_izin** (siapa boleh melakukan apa, lihat 6.13)
- `izin` (text, dari daftar izin baku), `pemegang_tipe` (select: role, unit), `pemegang_nilai` (text, misal `bendahara` atau kode unit), `aktif` (bool)

## 5.9 Aturan Akses Profil, Pendaftaran, dan Fleksibilitas

- `users`: collection **tidak terbuka** bagi anggota lain. Anggota hanya membaca dan mengubah **dirinya sendiri**. Update oleh anggota **menolak** perubahan pada field sistem (`role`, `tim`, `izin`, `status`, `tanggal_gabung`) dan field bidang yang `bisa_diubah_anggota = false`. Pemegang izin `kelola_anggota` boleh melihat dan mengubah field sistem. Semua perubahan oleh pihak lain tercatat di log (nama field saja, bukan nilainya).
- `profil_publik`: baca untuk user login berstatus `aktif`. Tulis hanya hook.
- `bidang_profil`: baca semua user login. Tulis hanya pemegang izin `kelola_pengaturan`.
- `pendaftaran`: **tidak ada create publik langsung ke collection.** Pengajuan masuk lewat route hook (6.12). Baca dan proses hanya pemegang izin `sahkan_pendaftaran` (bawaan `admin`). Pendaftar melihat statusnya lewat `kode_cek`, bukan lewat akses ke collection.
- `referensi`: baca semua user login (entri aktif). Tulis pemegang izin `kelola_pengaturan`. Entri `sistem` tidak bisa dihapus.
- `pemetaan_izin`: baca dan tulis hanya `admin`. Perubahan masuk log dan tunduk pada pengaman di 6.13 D.

Uji dengan akun anggota biasa: tidak bisa mengubah `role` atau `izin` dirinya, tidak bisa membaca `users` anggota lain, dan tidak bisa membuat `pendaftaran` langsung lewat API.

## 5.10 Skema Progres Pengembangan

Data progres **dihasilkan otomatis oleh runner uji**, bukan diketik manual oleh siapa pun.

**progres_fase**
- `kode` (misal F1, F2b, unik), `nama` (nama santai), `deskripsi`, `urutan` (number)
- `status` (select: belum_mulai, berjalan, selesai, bermasalah; **dihitung server**)
- `persen` (number), `jumlah_fitur`, `jumlah_berfungsi` (number), `diperbarui` (datetime)

**progres_fitur**
- `kode` (unik), `fase` (relation), `nama` (nama ramah pengguna), `deskripsi` (bahasa santai)
- `status` (select: belum_dibuat, dalam_pengerjaan, berfungsi, bermasalah; **dihitung server**)
- `jumlah_uji`, `uji_lulus` (number), `catatan_publik` (text pendek, hasil pemetaan pesan ramah)
- `terakhir_berfungsi` (datetime), `diperbarui` (datetime)

**progres_uji** (hasil **terakhir** tiap uji, tanpa riwayat)
- `kode`, `fitur` (relation), `nama`, `jenis` (select: ada_koleksi, ada_route, uji_api, uji_statis, uji_ui_ringan, uji_manual)
- `hasil` (select: lulus, gagal, dilewati), `sensitif` (bool), `pesan_internal` (text, **hanya untuk admin**), `waktu` (datetime)

**progres_rilis** (satu catatan per putaran uji)
- `waktu`, `versi` (hash git singkat atau nomor versi), `pemicu` (select: deploy, terjadwal)
- `total_uji`, `lulus`, `gagal`, `dilewati` (number), `durasi_detik` (number)
- `catatan_perubahan` (text, dari subjek git log sejak rilis sebelumnya)
- Rilis lama dipangkas otomatis sesuai `retensi_progres_rilis_hari`.

**progres_konfirmasi** (konfirmasi uji manual untuk hal yang tidak bisa diuji otomatis, misal kehalusan animasi di HP)
- `uji` (relation), `versi`, `dikonfirmasi_oleh` (relation), `waktu`. Tidak bisa diedit atau dihapus.

**Aturan akses**
- Collection `progres_*` **tidak dibuka ke klien** (rule null). Semua baca dan tulis lewat route hook di 6.14 C.
- Rilis lama dan `catatan_perubahan` tidak berisi rahasia (lihat aturan di 6.14 D).

## 6. Fitur MVP

1. Login (email/WhatsApp + password) dan menu pengguna dengan tombol **Keluar** (6.15).
2. Dashboard: saldo kas saat ini, total masuk dan keluar bulan ini, 5 transaksi terakhir.
3. Halaman Kas: riwayat lengkap, filter bulan dan jenis, lihat foto bukti.
4. Form input kas (khusus bendahara/admin), bukti wajib untuk pengeluaran.
5. Halaman Iuran: tabel anggota x bulan, status lunas atau belum.
6. Daftar anggota (khusus admin: tambah, nonaktifkan, ubah role).
7. Ekspor riwayat kas ke CSV.
8. PWA: bisa di-install ke layar HP, tampilan nyaman di layar kecil.
9. Halaman **Progres Pengembangan** yang otomatis, supaya semua anggota tahu apa yang sudah dan belum jalan (6.14).

Di luar scope: notifikasi push, peta, chat real-time, multi-komunitas, pembayaran online.

Fitur tambahan komunitas (personalisasi, struktur, forum, panduan, kuesioner, dan pelengkapnya) dijelaskan di bagian 5.2 sampai 5.3 dan 6.2 sampai 6.7. Semua dikerjakan **bertahap setelah fitur inti beres** (lihat tahapan di bagian 11).

## 6.1 Tampilan dan Interaksi

Gaya: dashboard ala game strategi yang hidup dan ramah, tapi **data tetap nomor satu**. Animasi dan karakter boleh meriah, angka tidak boleh tertutup atau ambigu.

### A. Dashboard "Markas"

- Saldo kas ditampilkan sebagai "peti harta" dengan angka besar yang jelas dan terbaca.
- Anggota tampil sebagai ikon karakter kecil. Ikon menyala jika iuran bulan ini lunas, redup jika belum.
- Progres iuran bulan ini berupa resource bar ala game, disertai angka persen dan nominal.
- Transaksi masuk memunculkan koin yang melayang ke peti. Pengeluaran memunculkan koin keluar dari peti. Animasi singkat (di bawah 1,5 detik) dan hanya muncul saat ada transaksi baru.
- Ikon kecil melayang pelan di latar (ambient) sebagai dekorasi.
- Halaman **Kas dan Iuran tidak memakai gaya game**: tabel polos, rapi, mudah dibaca dan dicek. Gaya game hanya di dashboard.

### B. Aturan performa animasi (wajib)

- Animasi hanya memakai CSS `transform` dan `opacity` (jalan di GPU). Dilarang animasi `width`, `height`, `top`, `left`, atau `box-shadow` besar.
- Ikon dan karakter pakai **SVG inline** atau emoji. Dilarang gambar besar, GIF, atau video.
- Maksimal 20 elemen bergerak bersamaan di satu layar.
- Animasi dihentikan saat tab tidak aktif (`document.hidden`) dan saat elemen tidak terlihat.
- Dilarang library berat (three.js, canvas/WebGL, library animasi besar). Cukup CSS keyframes dan JS ringan. Angka yang naik (counter) ditulis sendiri beberapa baris.
- Hormati `prefers-reduced-motion` (animasi dimatikan otomatis) dan sediakan tombol **"Mode hemat animasi"** di pengaturan, tersimpan per perangkat.
- Total aset visual (SVG, font, ikon) di bawah 150KB. Uji di HP kelas bawah; target 60 fps tanpa patah-patah.

### C. Karakter Hero (pemandu)

- Satu karakter maskot utama, digambar sebagai **SVG** dengan beberapa pose/ekspresi: menyapa, menjelaskan, senang (sukses), waspada (peringatan/error), berpikir (loading). Pose diganti lewat CSS class, bukan file gambar terpisah.
- Hero muncul sebagai ikon kecil di pojok layar. Dengan bubble dialog singkat saat memandu.
- Peran hero: menyapa saat login, menjelaskan istilah, memandu langkah wizard, memberi tahu hasil (berhasil/gagal).
- Teks bubble maksimal 2 kalimat pendek, bahasa Indonesia santai tapi sopan.
- Hero **tidak pernah memblokir** pekerjaan: bubble bisa ditutup, dan ada pengaturan "Sembunyikan hero".
- Hero hanya penjelas. Semua validasi dan aturan akses tetap di backend (PocketBase), bukan di hero.
- Wujud hero mengikuti tema ojol (bagian E). Nama hero bawaan "Bang Gas" dan bisa diganti lewat pengaturan (bagian 13).

### D. Wizard pengelolaan data (admin dan bendahara)

Dipakai saat mengelola data, dipandu hero langkah demi langkah. Setiap wizard punya indikator langkah (misal 2 dari 4) dan tombol Kembali.

1. **Wizard Catat Kas**: pilih jenis (masuk/keluar), isi nominal dan kategori, isi keterangan dan unggah bukti (wajib untuk pengeluaran), lalu **layar ringkasan konfirmasi** sebelum simpan.
2. **Wizard Tambah Anggota**: data dasar, role, ringkasan lalu buat akun.
3. **Wizard Tandai Iuran**: pilih periode, pilih anggota yang lunas, ringkasan nominal total lalu simpan (otomatis tercatat ke kas).
4. **Wizard Koreksi Transaksi**: pilih transaksi yang salah, isi alasan, buat transaksi koreksi (karena transaksi lama tidak bisa diedit atau dihapus).

Aturan wizard:
- Layar ringkasan konfirmasi **wajib** ada, karena data kas tidak bisa diedit setelah tersimpan. Hero memperingatkan hal ini.
- Validasi per langkah dengan pesan error yang jelas (misal "Bukti wajib untuk pengeluaran").
- Draf wizard disimpan sementara di perangkat agar tidak hilang kalau tab tertutup, lalu dihapus setelah berhasil disimpan.
- Pengguna berpengalaman bisa memilih **"Mode cepat"** (form satu halaman tanpa wizard) di pengaturan.
- Anggota biasa tidak melihat wizard pengelolaan. Mereka hanya mendapat tur singkat saat pertama login (bisa dilewati).

### E. Tema Ojol dan Gaya Bahasa

**Tema visual: dunia driver ojol (nuansa Grab driver)**
- Palet: dominan hijau segar, aksen putih, abu gelap, dan kuning/oranye untuk koin dan highlight. Tersedia mode terang dan gelap.
- Latar dashboard: suasana basecamp/pangkalan driver (warung kopi, deretan motor, jalanan kota) dalam gaya ilustrasi sederhana berbasis SVG dan bentuk CSS.
- Ikon: motor, helm, jaket hijau, jerigen bensin, tas box pengantar, HP dengan notifikasi orderan, koin, kopi. Ikon melayang kecil-kecil di latar memakai set ini.
- Hero: **driver ojol** berjaket dan berhelm, dengan pose sesuai bagian C (menyapa sambil klakson, menjelaskan sambil menunjuk HP, senang sambil acungkan jempol, waspada sambil angkat tangan, berpikir sambil garuk helm).
- Pemetaan istilah ke game: peti harta menjadi **dompet/kotak kas basecamp**, resource bar menjadi **bar setoran iuran** (isi bensin penuh = iuran lunas), ikon anggota menjadi **motor atau driver kecil** yang menyala kalau lunas.
- **Jangan memakai logo, nama, atau aset asli Grab atau merek lain.** Cukup nuansa warna dan suasana ojol umum, karena aplikasi ini milik komunitas sendiri, bukan aplikasi resmi perusahaan mana pun.

**Gaya bahasa: santai, "santui", anti serius**
- Semua teks antarmuka memakai bahasa Indonesia sehari-hari ala driver: akrab, ringan, sedikit bercanda, pakai sapaan seperti "bro", "bos", "rek", "coy".
- Contoh nada:
  - Sapaan login: "Yo, bro! Udah nongkrong di basecamp, siap cek kas?"
  - Sukses: "Mantap, jaya! Transaksi udah masuk buku kas."
  - Peringatan sebelum simpan: "Eits, tunggu dulu bos. Kas yang udah kesimpen nggak bisa diedit, cek lagi ya!"
  - Error bukti: "Waduh, bukti belum diupload nih. Pengeluaran wajib ada struknya."
  - Iuran belum lunas: "Bensin masih setengah tangki, Bro. Yuk setor iuran bulan ini."
  - Loading: "Bentar bro, lagi ngebut..."
- Aturan agar tetap aman dipakai:
  1. **Angka, nominal, tanggal, dan nama menu selalu ditulis jelas dan baku.** Santai hanya di kalimat penjelas, bukan di data.
  2. Peringatan penting (data tidak bisa diedit, penghapusan akun, backup gagal) tetap harus **jelas dan tegas**, boleh santai tapi tidak boleh ambigu.
  3. Tidak ada kata kasar, merendahkan, SARA, atau candaan yang menyinggung anggota.
  4. Sisihkan semua teks antarmuka di **satu berkas teks terpusat** (misalnya `frontend/teks.js` atau `teks.json`), jadi nada bahasa bisa diubah tanpa membongkar kode.
  5. Teks hero tetap maksimal 2 kalimat pendek.

## 6.2 Personalisasi Komunitas

Komunitas lain atau pengurus baru harus bisa memakai aplikasi ini dengan identitas sendiri **tanpa menyentuh kode**.

- Halaman **Pengaturan Komunitas** (khusus `admin`): ubah nama, tagline, **upload logo sendiri**, warna utama dan aksen, nama hero, sapaan, tentang, visi misi, kontak, dan iuran default.
- Semua teks yang menyebut nama komunitas memakai variabel `{nama_komunitas}` dari berkas teks terpusat (bagian 6.1 E). Jangan menulis nama komunitas langsung di kode.
- Warna diterapkan lewat **CSS variable** (`--warna-utama`, `--warna-aksen`) yang dibaca dari pengaturan. Warna jaket hero dan ikon ikut berubah.
- Logo: terima png/jpg/webp, maksimal 500KB, kompres dan ubah ukuran di sisi klien. Tampil di halaman login, header, dan PWA (ikon aplikasi dibuat dari logo; sediakan ikon bawaan jika belum ada logo).
- **Wizard Setup Pertama Kali**: saat aplikasi baru dipasang, hero memandu admin mengisi nama, logo, warna, dan membuat struktur awal. Hasil wizard bisa diubah kapan saja.
- Tema ojol tetap jadi tema bawaan. Pengaturan hanya menyesuaikan nama, logo, warna, dan sapaan, bukan membuat tema baru.
- Cache pengaturan di sisi klien supaya tidak memanggil API di setiap halaman.

## 6.3 Struktur Komunitas

Halaman **Struktur** yang bisa dilihat semua anggota, supaya jelas siapa mengurus apa.

- Bagan sederhana (kartu berjenjang, bukan diagram berat): Pengurus Tetap, Pengurus Harian, Dewan Etik, Satgas, dan unit lain buatan admin.
- Tiap unit menampilkan deskripsi, tugas, dan daftar jabatan beserta foto dan nama anggotanya.
- Admin bisa menambah unit, mengatur jabatan, dan mengganti pengurus per **periode** (riwayat jabatan tersimpan, tidak ditimpa).
- Keanggotaan `tim` pada user disinkronkan dari jabatan aktif lewat hook, supaya aturan akses (misal Dewan Etik) selalu sesuai jabatan yang berlaku.
- Anggota bisa menekan unit untuk melihat tugas, aturan, dan **cara menghubungi** unit tersebut (misal "Lapor ke Dewan Etik").

## 6.4 Forum dan Panduan

**Forum** (diskusi anggota)
- Topik dengan kategori, balasan berurutan, sematkan topik penting, kunci topik.
- Moderasi oleh `pengurus` dan `admin`: sembunyikan, kunci, hapus.
- Cukup sederhana: tanpa real-time, tanpa chat. Halaman memuat ulang atau pakai tombol "Muat balasan baru".
- Batasi panjang teks dan lampiran gambar (maks 2MB, kompres di klien).
- Anggota bisa **melaporkan** postingan bermasalah, laporan masuk ke pengurus.

**Panduan** (blog/pusat bantuan untuk masalah yang sering muncul)
- Artikel oleh pengurus dengan kategori dan tag, misal: akun suspend, cara klaim insentif, tips keselamatan, aturan komunitas, cara iuran.
- Fitur pencarian judul/isi (cukup filter PocketBase, tanpa mesin pencari terpisah).
- Status **draf** dan **terbit**. Pengurus bisa menyunting kapan saja.
- Hero memberi tautan panduan yang relevan saat anggota menemui error atau bertanya hal yang ada artikelnya.
- Dari forum, pengurus bisa mengubah jawaban bagus menjadi artikel panduan (salin ke draf).
- Ada tombol **bagikan** ke WhatsApp (tautan biasa, tanpa integrasi API).

## 6.5 Uji Anggota dan Penyaringan Berkala

Tujuan: memastikan anggota memahami aturan dan etika komunitas, serta menyaring secara berkala dengan adil. Ini alat bantu, **bukan hakim**. Keputusan sanksi tetap oleh manusia.

**Kuesioner yang bisa dikelola pengurus**
- Pengurus bisa **membuat, mengedit, menggandakan, menonaktifkan** kuesioner dan pertanyaannya lewat editor di aplikasi (tanpa kode).
- Tipe soal: pilihan ganda, benar/salah, esai singkat, skala (1 sampai 5). Bobot per soal dan penjelasan jawaban opsional.
- Opsi: acak urutan soal, batas waktu, nilai lulus (persen).
- Jenis: **uji pengetahuan** (ada nilai dan lulus/tidak), **evaluasi**, dan **survei** (tanpa nilai).

**Penilaian di server (wajib)**
- Nilai dihitung oleh **hook PocketBase** (`pb_hooks`, JavaScript) saat hasil dikirim, dengan membandingkan jawaban terhadap `kunci_jawaban`. Anggota tidak pernah menerima kunci jawaban.
- Soal esai singkat tidak dinilai otomatis. Ditandai "menunggu penilaian" untuk dinilai pengurus.
- Penjelasan jawaban baru tampil setelah anggota menyelesaikan kuesioner.

**Siklus penyaringan berkala**
- Pengurus membuat **siklus** (misal tiap triwulan atau semester): pilih kuesioner, rentang tanggal, dan apakah wajib semua anggota.
- Dashboard siklus menampilkan siapa sudah dan belum mengerjakan, tingkat kelulusan, dan soal yang paling sering salah (agregat, untuk memperbaiki panduan).
- Anggota yang belum lulus bisa **mengulang** sesuai batas yang ditentukan pengurus (misal maksimal 3 kali per siklus, ada jeda).
- Yang tetap belum lulus masuk daftar **pembinaan** untuk Dewan Etik: catatan dan tindakan bersifat pembinaan lebih dulu, bukan sanksi otomatis. Pembinaan terhubung ke panduan terkait supaya anggota bisa belajar.

**Privasi dan keadilan**
- Nilai individu hanya terlihat oleh anggota itu sendiri, `pengurus`, dan `dewan_etik`. Anggota lain hanya melihat statistik agregat.
- Jelaskan tujuan dan aturan penyaringan di halaman siklus sebelum anggota mulai (hero menyampaikan dengan bahasa santai tapi jelas).
- Tidak ada penghapusan keanggotaan otomatis berdasarkan nilai.

## 6.6 Fitur Pelengkap

Urutan prioritas, dikerjakan setelah bagian 6.2 sampai 6.5 stabil:

1. **Pengumuman**: berita dan info penting dari pengurus, bisa disematkan, tampil di dashboard (hero menyampaikan yang penting).
2. **Pengaduan ke Dewan Etik**: lapor masalah, bisa **anonim**. Pelapor anonim mendapat kode untuk mengecek status. Dewan Etik memproses dan mencatat tindak lanjut. Identitas pelapor anonim tidak boleh tersimpan.
3. **Agenda, absensi, dan notulen**: jadwal kumpul, hadir/izin/tidak hadir, catatan rapat dan keputusan. Agenda dipakai untuk pertemuan rutin. Kegiatan berpanitia ditangani modul Event (6.8).
4. **Polling dan voting**: untuk keputusan bersama, satu suara per anggota, bisa anonim, ada batas waktu, hasil real-time sederhana.
5. **Dokumen**: AD/ART, aturan, template, formulir yang bisa diunduh.
6. **Log aktivitas**: jejak otomatis untuk aksi penting (ubah role, ubah jabatan, terbit panduan, penilaian, ubah status pengaduan). Hanya bisa dibaca admin.
7. **Pangkat dan badge**: gamifikasi ringan (misal dari kehadiran, iuran lunas, dan lulus uji). Hanya tampilan di profil dan dashboard, tidak memengaruhi hak akses. Hindari yang terkesan mempermalukan anggota berpangkat rendah.
8. **Profil anggota**: foto, kontak yang boleh dibagikan, unit dan jabatan, riwayat kehadiran dan uji (hanya untuk diri sendiri).
9. **Cetak dan ekspor**: ekspor laporan kas, daftar anggota, dan hasil siklus ke CSV, serta laporan kas bulanan yang bisa dicetak atau dibagikan ke WhatsApp grup.

## 6.7 Batas Beban untuk Fitur Tambahan

Fitur bertambah, tetapi server tetap ringan.

- Tetap satu PocketBase dan satu database SQLite. Tidak ada service tambahan.
- Gambar (logo, foto, bukti, sampul) dikompres di klien. Tetapkan batas total penyimpanan upload dan pantau lewat alert server.
- Forum dan pencarian memakai filter PocketBase, bukan mesin pencari terpisah.
- Tidak ada real-time, tidak ada websocket, tidak ada polling terus-menerus. Muat data saat halaman dibuka.
- Aturan performa animasi di 6.1 B tetap berlaku untuk semua halaman baru.
- Jika pemakaian RAM aplikasi melewati 150MB saat idle, berhenti dan laporkan ke pemilik sebelum menambah fitur.

## 6.8 Event Komunitas

Satu event punya alur lengkap dari usulan sampai arsip, dengan pertanggungjawaban dana yang jelas: **dana dari mana, dipakai untuk apa, sisanya ke mana.**

### A. Alur status

`usulan` → `disetujui` → `persiapan` → `berlangsung` → `selesai` → `lpj_diajukan` → `ditutup`
(dari status mana pun sebelum `selesai` boleh `dibatalkan` oleh pengurus/admin dengan alasan)

1. **Usulan.** Pengurus/admin membuat event dan **menunjuk ketua pelaksana**. Isi dasar: tujuan, tanggal, lokasi, target peserta, garis besar anggaran.
2. **Disetujui.** Pengurus menyetujui event. Anggaran terkunci setelah ini.
3. **Persiapan.** Ketua pelaksana **menyusun panitia sendiri** (memilih anggota, seksi, dan tugas). Panitia bekerja lewat checklist tugas. Bendahara panitia mulai mencatat dana masuk.
4. **Berlangsung dan selesai.** Registrasi peserta, absensi, dokumentasi, pencatatan pengeluaran.
5. **LPJ diajukan.** Panitia menyusun laporan kegiatan dan laporan keuangan, lalu mengajukan ke pengurus.
6. **Ditutup.** Setelah laporan disetujui dan syarat penutupan terpenuhi, event diarsipkan (hanya bisa dibaca).

Perpindahan status dijaga **hook server**, bukan hanya tombol di tampilan.

### B. Penunjukan ketua dan panitia

- Hanya pengurus/admin yang menunjuk atau mengganti ketua pelaksana. Penggantian wajib berisi alasan dan tercatat di log.
- Ketua pelaksana memilih anggota panitianya sendiri lewat **Wizard Susun Panitia** (hero memandu): pilih anggota, tentukan seksi dan tugas, ringkasan, simpan.
- Ketua tidak boleh merangkap seksi bendahara supaya ada pemisahan tugas. Anggota yang ditunjuk melihat banner "Kamu ditunjuk di event ..." di dashboard.
- Setiap anggota panitia hanya bisa mengubah hal yang menjadi tugasnya.

### C. Dana yang jelas dan transparan

**Tiga lapis pencatatan**
1. **Rencana**: anggaran per pos (`event_anggaran`) dan rencana sumber dana (`event_dana`).
2. **Realisasi**: semua uang masuk dan keluar dicatat di `event_transaksi`. Uang masuk **wajib** menunjuk sumber dana. Uang keluar **wajib** menunjuk pos anggaran dan melampirkan bukti.
3. **Verifikasi**: bendahara komunitas memeriksa dan menandai `terverifikasi`. Transaksi yang ditolak harus beralasan.

**Jalur dana dari kas komunitas (jika dipakai)**
- Pencairan dicatat bendahara komunitas di `kas` sebagai pengeluaran `kategori = dana_event` yang terhubung ke event. Di halaman event, nominal ini otomatis terhitung sebagai sumber dana "Kas komunitas", sehingga tidak perlu dicatat dua kali.
- Sisa dana saat penutupan **wajib dikembalikan** ke kas komunitas sebagai pemasukan `kategori = sisa_dana_event`.
- Dengan begitu, kas komunitas dan kas event tidak pernah berbeda catatan.

**Aturan transparansi**
- Semua anggota bisa melihat sumber dana, anggaran, transaksi, dan bukti event.
- Transaksi tidak bisa diedit atau dihapus. Salah catat dikoreksi lewat transaksi baru.
- Pembuat transaksi tidak boleh memverifikasi transaksinya sendiri.
- Pengeluaran di atas **ambang nominal** (ditentukan pemilik, lihat bagian 13) wajib persetujuan pengurus sebelum dicatat.

**Halaman "Peta Dana" (tampilan transparansi)**
- Bagian atas: ringkasan total dana masuk, total keluar, dan saldo event, dengan angka besar yang jelas.
- Sumber dana: daftar sponsor/donasi/kas/iuran peserta, nominal rencana versus diterima (bar progres seperti tangki bensin).
- Pos anggaran: rencana versus realisasi per pos, dengan penanda jika melebihi anggaran.
- Daftar transaksi per pos dengan foto bukti. Gaya game hanya di ringkasan atas, bagian rincian tetap tabel polos yang mudah dicek (aturan 6.1 A).

### D. Laporan kegiatan dari A sampai Z

Laporan disusun lewat **Wizard Susun Laporan** (hero memandu per bagian). Setiap bagian bisa disimpan sebagai draf.

1. **Ringkasan kegiatan**: nama, tanggal, lokasi, tujuan, panitia, jumlah peserta (diambil otomatis dari data).
2. **Jalannya acara**: kronologi dari persiapan sampai selesai, hasil yang dicapai, kendala dan solusinya.
3. **Dokumentasi**: foto dan lampiran dari `event_dokumentasi`.
4. **Laporan keuangan (otomatis)**: dibuat sistem dari data transaksi, **tidak diketik manual**. Berisi:
   - Sumber dana: rencana, diterima, selisih
   - Rincian pemasukan dan pengeluaran dengan bukti
   - Anggaran versus realisasi per pos beserta alasan jika melebihi
   - Saldo akhir dan bukti pengembalian sisa dana ke kas komunitas
5. **Evaluasi**: hasil kuesioner evaluasi peserta (jika ada), pelajaran, dan rekomendasi.
6. **Pengesahan**: ketua pelaksana mengajukan, pengurus meninjau (setuju atau revisi dengan catatan).

Laporan lengkap dapat diekspor sebagai halaman siap cetak (cetak ke PDF dari browser) dan CSV untuk bagian keuangan.

### E. Syarat penutupan event

Hook hanya mengizinkan status `ditutup` jika **semua** terpenuhi:
- Semua transaksi sudah `terverifikasi` (tidak ada yang `belum` atau `ditolak` tanpa penyelesaian)
- Saldo event nol: sisa dana sudah dikembalikan ke kas komunitas (`sisa_dana_event`)
- Laporan kegiatan dan laporan keuangan berstatus `disetujui`
- Dokumentasi minimal tersedia (jumlah minimal ditentukan pemilik)

Setelah `ditutup`, seluruh data event terkunci (hanya baca) dan masuk arsip.

### F. Fitur pendukung event

- Daftar dan kalender event, dengan tab di halaman detail: Ringkasan, Panitia, Tugas, Dana, Transaksi, Peserta, Laporan, Dokumentasi.
- Registrasi peserta dan absensi sederhana (panitia menandai hadir). Tanpa QR dulu supaya ringan.
- Evaluasi peserta memakai fitur kuesioner (6.5).
- Pengingat di dashboard untuk tenggat tugas dan LPJ yang belum diajukan (tanpa notifikasi push).
- Semua aksi penting (tunjuk atau ganti ketua, ubah status, verifikasi, tutup event) masuk ke log aktivitas.
- Teks dan tampilan mengikuti tema ojol dan bahasa santai (6.1 E), sedangkan angka dana dan peringatan tetap jelas dan baku. Batas beban 6.7 tetap berlaku.

## 6.9 Aturan Komunitas yang Bisa Dipersonalisasi

Pembagian wewenang bawaan: **Dewan Etik** menjaga aturan, etika, pembinaan, dan sanksi. **Pengurus** menjalankan operasional dan keuangan. Aturan komunitas disusun bersama keduanya dan bisa disesuaikan kapan saja sesuai kebutuhan dan kehendak mereka, tanpa menyentuh kode.

### A. Isi dan editor

- Aturan tersusun dalam **bab dan pasal** (`aturan_pasal`), diedit lewat editor teks di aplikasi. Pasal bisa ditambah, diubah urutan, dan dipindah antarbab.
- Halaman **Aturan Komunitas** menampilkan versi yang berlaku, dengan daftar isi, pencarian, dan riwayat versi.
- **Isi awal (template)** disediakan sebagai kerangka yang bisa diedit penuh. Ini contoh, bukan keputusan final, sehingga wajib ditinjau dan disahkan Dewan Etik dan pengurus sebelum dipakai. Kerangka bab:
  1. Ketentuan umum (nama, tujuan, nilai komunitas)
  2. Keanggotaan (syarat, hak, kewajiban, masa percobaan, keluar atau berhenti)
  3. Kode etik anggota (sopan santun, tidak menyebarkan hoaks atau provokasi, menghormati sesama driver, tidak mengajak melanggar hukum atau aturan platform, menjaga nama baik komunitas)
  4. Keuangan dan iuran (nominal, jatuh tempo, transparansi, tata cara penggunaan kas)
  5. Kegiatan dan event (cara usul, panitia, pertanggungjawaban dana)
  6. Forum dan media sosial komunitas (aturan postingan, moderasi)
  7. Penyelesaian masalah dan sanksi (alur pengaduan, pembinaan, tangga sanksi, hak keberatan)
  8. Perubahan aturan (cara mengubah dan mengesahkan)

### B. Alur perubahan dan pengesahan

`draf` → `ditinjau` → `disahkan` → `berlaku` (versi lama otomatis `diganti`).

- Draf disusun oleh Dewan Etik atau pengurus. Setiap versi baru wajib mengisi **ringkasan perubahan**.
- **Syarat pengesahan bawaan:** mayoritas anggota aktif Dewan Etik **dan** mayoritas anggota aktif pengurus menyatakan setuju. Penyusun tidak boleh menjadi satu-satunya penyetuju.
- **Perubahan besar** (menyangkut keanggotaan, sanksi, atau pencabutan keanggotaan) memakai mode `unit_dan_anggota`: setelah disahkan kedua unit, diputuskan lewat **polling seluruh anggota** (kuorum dan ambang persetujuan diatur di konfigurasi).
- Versi baru punya **tanggal efektif**. Versi yang berlaku tidak bisa diedit, hanya diganti dengan versi baru.
- Perubahan status, pengesahan, dan tanggal efektif masuk log aktivitas.

### C. Persetujuan anggota

- Setiap versi baru yang berlaku memunculkan banner bagi anggota: "Aturan baru berlaku. Baca dulu, lalu setuju." Hero menjelaskan perubahan utamanya dengan bahasa santai.
- Anggota menekan **"Saya sudah baca dan paham"**, tercatat dengan waktu. Anggota baru wajib melakukannya saat onboarding.
- Pengurus dan Dewan Etik bisa melihat siapa yang belum. Tindak lanjutnya berupa pengingat, bukan sanksi otomatis.

### D. Sanksi bertingkat dan keputusan etik

- **Tangga sanksi** bisa diatur Dewan Etik. Bawaan: (1) teguran lisan, (2) teguran tertulis, (3) pembekuan sementara, (4) pencabutan keanggotaan.
- Kasus datang dari pengaduan (6.6 butir 2), hasil penyaringan (6.5), atau temuan pengurus. Dewan Etik memeriksa, lalu mencatat `keputusan_etik` dengan **pasal yang dilanggar** dan tindakan. Aplikasi hanya mencatat dan menegakkan prosedur. **Keputusan selalu oleh manusia.**
- **Konflik kepentingan:** anggota yang terkait kasus (pelapor, terlapor, atau punya hubungan dekat) dicatat di `tidak_ikut_memutus` dan tidak boleh ikut memutus atau meninjau.
- **Hak keberatan:** terlapor punya waktu mengajukan keberatan (bawaan 7 hari) yang ditinjau orang yang tidak ikut memutus. Keputusan baru `final` setelah batas keberatan lewat atau keberatan selesai ditinjau.
- **Pembekuan dan pencabutan keanggotaan** hanya berlaku efektif setelah (1) keputusan Dewan Etik, (2) persetujuan pengurus, dan (3) batas keberatan lewat. Hook baru mengubah `status` anggota setelah ketiganya terpenuhi.
- Kerahasiaan: detail keputusan hanya untuk terlapor, Dewan Etik, dan admin. Anggota lain hanya melihat **statistik agregat** (jumlah kasus per kategori), tanpa nama.

### E. Tautan ke fitur lain

- Setiap soal kuesioner boleh ditautkan ke pasal (`pertanyaan.pasal`), sehingga hasil uji menunjukkan pasal mana yang masih sering salah dipahami.
- Panduan (6.4) boleh menautkan pasal terkait. Hero menautkan pasal dan panduan yang relevan saat anggota menemui masalah.
- Pasal tentang keuangan dan event memakai angka dari konfigurasi (F), jadi aturan dan aplikasi tidak pernah berbeda.

### F. Konfigurasi terpusat

Semua angka dan kebijakan yang bisa berubah disimpan di `konfigurasi`, bukan ditulis di kode. Halaman **Pengaturan** menampilkan tiap parameter dengan penjelasan singkat dan menunjukkan siapa yang berwenang mengubahnya. Daftar parameter dan nilai bawaan ada di bagian 13.

- Perubahan nilai tercatat (siapa, kapan, nilai lama dan baru) di log aktivitas.
- Hero memberi tahu dampak perubahan sebelum disimpan (misal "Ubah nilai lulus ke 80%? Hasil uji baru akan memakai angka ini.").
- Perubahan konfigurasi tidak berlaku mundur untuk data yang sudah tercatat.

## 6.10 Kelengkapan Tata Kelola

Hal-hal yang sering terlewat dan perlu ada supaya aplikasi bisa dipakai jangka panjang.

1. **Onboarding anggota baru:** lewat pendaftaran yang disahkan admin, kode undangan, atau akun yang dibuat admin (lihat 6.12). Anggota baru wajib membaca dan menyetujui aturan yang berlaku, melengkapi profil dasar (6.11), dan mengikuti tur singkat hero. Masa percobaan bersifat opsional (konfigurasi).
2. **Anggota keluar atau nonaktif:** akun dinonaktifkan dan tidak bisa login. **Riwayat transaksi, iuran, dan keputusan tetap tersimpan** demi integritas catatan. Data pribadi (kontak, foto) dihapus atau dianonimkan atas permintaan, setelah masa tunggu yang diatur di konfigurasi.
3. **Privasi data:** kumpulkan data seperlunya. Kontak anggota hanya terlihat jika anggota mengizinkan. Hasil uji, pembinaan, dan pengaduan bersifat tertutup. Anggota bisa **mengunduh data pribadinya sendiri**. Tulis kebijakan privasi singkat sebagai pasal atau panduan. Aplikasi menyimpan data pribadi, jadi pemilik sebaiknya memeriksa kewajibannya menurut UU Pelindungan Data Pribadi (UU No. 27 Tahun 2022), termasuk bila perlu konsultasi ke ahli hukum.
4. **Keberlangsungan:** minimal **dua admin** (aplikasi menolak menghapus atau menurunkan admin terakhir). Tersedia prosedur reset password oleh admin. Saat pengurus berganti, ada **checklist serah terima** (akun, akses, laporan kas, dokumen). Runbook pemulihan (backup, restore, restart service) ditulis di `/home/ardy/docs`.
5. **Pemisahan tugas dan konflik kepentingan:** prinsip yang sama di seluruh aplikasi: pihak yang terkait tidak boleh memproses, memverifikasi, menilai, atau memutus perkara yang menyangkut dirinya sendiri.
6. **Hemat kuota dan HP murah:** kebanyakan anggota memakai data seluler. Muatan awal halaman diusahakan ringan (target di bawah 300KB tanpa gambar), gambar dimuat bertahap dan dikompres, ada mode hemat animasi (6.1 B), serta teks cukup besar dan kontras jelas.
7. **Pemberitahuan tanpa push:** gunakan dashboard "Tugas untukmu" dan pengingat di halaman, serta tombol bagikan ke grup WhatsApp. Jangan mencampur dengan bot alert server.
8. **Pemeliharaan:** pembaruan PocketBase dilakukan terjadwal dan diuji dulu di salinan data. Pantau ukuran folder upload dan sisa disk lewat alert server.

## 6.11 Menu Profil Anggota

Setiap anggota punya menu **Profil** untuk melengkapi dan memperbarui data sendiri kapan saja.

**Isi halaman**
1. **Ringkasan**: foto, nama tampil, nama panggilan, jabatan dan unit, serta pangkat/badge jika modulnya aktif. Ada **bar kelengkapan profil** (gaya game: "profil 70 persen"), hero memberi saran bidang yang belum diisi.
2. **Data pribadi**: nama, nama panggilan, WhatsApp, email, domisili, tanggal lahir, bio, kontak darurat, dan **bidang kustom** buatan admin (misal wilayah mangkal, jenis kendaraan, platform yang dipakai). Anggota hanya melihat dan mengubah bidang yang diizinkan.
3. **Privasi**: untuk tiap bidang, anggota memilih siapa yang boleh melihat (hanya saya, pengurus, atau semua anggota), dibatasi oleh `terlihat_oleh` di `bidang_profil`. Pilihan bawaan adalah yang paling tertutup.
4. **Aktivitas saya** (hanya dibaca): status iuran, kehadiran, event yang dipanitiai, hasil uji milik sendiri, aturan yang sudah disetujui.
5. **Keamanan**: ganti password, keluar dari perangkat lain.
6. **Data saya**: unduh data pribadi sendiri (JSON/CSV) dan **ajukan penghapusan data pribadi** (aturan di 6.10 butir 2).

**Wizard "Lengkapi Profil"** (hero memandu): foto dan nama, kontak, bidang kustom, privasi, ringkasan lalu simpan. Wizard muncul otomatis pada login pertama dan bisa dilewati, lalu dibuka lagi dari Profil.

**Aturan**
- Bidang wajib ditentukan admin (`bidang_wajib_profil`). Bawaan hanya nama dan WhatsApp. Jangan meminta data sensitif seperti NIK atau foto KTP kecuali benar-benar perlu. Saat admin membuat bidang baru, hero mengingatkan "kumpulkan data seperlunya".
- Perubahan profil divalidasi di server, bukan hanya di tampilan.
- Admin (pemegang `kelola_anggota`) bisa membantu mengubah profil anggota yang kesulitan, dan perubahannya tercatat di log.
- Foto dikompres di klien sesuai batas unggah di konfigurasi.
- Profil anggota lain dibuka lewat daftar anggota atau halaman struktur dan hanya menampilkan `profil_publik`.

## 6.12 Pendaftaran Anggota Baru

Calon anggota mendaftar sendiri lewat halaman **Daftar**. **Admin yang mengesahkan**, sehingga tidak ada akun yang aktif sebelum disetujui.

### A. Alur

1. Calon anggota membuka halaman Daftar (tanpa login), mengisi formulir, dan membuat password sendiri.
2. Sistem membuat akun berstatus `menunggu` (belum bisa login) dan catatan `pendaftaran`, lalu menampilkan **kode cek** untuk memantau status.
3. Admin menerima pengajuan di menu **Pendaftaran** (dengan penanda jumlah yang menunggu di dashboard).
4. Admin memilih: **Setujui**, **Tolak** (alasan wajib), atau **Minta data tambahan**.
5. Saat disetujui: status akun menjadi `aktif`, `role` menjadi `anggota`, `tanggal_gabung` terisi, dan izin bawaan anggota terpasang. Admin bisa langsung memasang unit atau jabatan jika perlu.
6. Login pertama: anggota **membaca dan menyetujui aturan** yang berlaku (6.9 C), menjalani wizard Lengkapi Profil (6.11), dan tur singkat hero.

### B. Isi formulir

- Wajib: nama lengkap, WhatsApp, password, persetujuan membaca aturan (versi yang berlaku ditampilkan dan dicatat), persetujuan kebijakan privasi.
- Opsional atau diatur admin: domisili, alasan bergabung, diajak oleh siapa, kode undangan, dan **bidang tambahan** dari `bidang_profil` yang bertanda `tampil_di_pendaftaran`.
- Tidak meminta NIK atau dokumen identitas bawaan.

### C. Pengajuan lewat route hook (bukan create langsung)

Karena collection tidak membuka create publik, pendaftaran masuk lewat **route khusus di `pb_hooks`** (`routerAdd`), misalnya `POST /api/komunitas/daftar` dan `GET /api/komunitas/status/{kode}`. Route tersebut:
- Memvalidasi isian, memeriksa duplikat (nomor WhatsApp yang sudah terdaftar), dan memeriksa kode undangan jika mode mewajibkan.
- Membuat akun `menunggu` dan `pendaftaran` dalam satu langkah, lalu mengembalikan `kode_cek`.
- Hanya mengembalikan status dan catatan yang boleh dilihat pendaftar (alasan penolakan, permintaan data tambahan), tidak membocorkan data lain.
- Dilindungi: aktifkan rate limit bawaan PocketBase, batasi pengajuan per nomor WhatsApp dan per alamat IP, tambahkan kolom jebakan bot (honeypot), dan tolak password lemah. Jika spam tetap masuk, tambahkan captcha atau kode undangan wajib.

### D. Mode pendaftaran (konfigurasi)

| Mode | Perilaku |
|---|---|
| `terbuka_dengan_persetujuan` (bawaan) | Siapa pun bisa mendaftar, admin yang mengesahkan |
| `dengan_undangan` | Wajib kode undangan sekali pakai dari pengurus atau admin, tetap disahkan admin |
| `tertutup` | Halaman Daftar mati, akun hanya dibuat admin |

Admin bisa menutup atau membuka pendaftaran kapan saja lewat `pendaftaran_dibuka`.

### E. Aturan dan keamanan

- Yang mengesahkan bawaannya **admin** (izin `sahkan_pendaftaran`). Admin boleh mendelegasikannya ke pengurus lewat pemetaan izin (6.13).
- Akun berstatus `menunggu`, `ditolak`, atau `nonaktif` **tidak bisa login** (diuji lewat API langsung).
- Pendaftar yang ditolak boleh mengajukan lagi setelah masa tunggu yang diatur di konfigurasi.
- Setiap keputusan (setuju, tolak) tercatat di log dengan nama admin dan waktu.
- Data pendaftar yang ditolak dihapus atau dianonimkan setelah masa tunggu yang diatur di konfigurasi.
- Pemberitahuan tanpa push: pendaftar mengecek lewat halaman status. Admin bisa memakai tombol bagikan ke WhatsApp untuk mengabari hasilnya. Email hanya dipakai jika SMTP sudah dipasang pemilik dan itu opsional.

## 6.13 Fleksibilitas: Semua Bisa Diatur, Tidak Kaku

Tujuan: komunitas dengan kebutuhan yang tidak umum tetap bisa memakai aplikasi ini **tanpa mengubah kode**, dan semua keputusan bisa berubah kapan saja.

### A. Semua isian awal bisa diubah kapan saja

Nama komunitas, logo, nominal iuran, struktur dan pejabat, pasal aturan, dan kuesioner **bukan syarat pemasangan**. Aplikasi jalan dengan nilai sementara, lalu diisi atau diubah lewat aplikasi kapan pun, berapa kali pun.

- Perubahan nama, logo, dan warna langsung berlaku di seluruh aplikasi (6.2).
- Perubahan iuran berlaku untuk periode berikutnya. Periode yang sudah tercatat tidak ikut berubah.
- Pejabat dan struktur berganti lewat jabatan berperiode (6.3), riwayat tetap ada.
- Aturan berganti lewat versi dan pengesahan (6.9). Kuesioner bisa dibuat, diedit, digandakan, dan dinonaktifkan kapan saja (6.5).
- **Wizard Setup** boleh dilewati dan dibuka kembali dari Pengaturan sebagai "Atur Ulang Komunitas" tanpa menghapus data.

### B. Modul bisa dinyalakan atau dimatikan

Parameter `modul_aktif` menentukan fitur apa yang dipakai. Menu dan halaman mengikuti: modul yang mati **tidak muncul** di menu dan tidak membebani tampilan. Data tidak dihapus saat modul dimatikan.

Modul: kas dan iuran, struktur, forum, panduan, kuesioner dan penyaringan, event, pengumuman, pengaduan, polling, agenda dan notulen, dokumen, pangkat dan badge, aturan komunitas, progres pengembangan.

### C. Daftar pilihan dan bidang yang bisa diatur sendiri

- Kategori kas, kategori forum, kategori panduan, jenis event, seksi panitia, jenis unit, kategori pengaduan, dan kategori dokumen dikelola di halaman **Daftar Pilihan** (`referensi`). Komunitas bisa menambah, mengubah label, mengurutkan, dan menonaktifkan pilihan. Pilihan bertanda `sistem` tidak bisa dihapus.
- **Bidang profil kustom** (`bidang_profil`) bisa ditambah untuk menampung data khas komunitas, dengan tipe, aturan wajib, dan batas keterlihatan.
- **Unit struktur** tidak dibatasi: komunitas bisa membuat unit sesuai kebutuhan (misal Koordinator Wilayah, Tim Sosial, Tim Bengkel), selain Dewan Etik, Satgas, dan Pengurus.
- **Ekspor dan impor pengaturan** (JSON): daftar pilihan, bidang profil, modul aktif, pemetaan izin, dan konfigurasi. Data pribadi dan transaksi **tidak ikut**. Berguna untuk cadangan pengaturan atau memindahkan pengaturan ke komunitas lain.

### D. Pemetaan izin yang bisa diatur

Aturan akses di 5.x yang menyebut role atau tim dibaca sebagai **izin**. Izin efektif tiap anggota (`users.izin`) dihitung hook dari role dan jabatan aktif berdasarkan `pemetaan_izin`. Admin bisa mengubah siapa memegang izin apa, tanpa kode.

| Izin | Pemegang bawaan |
|---|---|
| `kelola_pengaturan` | admin |
| `kelola_anggota` | admin |
| `sahkan_pendaftaran` | admin |
| `kelola_kas` (input kas dan iuran) | bendahara, admin |
| `verifikasi_transaksi_event` | bendahara, admin |
| `kelola_konten` (panduan, pengumuman, dokumen) | pengurus, admin |
| `moderasi_forum` | pengurus, admin, unit satgas |
| `kelola_kuesioner` | pengurus, admin |
| `tangani_etik` (pengaduan, pembinaan, keputusan etik) | unit Dewan Etik, admin |
| `sahkan_aturan` | unit Dewan Etik dan pengurus (sesuai 6.9 B) |
| `kelola_event` (buat event, tunjuk ketua pelaksana) | pengurus, admin |

**Pengaman (tidak bisa diubah lewat pengaturan):**
- Transaksi kas dan transaksi event tidak bisa diedit atau dihapus oleh siapa pun.
- Pembuat transaksi tidak bisa memverifikasi transaksinya sendiri, dan pihak yang terkait kasus atau penilaian tidak boleh memprosesnya sendiri.
- Kunci jawaban kuesioner tidak pernah terbaca anggota biasa.
- Identitas pelapor anonim tidak pernah tersimpan.
- Versi aturan yang sudah berlaku dan log aktivitas tidak bisa diedit atau dihapus.
- Minimal ada dua admin. Izin `kelola_pengaturan` dan `kelola_anggota` tidak bisa dicabut dari admin terakhir.
- Perubahan pemetaan izin tercatat di log dan hero menampilkan peringatan dampaknya sebelum disimpan.

### E. Alamat (domain)

Domain tidak bisa diganti dari dalam aplikasi karena diatur di Caddy dan Cloudflare Tunnel. Aplikasi **tidak boleh menuliskan domain di kode**: gunakan alamat relatif dan satu parameter `url_aplikasi` untuk tautan yang perlu alamat lengkap (misal tautan bagikan). Mengganti domain cukup mengubah konfigurasi Caddy dan tunnel serta `url_aplikasi`, tanpa membangun ulang aplikasi. Langkahnya ditulis di runbook `/home/ardy/docs`.

## 6.14 Halaman Progres Pengembangan (otomatis)

Halaman khusus yang menunjukkan **fase pengembangan, fitur yang sudah berfungsi, yang masih dikerjakan, dan yang belum dibuat**. Semua anggota bisa melihatnya. **Tidak ada yang mengedit halaman ini secara manual.** Statusnya dihitung dari hasil uji otomatis, jadi tidak bisa sekadar "diklaim selesai".

### A. Prinsip

1. **Status = bukti.** Fitur baru dihitung `berfungsi` jika semua uji otomatisnya lulus. Fitur tanpa uji otomatis ditampilkan "Belum ada uji" dan **tidak** dihitung berfungsi.
2. **Semua fitur dari plan tampil sejak awal**, termasuk yang belum dibuat, supaya terlihat peta jalannya. Daftarnya berasal dari registry (lihat B), bukan diketik di halaman.
3. **Jujur dan tanpa perkiraan tanggal.** Tidak ada ETA karangan. Yang ditampilkan hanya status terkini, waktu uji terakhir, dan riwayat.
4. **Aman.** Detail teknis dan kegagalan di area keamanan tidak ditampilkan ke anggota (lihat D).

### B. Sumber data

- **Registry** `progres/registry.json` (masuk git): daftar fase, fitur, dan uji. Diisi dari peta fase di 11.1 dan butir "Selesai bila" tiap tahap. Aturannya:
  - Setiap fitur yang dibuat **wajib** didaftarkan dengan minimal satu uji otomatis.
  - Uji hanya boleh **ditambah atau diperketat**. Menghapus atau melemahkan uji wajib dari plan dianggap pelanggaran dan terlihat di riwayat git.
- **Runner uji** `progres/jalankan-uji` (skrip Node atau bash). Langkahnya:
  1. Menyalakan **PocketBase sementara** di folder sementara (`/tmp`), memasang migrasi, dan membuat akun uji (admin, bendahara, pengurus, anggota, anggota menunggu). **Tidak menyentuh data produksi.**
  2. Menjalankan semua uji pada instance sementara itu.
  3. Mematikan instance sementara lalu mengirim ringkasan hasil ke produksi (C).
- Instance sementara juga mengikuti aturan server: di-bind ke IP Tailscale (bukan 127.0.0.1) dengan port acak yang bebas.
- Runner dibatasi: memori maksimal sekitar 300MB (`systemd-run` dengan `MemoryMax`), dijalankan hanya jika RAM bebas cukup, dan berhenti sendiri jika melewati batas waktu.
- **Pemicu:** otomatis **setelah setiap deploy** dan lewat **systemd timer terjadwal** (bawaan tiap 6 jam, `progres_interval_uji_jam`). Jika gagal jalan, kegagalan runner sendiri dikirim ke bot alert server.
- **Jenis uji:**
  - `ada_koleksi` dan `ada_route`: collection, field, dan route yang seharusnya ada
  - `uji_api`: perilaku dan aturan akses lewat API (misal anggota tidak bisa menulis kas)
  - `uji_statis`: pemeriksaan berkas (ukuran aset, tidak ada domain tertulis di kode, logo SVG ditolak, aturan reduced-motion ada)
  - `uji_ui_ringan`: pemeriksaan DOM ringan tanpa browser penuh (tidak memasang Chromium di Vaio)
  - `uji_manual`: hal yang memang tidak bisa diotomatisasi (misal kehalusan animasi di HP kelas bawah). Status "Butuh dicek langsung" sampai pemegang izin `kelola_pengaturan` menekan **Konfirmasi sudah dicek**, yang dicatat permanen (siapa, kapan, versi).
- **Cara status dihitung** (oleh server saat menerima hasil):
  - `belum_dibuat`: collection atau route yang dibutuhkan belum ada
  - `dalam_pengerjaan`: sebagian ada, tetapi belum semua uji lulus
  - `berfungsi`: semua uji lulus
  - `bermasalah`: sebelumnya `berfungsi`, sekarang ada uji yang gagal (regresi)
  - Fase: `selesai` jika semua fiturnya `berfungsi`, `bermasalah` jika ada fitur bermasalah, `berjalan` jika sebagian, `belum_mulai` jika belum ada yang jalan. **Fase aktif** adalah fase pertama yang belum selesai.
- **Catatan perubahan otomatis:** diambil dari subjek `git log` sejak rilis sebelumnya. AI dev menulis pesan commit **singkat berbahasa Indonesia** dengan format `feat(modul): ...`, `fix(modul): ...`, atau `perf(modul): ...`. Hanya tipe itu yang ditampilkan ke anggota.

### C. Route (satu-satunya pintu)

- `POST /api/komunitas/progres/masuk`: dipanggil runner. Wajib header tanda tangan **HMAC-SHA256** atas isi pesan dengan rahasia bersama, ditambah stempel waktu (ditolak jika lebih dari 5 menit dari waktu server, untuk mencegah pengiriman ulang). Batas ukuran isi sekitar 256KB. Menolak skema yang tidak valid. Rahasia disimpan di berkas env dengan izin 600 dan **tidak masuk git**. Cara memutar rahasia ditulis di runbook.
- `GET /api/komunitas/progres`: dipakai halaman. Hanya untuk user login `aktif`. Opsi `progres_terbuka_publik` (bawaan mati) membukanya tanpa login. Mengembalikan data ringkas yang sudah disaring.
- `GET /api/komunitas/progres/detail`: hanya pemegang izin `kelola_pengaturan`. Menampilkan hasil uji per uji termasuk `pesan_internal`.
- `POST /api/komunitas/progres/konfirmasi`: hanya pemegang izin `kelola_pengaturan`, untuk uji bertipe `uji_manual`.

### D. Penyaringan keamanan

- Pesan error mentah, jalur berkas, atau nama uji bertanda `sensitif` **tidak pernah** dikirim ke anggota. Untuk uji sensitif yang gagal, tampilan hanya "Perlu perbaikan" tanpa penjelasan teknis.
- Pesan yang tampil ke anggota berasal dari **pemetaan pesan ramah** di registry (maksimal 200 karakter), bukan dari keluaran uji.
- Catatan perubahan tidak boleh memuat rahasia. Runner membuang subjek yang mengandung pola seperti `token`, `secret`, `password`, atau alamat IP.

### E. Tampilan halaman

Bagian atas adalah ringkasan, bagian bawah rinci. Gaya game ada di ringkasan, sedangkan rincian tetap daftar yang rapi dan mudah dibaca (aturan 6.1 A).

1. **Ringkasan:** persen fitur yang berfungsi, jumlah per status (berfungsi, dalam pengerjaan, belum dibuat, bermasalah), fase aktif, waktu uji terakhir (misal "dicek 12 menit lalu") dan versi.
2. **Peta perjalanan:** deretan fase sebagai pos pemberhentian jalan (tema ojol): motor berada di fase aktif, pos yang selesai menyala, yang belum redup. Untuk fase dengan masalah, pos diberi tanda peringatan.
3. **Daftar fase:** kartu bisa dibuka. Isinya fitur dengan label status: ✅ Udah jalan, 🛠️ Lagi dirakit, ⏳ Belum dibuat, ⚠️ Lagi bermasalah, 🔍 Butuh dicek langsung. Tiap fitur menampilkan nama, deskripsi santai, jumlah uji lulus (misal 4 dari 5), dan `catatan_publik`.
4. **Filter:** semua, sudah jalan, belum jalan.
5. **Apa yang baru:** daftar catatan perubahan otomatis dari rilis terbaru.
6. **Riwayat uji:** grafik garis kecil (SVG) tingkat kelulusan dari rilis-rilis terakhir.
7. **Hero** memberi komentar singkat bergaya santai sesuai data (misal "Fitur kas udah jalan, bro. Forum masih dirakit.").

### F. Pembaruan otomatis di tampilan

- Data dimuat saat halaman dibuka, saat tab kembali aktif, dan ada tombol **Muat ulang**.
- Selama halaman ini terbuka dan tab aktif, muat ulang ringan tiap 5 menit. Tidak ada websocket (sesuai batas beban 6.7).
- Menu "Progres Aplikasi" punya penanda kecil "baru" jika ada rilis sejak kunjungan terakhir.
- Setelah pengembangan selesai, admin bisa menyembunyikan menunya lewat `modul_aktif`. Data tetap tersimpan.
- Opsional: ringkasan tiap putaran uji dikirim ke bot alert server (bot terpisah, tidak dicampur bot lain).

### G. Catatan keterbatasan

Halaman ini membuktikan bahwa uji yang ditulis lulus. Ia tidak menjamin tidak ada celah di luar uji. Karena itu uji wajib dari plan harus lengkap, dan hal yang tidak bisa diotomatisasi diberi tanda "Butuh dicek langsung".

## 6.15 Menu Pengguna dan Keluar (Logout)

Setiap halaman setelah login punya **menu pengguna** (foto atau avatar kecil di header). Tombol **Keluar** juga ada di bagian bawah halaman Profil supaya mudah dijangkau di HP.

**Isi menu pengguna:** Profil, Pengaturan (hanya jika berwenang), Mode hemat animasi, Progres Aplikasi, dan **Keluar**.

**Perilaku Keluar**
1. Menampilkan konfirmasi singkat bergaya hero, misalnya "Cabut dulu, bro? Sampai ketemu di basecamp!". Jika ada **draf wizard yang belum tersimpan**, peringatan menyebutnya dan menjelaskan bahwa draf akan dihapus.
2. Menghapus token login dari perangkat, membersihkan draf wizard, data profil dalam cache, dan cache layanan (service worker) yang berisi respons ber-token.
3. Kembali ke halaman login. Tombol Back pada browser tidak boleh menampilkan halaman berisi data pribadi dari cache.

**Pilihan sesi saat login**
- Kotak **"Ingat saya di perangkat ini"**. Jika dicentang, token disimpan di penyimpanan lokal. Jika tidak, token hanya di `sessionStorage` dan hilang saat tab atau aplikasi ditutup (untuk HP bersama atau warnet).
- Durasi sesi bawaan mengikuti pengaturan token PocketBase dan bisa diatur lewat `sesi_durasi_hari`.

**Keluar dari semua perangkat**
- Ada di Profil, bagian Keamanan. Aksi ini memperbarui kunci token akun (`tokenKey`) sehingga semua token lama langsung tidak berlaku.
- Keluar biasa hanya menghapus token di perangkat yang dipakai. Penjelasan ini ditampilkan di layar supaya tidak menimbulkan salah paham.
- Mengganti password juga otomatis membatalkan semua token lama.

**Aturan**
- Tombol Keluar selalu terlihat dan tidak boleh disembunyikan di balik pengaturan.
- Akun `menunggu`, `ditolak`, dan `nonaktif` tidak bisa login. Jika status akun berubah menjadi `nonaktif` saat sedang login, permintaan berikutnya ditolak dan anggota diarahkan ke halaman login.

## 7. Struktur direktori yang diusulkan

```
/home/ardy/apps/komunitas/
  pocketbase          # binary
  pb_data/            # database + file upload (JANGAN di-commit)
  pb_migrations/      # migrasi skema (commit ke git)
  pb_hooks/           # hook server JS (penilaian kuesioner, sinkron tim, log aktivitas); commit ke git
  pb_public/          # frontend hasil build
  frontend/           # source frontend
  docs/               # catatan teknis proyek
  progres/            # registry.json dan skrip runner uji (commit ke git, rahasia di berkas env terpisah)
  tests/              # berkas uji otomatis yang dirujuk registry
```

Skema harus dibuat lewat **migrasi** (`pb_migrations`) supaya bisa direproduksi di server lain.

## 8. Deployment

1. Jalankan PocketBase sebagai systemd service, bind ke **IP Tailscale** sesuai aturan server.
2. Caddy meneruskan ke PocketBase.
3. Cloudflare Tunnel mengarahkan domain/subdomain publik ke Caddy. Catatan: karena aturan bind Tailscale, pastikan tunnel bisa menjangkau service tersebut. Jika tidak bisa, **berhenti dan tanyakan ke pemilik server**, jangan ubah aturan bind sendiri.
4. Aktifkan HTTPS dan pastikan admin UI PocketBase (`/_/`) hanya bisa diakses lewat Tailscale, tidak lewat domain publik.
5. Catat port dan nama service di `/home/ardy/docs`.
6. Setelah setiap deploy, jalankan runner uji (`progres/jalankan-uji`) secara otomatis, dan pasang systemd timer untuk putaran terjadwal (6.14 B).

## 9. Backup

- Backup harian: hentikan tulis singkat atau pakai fitur backup bawaan PocketBase, hasilnya satu file zip dari `pb_data`.
- Simpan lokal beberapa hari terakhir, lalu salin otomatis ke Google Drive (sesuai kebijakan backup server).
- Uji restore minimal sekali sebelum dipakai anggota.
- Kirim alert kegagalan backup lewat bot Telegram alert server (bot terpisah, jangan pakai bot lain).

## 10. Keamanan

- Password minimal 8 karakter, batasi percobaan login.
- Upload bukti: hanya gambar, batasi ukuran (misalnya 2MB) dan kompres di sisi klien.
- Jangan simpan data sensitif di luar kebutuhan (tidak perlu NIK, alamat lengkap, dsb).
- Jangan commit `pb_data`, `.env`, atau token apa pun ke git.

## 11. Tahapan kerja

Setiap tahap harus lolos kriteria selesai sebelum lanjut. Laporkan hasilnya ke pemilik di akhir tiap tahap.

### Peta Fase dan Pelacakan

Tiap tahap di bawah adalah satu **fase** yang tampil di halaman Progres Pengembangan (6.14), dengan kode yang sama dengan nomor tahapnya. Kamu bisa melacak kemajuan dari halaman itu, tanpa perlu menunggu laporan manual.

| Kode | Nama fase | Bagian plan |
|---|---|---|
| F0 | Cek Bengkel (persiapan) | 11 |
| F1 | Rakit Mesin (backend inti) | 5, 5.1 |
| F1b | Panel Setelan (konfigurasi dan fleksibilitas) | 5.6, 5.8 |
| F1c | Dasbor Progres (runner uji dan halaman progres) | 5.10, 6.14 |
| F2 | Muka Depan (login, dashboard, kas, menu pengguna) | 6, 6.15 |
| F2b | Daftar dan Profil | 5.8, 6.11, 6.12 |
| F3 | Iuran dan Anggota | 6 |
| F3b | Dandan (animasi, hero, wizard) | 6.1 |
| F3c | Identitas dan Struktur | 6.2, 6.3 |
| F3c-2 | Aturan Main (aturan dan keputusan etik) | 6.9, 6.10 |
| F3d | Panduan, Forum, Pengumuman | 6.4 |
| F3e | Uji Anggota | 6.5 |
| F3f | Pelengkap | 6.6 |
| F3g | Event Komunitas | 6.8 |
| F4 | Meluncur (deployment) | 8 |
| F5 | Backup dan Uji Akhir | 9 |
| F6 | Agenda (opsional) | 6.6 |

**Aturan pelacakan**
- Setiap kalimat "Selesai bila" pada tahap dan setiap butir yang relevan di bagian 12 harus diterjemahkan menjadi **minimal satu uji otomatis** di registry. Ini disebut **uji wajib** dan tidak boleh dihapus atau dilemahkan.
- Setiap fitur di bagian 6 dipecah menjadi entri fitur dengan nama ramah pengguna dan deskripsi santai.
- Fase baru dianggap selesai hanya jika semua fiturnya `berfungsi` pada halaman progres. AI dev tidak menyatakan fase selesai berdasarkan klaim sendiri.
- Setelah tiap fase selesai, AI dev melaporkan ringkasan singkat ke pemilik, dan hasilnya sudah bisa dicek di halaman progres.
- Fase yang melibatkan uji manual (misal kehalusan animasi di HP) ditandai "Butuh dicek langsung" sampai dikonfirmasi pemegang izin `kelola_pengaturan`.

### Rincian tiap tahap

**Tahap 0: Persiapan**
- Baca `AGENTS.md`, cek RAM dan disk tersisa, cek port yang sudah terpakai.
- Selesai bila: daftar port bebas dan struktur folder sudah dikonfirmasi.

**Tahap 1: Backend**
- Pasang PocketBase, buat collection dan aturan akses (bagian 5), buat migrasi, buat akun admin dan 2 akun uji (bendahara, anggota).
- Selesai bila: akun anggota tidak bisa menulis atau menghapus `kas`; akun bendahara bisa input tapi tidak bisa edit/hapus.

**Tahap 1b: Konfigurasi dan fleksibilitas dasar**
- Buat collection `konfigurasi`, `referensi`, `bidang_profil`, dan `pemetaan_izin` (5.6, 5.8), isi nilai bawaan dari bagian 13 dan isi awal daftar pilihan dari skema, serta hook yang menghitung `users.izin` dari role dan jabatan. Terapkan parameter `modul_aktif` dan `url_aplikasi`.
- Modul lain membaca angka dan pilihan dari sini, bukan menuliskannya di kode.
- Selesai bila: mengubah satu nilai di konfigurasi atau satu daftar pilihan langsung memengaruhi aplikasi tanpa ubah kode, hanya pihak berwenang yang bisa mengubah, perubahan tercatat di log, mematikan modul menghilangkan menunya, dan admin terakhir tidak bisa dicabut izinnya.

**Tahap 1c: Dasbor Progres** (bagian 5.10, 6.14). Dibangun sedini mungkin supaya pelacakan bisa dimulai sejak awal.
- Collection `progres_*`, route hook (masuk, baca, detail, konfirmasi), `progres/registry.json` yang diisi dari peta fase di atas, runner uji dengan PocketBase sementara, systemd timer, pemicu setelah deploy, dan halaman progres sederhana (HTML polos dari `pb_public`).
- Sebelum login tersedia, halaman ini hanya bisa dibuka lewat Tailscale. Setelah Tahap 2 ia berada di belakang login dan mendapat tampilan lengkap.
- Selesai bila: registry tervalidasi dan terbaca, runner selesai di instance sementara tanpa menyentuh data produksi dan tidak melewati batas memori, hasil masuk lewat route bertanda tangan, route menolak permintaan tanpa tanda tangan atau dengan stempel waktu kedaluwarsa, collection `progres_*` tidak bisa dibaca atau ditulis klien langsung, pesan error mentah tidak muncul di halaman, dan halaman menampilkan semua fase dan fitur dari plan beserta statusnya.

**Tahap 2: Frontend inti**
- Login, menu pengguna dengan tombol Keluar (6.15), dashboard, halaman kas, form input kas, dan halaman Progres Pengembangan versi lengkap di belakang login.
- Selesai bila: alur login, input transaksi, dan Keluar berfungsi di HP, saldo terhitung benar, token lama tidak lagi berlaku setelah Keluar dari semua perangkat, dan halaman Progres tampil di belakang login.

**Tahap 2b: Profil dan pendaftaran** (bagian 5.8, 5.9, 6.11, 6.12)
- Menu Profil beserta wizard Lengkapi Profil, `profil_publik` dari hook, bidang kustom dan privasi. Halaman Daftar, route hook pendaftaran, layar Pendaftaran untuk admin (setujui, tolak, minta data tambahan), halaman cek status, dan onboarding login pertama.
- Selesai bila: akun `menunggu`, `ditolak`, dan `nonaktif` tidak bisa login (diuji lewat API), anggota tidak bisa mengubah `role`, `izin`, atau `status` dirinya, anggota tidak bisa membaca data `users` anggota lain, `pendaftaran` tidak bisa dibuat langsung lewat API, rate limit dan honeypot aktif, dan hanya admin yang bisa mengesahkan pendaftaran.

**Tahap 3: Iuran dan anggota**
- Halaman iuran, kelola anggota, ekspor CSV.
- Selesai bila: bendahara bisa menandai iuran lunas dan otomatis tercatat di kas.

**Tahap 3b: Tampilan, hero, dan wizard** (kerjakan setelah fungsi inti beres)
- Dashboard "Markas" dan animasi (bagian 6.1 A dan B), karakter hero SVG (C), wizard (D), mode hemat animasi dan mode cepat.
- Selesai bila: semua aturan performa 6.1 B terpenuhi, wizard Catat Kas dan Tandai Iuran berfungsi dengan layar konfirmasi, hero bisa disembunyikan, dan dashboard tetap lancar di HP kelas bawah.

**Tahap 3c: Personalisasi dan struktur** (bagian 6.2 dan 6.3)
- Pengaturan komunitas (nama, logo, warna, hero), wizard setup pertama, halaman struktur dan jabatan, sinkronisasi `tim`.
- Selesai bila: admin bisa mengganti nama, logo, dan warna tanpa menyentuh kode, tampilan ikut berubah di seluruh aplikasi, struktur dan jabatan tampil, dan aturan akses `unit`/`jabatan` lolos uji.

**Tahap 3c-2: Aturan komunitas dan keputusan etik** (bagian 5.6, 5.7, 6.9, 6.10)
- Editor aturan (bab dan pasal), versi dan pengesahan, persetujuan anggota, tangga sanksi, keputusan etik, keberatan, serta kelengkapan tata kelola 6.10 (undangan, nonaktif, minimal dua admin).
- Selesai bila: versi aturan hanya bisa berlaku setelah syarat pengesahan terpenuhi, versi yang berlaku tidak bisa diedit, anggota yang terkait kasus tidak bisa ikut memutus, pencabutan keanggotaan baru efektif setelah tiga syaratnya terpenuhi, dan detail keputusan etik tidak terbaca anggota biasa.

**Tahap 3d: Panduan, forum, pengumuman** (bagian 6.4 dan 6.6 butir 1)
- Panduan (draf/terbit, pencarian), forum dengan moderasi, pengumuman.
- Selesai bila: pengurus bisa menulis dan menerbitkan panduan, anggota bisa membuat topik dan membalas, moderasi berfungsi, anggota biasa tidak bisa menyunting milik orang lain.

**Tahap 3e: Kuesioner dan penyaringan** (bagian 6.5)
- Editor kuesioner, hook penilaian di server, siklus penyaringan, dashboard siklus, pembinaan.
- Selesai bila: anggota tidak bisa membaca kunci jawaban lewat API (sudah diuji), nilai tidak bisa dipalsukan, pengurus bisa membuat dan mengedit kuesioner, dan siklus menampilkan status per anggota.

**Tahap 3f: Fitur pelengkap** (bagian 6.6 butir 2 sampai 9, kerjakan satu per satu, boleh dipilih pemilik)
- Selesai bila: tiap fitur punya aturan akses yang diuji dan tidak melanggar batas beban di 6.7.

**Tahap 3g: Event komunitas** (bagian 5.4, 5.5, 6.8). Kerjakan dalam tiga langkah, selesaikan satu sebelum lanjut.
- **3g-1** Event, penunjukan ketua, panitia, checklist tugas, peserta. Selesai bila: pengurus bisa membuat event dan menunjuk ketua, ketua bisa menyusun panitia sendiri, anggota biasa tidak bisa mengubah panitia atau menunjuk ketua.
- **3g-2** Anggaran, sumber dana, transaksi event, verifikasi, halaman Peta Dana, jalur dana dari kas komunitas. Selesai bila: transaksi tanpa bukti atau tanpa sumber/pos ditolak, transaksi tidak bisa diedit atau dihapus, pembuat tidak bisa memverifikasi transaksinya sendiri, dan saldo event cocok dengan hitungan manual.
- **3g-3** Wizard laporan, laporan keuangan otomatis, syarat penutupan, arsip. Selesai bila: event tidak bisa ditutup sebelum semua syarat di 6.8 E terpenuhi, dan laporan keuangan sama dengan data transaksi.

**Tahap 4: Deployment**
- systemd, Caddy, Cloudflare Tunnel, PWA.
- Selesai bila: bisa dibuka dari luar jaringan, bisa di-install ke layar HP, admin UI tidak terbuka publik.

**Tahap 5: Backup dan uji**
- Backup otomatis ke Google Drive, uji restore, alert Telegram.
- Selesai bila: restore ke folder uji berhasil dan data identik.

**Tahap 6 (opsional): Agenda**

## 12. Cek sebelum dinyatakan selesai

- [ ] Pemakaian RAM aplikasi di bawah 150MB saat idle
- [ ] Anggota biasa tidak bisa mengubah atau menghapus kas (sudah diuji)
- [ ] Pengeluaran tanpa bukti ditolak
- [ ] Saldo di dashboard sama dengan hitungan manual dari riwayat
- [ ] Admin UI tidak bisa diakses lewat domain publik
- [ ] Backup berjalan dan restore sudah diuji
- [ ] Dokumentasi ada di `/home/ardy/docs`
- [ ] Animasi hanya `transform`/`opacity`, maksimal 20 elemen bergerak, mode hemat animasi berfungsi
- [ ] Halaman Kas dan Iuran tetap tabel polos yang terbaca jelas
- [ ] Wizard punya layar konfirmasi dan draf tersimpan sementara; mode cepat tersedia
- [ ] Hero bisa disembunyikan dan tidak memblokir pekerjaan
- [ ] Nama, logo, dan warna komunitas bisa diganti dari halaman pengaturan tanpa ubah kode (logo tidak boleh SVG)
- [ ] Kunci jawaban kuesioner tidak bisa dibaca anggota lewat API, nilai dihitung server
- [ ] Nilai individu hanya terlihat oleh yang bersangkutan, pengurus, dan Dewan Etik
- [ ] Pengaduan anonim tidak menyimpan identitas pelapor
- [ ] Pemakaian RAM tetap di bawah 150MB setelah semua fitur aktif
- [ ] Ketua pelaksana hanya bisa ditunjuk pengurus/admin; panitia hanya bisa disusun ketua event tersebut
- [ ] Transaksi event wajib bukti, sumber dana, dan pos anggaran; tidak bisa diedit atau dihapus; verifikasi tidak oleh pencatatnya sendiri
- [ ] Event tidak bisa ditutup kecuali transaksi terverifikasi, sisa dana dikembalikan, dan laporan disetujui
- [ ] Laporan keuangan event dibuat otomatis dan cocok dengan data transaksi
- [ ] Aturan komunitas bisa diubah Dewan Etik dan pengurus lewat aplikasi, ada riwayat versi, dan versi berlaku tidak bisa diedit
- [ ] Semua angka kebijakan dibaca dari `konfigurasi`, tidak ditulis di kode
- [ ] Keputusan etik: ada hak keberatan, yang terkait kasus tidak ikut memutus, detail tertutup untuk anggota biasa
- [ ] Aplikasi menolak menghapus atau menurunkan admin terakhir
- [ ] Pendaftaran baru berstatus `menunggu` dan tidak bisa login sampai admin mengesahkan; penolakan wajib beralasan
- [ ] Anggota bisa melengkapi dan mengubah profilnya sendiri tetapi tidak bisa mengubah role, izin, atau status; data yang disembunyikan tidak bocor lewat API
- [ ] Nama komunitas, logo, iuran, struktur, aturan, kuesioner, daftar pilihan, bidang profil, dan modul bisa diubah dari aplikasi tanpa ubah kode
- [ ] Domain tidak tertulis di kode, hanya lewat `url_aplikasi` dan konfigurasi Caddy/tunnel
- [ ] Halaman Progres Pengembangan terisi otomatis dari hasil uji, tanpa edit manual, dan fitur tanpa uji tidak dihitung berfungsi
- [ ] Route progres menolak permintaan tanpa tanda tangan sah; pesan error mentah dan hasil uji sensitif tidak terlihat anggota
- [ ] Runner uji tidak menyentuh data produksi dan tidak melewati batas memori
- [ ] Tombol Keluar selalu terlihat, membersihkan token dan cache lokal, dan Keluar dari semua perangkat membatalkan token lama
- [ ] Tema ojol terpasang, tanpa logo atau aset merek asli; semua teks UI ada di satu berkas terpusat
- [ ] Angka dan peringatan penting tetap jelas meski bahasanya santai

## 13. Keputusan Bawaan dan Hal yang Tetap Harus Ditanyakan

Bagian ini menggantikan daftar pertanyaan terbuka. Nilai di bawah adalah **bawaan yang masuk akal**, dimasukkan ke `konfigurasi` saat pemasangan. Semuanya bisa diubah lewat halaman Pengaturan oleh pihak yang berwenang, jadi AI dev **tidak perlu menanyakannya** dan cukup memakai nilai bawaan ini.

### A. Parameter bawaan

| Kunci konfigurasi | Nilai bawaan | Yang berwenang mengubah |
|---|---|---|
| `masa_jabatan_pengurus_bulan` | 12 | pengurus |
| `masa_jabatan_dewan_etik_bulan` | 24 | dewan_etik |
| `iuran_periode` | bulanan | pengurus |
| `iuran_jatuh_tempo_tgl` | 10 | pengurus |
| `iuran_denda` | tidak ada | pengurus |
| `kontak_terlihat_default` | tersembunyi (anggota yang memilih membagikan) | admin |
| `nilai_lulus_default` | 70 (persen) | dewan_etik |
| `siklus_penyaringan_bulan` | 3 (triwulan) | dewan_etik |
| `maks_ulang_per_siklus` | 3 kali | dewan_etik |
| `jeda_ulang_jam` | 24 | dewan_etik |
| `batas_waktu_uji_menit` | 20 | dewan_etik |
| `tindak_lanjut_belum_lulus` | bertahap: pengingat, belajar panduan terkait, sesi pembinaan Dewan Etik, baru keputusan manusia | dewan_etik |
| `penerbit_panduan` | pengurus dan Dewan Etik (panduan kategori etika atau sanksi hanya Dewan Etik) | pengurus |
| `moderator_forum` | pengurus, admin, dan tim satgas | pengurus |
| `anggota_boleh_usul_event` | ya (status `usulan`, disetujui pengurus) | pengurus |
| `ambang_persetujuan_pengeluaran_event` | Rp 500.000 per transaksi, atau jika melebihi sisa anggaran pos | pengurus |
| `minimal_foto_dokumentasi_event` | 5 foto | pengurus |
| `mode_pengesahan_aturan` | `unit` untuk perubahan biasa, `unit_dan_anggota` untuk perubahan besar | dewan_etik |
| `kuorum_polling_perubahan_besar` | lebih dari 50 persen anggota aktif memilih | dewan_etik |
| `ambang_setuju_perubahan_besar` | dua pertiga suara | dewan_etik |
| `batas_keberatan_hari` | 7 | dewan_etik |
| `masa_percobaan_anggota_hari` | 0 (tidak ada) | pengurus |
| `mode_pendaftaran` | `terbuka_dengan_persetujuan` | admin |
| `pendaftaran_dibuka` | ya | admin |
| `penyetuju_pendaftaran` | izin `sahkan_pendaftaran` (admin) | admin |
| `masa_tunggu_daftar_ulang_hari` | 7 | admin |
| `bidang_wajib_profil` | nama dan WhatsApp | admin |
| `modul_aktif` | semua modul inti (kas, struktur, profil, aturan, pendaftaran) aktif; modul lain sesuai pilihan admin | admin |
| `url_aplikasi` | alamat sementara dari server | admin |
| `progres_terbuka_publik` | tidak (hanya user login) | admin |
| `progres_interval_uji_jam` | 6 | admin |
| `retensi_progres_rilis_hari` | 90 | admin |
| `sesi_durasi_hari` | mengikuti bawaan PocketBase | admin |
| `masa_tunggu_hapus_data_pribadi_hari` | 30 | admin |
| `retensi_log_aktivitas_hari` | 730 | admin |
| `batas_unggah_gambar_mb` | 2 | admin |
| `warna_utama` / `warna_aksen` | hijau `#1FA463` / kuning `#FFB020` (sengaja berbeda dari warna merek mana pun) | admin |
| `nama_hero` | "Bang Gas" | admin |
| `sapaan` | "bro" | admin |

### B. Urutan prioritas fitur pelengkap (6.6)

Pengumuman, pengaduan ke Dewan Etik, agenda/absensi/notulen, polling, dokumen, log aktivitas, profil anggota, ekspor dan cetak, pangkat dan badge (paling akhir).

### C. Isian awal yang bisa diisi dan diubah kapan saja (bukan syarat pemasangan)

Hal-hal berikut **tidak boleh menghambat** AI dev. Pasang dengan nilai sementara, lalu pemilik, admin, atau pengurus mengisi dan mengubahnya lewat aplikasi sesuai 6.13 A. Jangan berhenti untuk menanyakannya.

| Hal | Nilai sementara saat dipasang | Diubah lewat |
|---|---|---|
| Nama komunitas | "Komunitas Kita" | Pengaturan Komunitas |
| Logo | ikon bawaan (motor dan helm) | Pengaturan Komunitas |
| Nominal iuran | belum diatur (fitur iuran tampil "Belum diatur" dan tidak menagih) | Pengaturan Iuran |
| Pejabat dan struktur | kosong, hanya admin pertama | Halaman Struktur |
| Isi pasal aturan | template draf 8 bab (6.9 A), **belum berlaku** sampai disahkan | Halaman Aturan |
| Kuesioner pertama | contoh kuesioner **nonaktif** | Halaman Kuesioner |
| Domain | alamat sementara dari server | Konfigurasi Caddy, tunnel, dan `url_aplikasi` (lihat 6.13 E) |

Akun admin pertama dibuat AI dev bersama pemilik lewat skrip atau perintah di server (bukan lewat pendaftaran publik). Password awal diberikan lewat jalur aman dan wajib diganti saat login pertama. Tambahkan admin kedua secepatnya (aturan minimal dua admin).

### D. Yang tetap harus ditanyakan ke pemilik

AI dev **berhenti dan bertanya** hanya untuk hal berikut:

- Perubahan apa pun pada aturan server (bind Tailscale, port, firewall)
- Akses, kredensial, atau layanan eksternal baru (domain asli, akun Cloudflare, SMTP jika ingin email)
- Menambah komponen berat di luar stack (di atas batas 150MB RAM)
- Menghapus data atau mengubah skema yang sudah berisi data nyata
