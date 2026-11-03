import sqlite3
import datetime

db_path = "/home/ardy/projects/webapp-komunitas/pb_data/data.db"
conn = sqlite3.connect(db_path)
cur = conn.cursor()

now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S.000Z")

# Get user IDs
cur.execute("SELECT id FROM users WHERE role='admin' LIMIT 1")
admin_row = cur.fetchone()
admin_id = admin_row[0] if admin_row else "usr_adm000000000"

cur.execute("SELECT id FROM users WHERE role='bendahara' LIMIT 1")
bendahara_row = cur.fetchone()
bendahara_id = bendahara_row[0] if bendahara_row else admin_id

cur.execute("SELECT id FROM users WHERE role='anggota' LIMIT 1")
anggota_row = cur.fetchone()
anggota_id = anggota_row[0] if anggota_row else admin_id

print("1. Seeding Unit & Jabatan...")
units = [
    ("unit_ph00000001", "Pengurus Harian", "pengurus_harian", "Mengelola operasional harian basecamp ojol, jadwal kopdar, dan keuangan rutin pangkalan.", "Koordinasi rutin, rapat berkala, penertiban pangkalan.", 1),
    ("unit_de00000002", "Dewan Etik Basecamp", "dewan_etik", "Menjaga martabat komunitas, menegakkan aturan pangkalan, serta memediasi perselisihan antar driver.", "Penerimaan pengaduan, sidang etik, rekomendasi pembinaan.", 2),
    ("unit_sg00000003", "Satgas Reaksi Cepat (SRC)", "satgas", "Siaga bantuan darurat di jalanan (kecelakaan, mogok, kendala keamanan) bagi seluruh anggota.", "Patroli aspal, penanganan insiden darurat, koordinasi medis.", 3),
    ("unit_ks00000004", "Seksi Sosial & Logistik", "lainnya", "Menyediakan sarana basecamp (kopi, charger, ban serep) dan penyaluran santunan sosial.", "Inventaris pangkalan, kas santunan sakit, pengadaan takjil/konsumsi.", 4),
]

for uid, nama, jenis, deskripsi, tugas, urutan in units:
    cur.execute("""
        INSERT OR REPLACE INTO unit (id, nama, jenis, deskripsi, tugas, urutan, created, updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (uid, nama, jenis, deskripsi, tugas, urutan, now, now))

jabatans = [
    ("jab_00000000001", "unit_ph00000001", admin_id, "Ketua Basecamp", "2026-01-01", "2026-12-31", 1),
    ("jab_00000000002", "unit_ph00000001", bendahara_id, "Bendahara Pangkalan", "2026-01-01", "2026-12-31", 1),
    ("jab_00000000003", "unit_de00000002", admin_id, "Ketua Dewan Etik", "2026-01-01", "2026-12-31", 1),
    ("jab_00000000004", "unit_sg00000003", anggota_id, "Komandan Lapangan Satgas", "2026-01-01", "2026-12-31", 1),
]

for jid, uid, aid, nama_jab, m, s, aktif in jabatans:
    cur.execute("""
        INSERT OR REPLACE INTO jabatan (id, unit, anggota, jabatan, periode_mulai, periode_selesai, aktif, created, updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (jid, uid, aid, nama_jab, m, s, aktif, now, now))

print("2. Seeding Aturan Komunitas...")
versi_id = "atrv_0000000001"
cur.execute("""
    INSERT OR REPLACE INTO aturan_versi (id, nomor, judul, status, disusun_oleh, mode_pengesahan, tanggal_efektif, ringkasan_perubahan, created, updated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""", (versi_id, "v1.0", "Aturan & Tata Tertib Pangkalan Basecamp Ojol Solid", "berlaku", admin_id, "pengurus_dan_dewan_etik", "2026-01-01", "Pengesahan perdana aturan pangkalan ojol oleh Dewan Etik dan Pengurus.", now, now))

pasals = [
    ("psl_00000000001", versi_id, "Bab 1: Keanggotaan & Solidaritas", "1", "Hak dan Kewajiban Anggota", "Setiap driver yang telah disahkan statusnya sebagai anggota berhak atas fasilitas basecamp dan transparansi penuh kas. Setiap anggota berkewajiban menjaga nama baik basecamp dan solidaritas satu aspal.", "kewajiban", 1),
    ("psl_00000000002", versi_id, "Bab 1: Keanggotaan & Solidaritas", "2", "Iuran Rutin Basecamp", "Setiap anggota wajib melunasi iuran pangkalan bulanan tepat waktu. Dana iuran digunakan sepenuhnya untuk kas operasional bersama, kontrakan basecamp, listrik, dan dana darurat.", "kewajiban", 2),
    ("psl_00000000003", versi_id, "Bab 2: Ketertiban & Keamanan Pangkalan", "3", "Larangan Miras & Narkoba", "Basecamp adalah rumah kedua yang aman bagi semua pejuang aspal. Dilarang keras membawa, menyimpan, atau mengonsumsi minuman keras, narkoba, dan barang terlarang lainnya di area basecamp.", "larangan", 3),
    ("psl_00000000004", versi_id, "Bab 2: Ketertiban & Keamanan Pangkalan", "4", "Satu Aspal Saling Tolong", "Bila ada rekan sesama anggota mengalami kendala teknis (ban bocor, mogok) atau insiden kecelakaan di jalan, anggota terdekat yang memantau informasi radio/grup wajib mengulurkan bantuan segera.", "kewajiban", 4),
]

for pid, vid, bab, nopas, judul, isi, kat, urut in pasals:
    cur.execute("""
        INSERT OR REPLACE INTO aturan_pasal (id, versi, bab, nomor, judul, isi, kategori, urutan, created, updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (pid, vid, bab, nopas, judul, isi, kat, urut, now, now))

print("3. Seeding Event Komunitas...")
event_id = "evnt_0000000001"
cur.execute("""
    INSERT OR REPLACE INTO event (id, judul, jenis, status, tujuan, deskripsi, tanggal_mulai, tanggal_selesai, lokasi, target_peserta, ketua_pelaksana, ditunjuk_oleh, disetujui_oleh, created, updated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""", (event_id, "Kopdar Akbar & Santunan Ramadan 2026", "kopdar", "persiapan", "Mempererat tali persaudaraan antar rekan satu aspal dan berbagi berkah kepada keluarga yang membutuhkan.", "Ajang silaturahmi seluruh driver basecamp, evaluasi operasional pangkalan, dan pembagian paket sembako untuk keluarga pejuang aspal.", "2026-11-20 16:00:00", "2026-11-20 20:30:00", "Taman Pangkalan Ojol Solid, Palmerah", 50, admin_id, admin_id, admin_id, now, now))

# Event panitia
cur.execute("""
    INSERT OR REPLACE INTO event_panitia (id, event, anggota, seksi, tugas, ditunjuk_oleh, aktif, created, updated)
    VALUES
      ('evp_00000000001', ?, ?, 'acara', 'Koordinator Acara & Doa', ?, 1, ?, ?),
      ('evp_00000000002', ?, ?, 'konsumsi', 'Koordinator Konsumsi & Takjil', ?, 1, ?, ?)
""", (event_id, admin_id, admin_id, now, now, event_id, bendahara_id, admin_id, now, now))

# Event anggaran
cur.execute("""
    INSERT OR REPLACE INTO event_anggaran (id, event, pos, uraian, volume, satuan, harga_satuan, total_rencana, created, updated)
    VALUES
      ('eva_00000000001', ?, 'Paket Santunan', 'Paket sembako + amplop anak yatim', 20, 'paket', 75000, 1500000, ?, ?),
      ('eva_00000000002', ?, 'Takjil & Konsumsi', 'Nasi kotak + es buah untuk kawan driver', 50, 'porsi', 14000, 700000, ?, ?),
      ('eva_00000000003', ?, 'Spanduk & Publikasi', 'Banner pangkalan 3x1 meter', 1, 'buah', 300000, 300000, ?, ?)
""", (event_id, now, now, event_id, now, now, event_id, now, now))

# Event sumber dana
cur.execute("""
    INSERT OR REPLACE INTO event_dana (id, event, nama_sumber, jenis, rencana_nominal, nominal_diterima, keterangan, created, updated)
    VALUES
      ('evd_00000000001', ?, 'Subsidi Kas Basecamp', 'kas_komunitas', 1000000, 1000000, 'Alokasi kas pangkalan yang disetujui pengurus', ?, ?),
      ('evd_00000000002', ?, 'Patungan Sukarela Driver', 'donasi_anggota', 1000000, 850000, 'Kotak donasi keliling di basecamp', ?, ?),
      ('evd_00000000003', ?, 'Sponsor Bengkel Mitra Aspal', 'sponsor', 500000, 500000, 'Bantuan tunai dari bengkel mitra pangkalan', ?, ?)
""", (event_id, now, now, event_id, now, now, event_id, now, now))

# Event transaksi contoh
cur.execute("""
    INSERT OR REPLACE INTO event_transaksi (id, event, pos_anggaran, sumber_dana, jenis, nominal, tanggal, keterangan, dicatat_oleh, verifikasi, created, updated)
    VALUES
      ('evt_00000000001', ?, 'eva_00000000003', 'evd_00000000001', 'keluar', 250000, '2026-11-03', 'Cetak spanduk pangkalan 3x1 meter di Percetakan Mandiri', ?, 'terverifikasi', ?, ?)
""", (event_id, admin_id, now, now))

conn.commit()
conn.close()
print("Seeding struktur, aturan, dan event selesai dengan sukses!")
