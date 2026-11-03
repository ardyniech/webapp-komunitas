#!/usr/bin/env python3
import json
import urllib.request

BASE_URL = "http://100.117.176.41:8095/api"

# 1. Login Admin
req = urllib.request.Request(
    f"{BASE_URL}/admins/auth-with-password",
    data=json.dumps({"identity": "admin@komunitas.local", "password": "AdminKomunitas2026!"}).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read().decode("utf-8"))["token"]

# 2. Section 13.A Default Configurations
DEFAULTS = [
    {"kunci": "masa_jabatan_pengurus_bulan", "nilai": 12, "wewenang": "pengurus", "deskripsi": "Masa jabatan pengurus dalam hitungan bulan"},
    {"kunci": "masa_jabatan_dewan_etik_bulan", "nilai": 24, "wewenang": "dewan_etik", "deskripsi": "Masa jabatan dewan etik dalam hitungan bulan"},
    {"kunci": "iuran_periode", "nilai": "bulanan", "wewenang": "pengurus", "deskripsi": "Periode penarikan iuran anggota"},
    {"kunci": "iuran_jatuh_tempo_tgl", "nilai": 10, "wewenang": "pengurus", "deskripsi": "Tanggal jatuh tempo iuran setiap bulan"},
    {"kunci": "iuran_denda", "nilai": "tidak ada", "wewenang": "pengurus", "deskripsi": "Kebijakan denda keterlambatan iuran"},
    {"kunci": "kontak_terlihat_default", "nilai": "tersembunyi", "wewenang": "admin", "deskripsi": "Visibilitas awal kontak anggota"},
    {"kunci": "nilai_lulus_default", "nilai": 70, "wewenang": "dewan_etik", "deskripsi": "Ambang nilai lulus kuesioner pengetahuan (persen)"},
    {"kunci": "siklus_penyaringan_bulan", "nilai": 3, "wewenang": "dewan_etik", "deskripsi": "Interval siklus penyaringan berkala (bulan)"},
    {"kunci": "maks_ulang_per_siklus", "nilai": 3, "wewenang": "dewan_etik", "deskripsi": "Batas pengulangan kuesioner per siklus"},
    {"kunci": "jeda_ulang_jam", "nilai": 24, "wewenang": "dewan_etik", "deskripsi": "Jeda waktu tunggu sebelum boleh mengulang tes"},
    {"kunci": "batas_waktu_uji_menit", "nilai": 20, "wewenang": "dewan_etik", "deskripsi": "Batas waktu pengerjaan tes kuesioner"},
    {"kunci": "tindak_lanjut_belum_lulus", "nilai": "bertahap", "wewenang": "dewan_etik", "deskripsi": "Alur penanganan anggota belum lulus tes"},
    {"kunci": "penerbit_panduan", "nilai": "pengurus_dan_dewan_etik", "wewenang": "pengurus", "deskripsi": "Pihak yang berwenang menerbitkan panduan"},
    {"kunci": "moderator_forum", "nilai": "pengurus_admin_satgas", "wewenang": "pengurus", "deskripsi": "Pihak yang memegang kendali moderasi forum"},
    {"kunci": "anggota_boleh_usul_event", "nilai": True, "wewenang": "pengurus", "deskripsi": "Izin bagi anggota biasa mengusulkan event"},
    {"kunci": "ambang_persetujuan_pengeluaran_event", "nilai": 500000, "wewenang": "pengurus", "deskripsi": "Ambang batas nominal pengeluaran event yang butuh approval"},
    {"kunci": "minimal_foto_dokumentasi_event", "nilai": 5, "wewenang": "pengurus", "deskripsi": "Jumlah minimal foto bukti dokumentasi penutupan event"},
    {"kunci": "mode_pengesahan_aturan", "nilai": "unit", "wewenang": "dewan_etik", "deskripsi": "Metode pengesahan perubahan aturan komunitas"},
    {"kunci": "kuorum_polling_perubahan_besar", "nilai": 50, "wewenang": "dewan_etik", "deskripsi": "Kuorum partisipasi polling perubahan besar (%)"},
    {"kunci": "ambang_setuju_perubahan_besar", "nilai": 66, "wewenang": "dewan_etik", "deskripsi": "Ambang suara setuju perubahan aturan besar (%)"},
    {"kunci": "batas_keberatan_hari", "nilai": 7, "wewenang": "dewan_etik", "deskripsi": "Batas waktu pengajuan hak keberatan sanksi etik"},
    {"kunci": "masa_percobaan_anggota_hari", "nilai": 0, "wewenang": "pengurus", "deskripsi": "Durasi masa percobaan bagi anggota baru"},
    {"kunci": "mode_pendaftaran", "nilai": "terbuka_dengan_persetujuan", "wewenang": "admin", "deskripsi": "Mode pendaftaran anggota baru"},
    {"kunci": "pendaftaran_dibuka", "nilai": True, "wewenang": "admin", "deskripsi": "Status buka/tutup pendaftaran komunitas"},
    {"kunci": "penyetuju_pendaftaran", "nilai": "admin", "wewenang": "admin", "deskripsi": "Pihak yang mengesahkan pendaftaran akun baru"},
    {"kunci": "masa_tunggu_daftar_ulang_hari", "nilai": 7, "wewenang": "admin", "deskripsi": "Masa tunggu pendaftar yang ditolak sebelum boleh daftar lagi"},
    {"kunci": "bidang_wajib_profil", "nilai": ["nama", "whatsapp"], "wewenang": "admin", "deskripsi": "Bidang profil yang wajib diisi"},
    {"kunci": "modul_aktif", "nilai": ["kas", "iuran", "struktur", "profil", "aturan", "pendaftaran", "forum", "panduan", "kuesioner", "event", "progres"], "wewenang": "admin", "deskripsi": "Daftar modul aplikasi yang aktif"},
    {"kunci": "url_aplikasi", "nilai": "https://ardyvaio.taild277bb.ts.net/drg", "wewenang": "admin", "deskripsi": "URL publik aplikasi web"},
    {"kunci": "progres_terbuka_publik", "nilai": False, "wewenang": "admin", "deskripsi": "Apakah halaman progres bisa dibaca tanpa login"},
    {"kunci": "progres_interval_uji_jam", "nilai": 6, "wewenang": "admin", "deskripsi": "Interval pengujian otomatis berkala"},
    {"kunci": "retensi_progres_rilis_hari", "nilai": 90, "wewenang": "admin", "deskripsi": "Lama simpan riwayat rilis uji"},
    {"kunci": "sesi_durasi_hari", "nilai": 14, "wewenang": "admin", "deskripsi": "Masa aktif login di perangkat"},
    {"kunci": "masa_tunggu_hapus_data_pribadi_hari", "nilai": 30, "wewenang": "admin", "deskripsi": "Masa tunggu penghapusan permanen data akun keluar"},
    {"kunci": "retensi_log_aktivitas_hari", "nilai": 730, "wewenang": "admin", "deskripsi": "Masa simpan log audit aktivitas (hari)"},
    {"kunci": "batas_unggah_gambar_mb", "nilai": 2, "wewenang": "admin", "deskripsi": "Batas ukuran file gambar upload klien"},
    {"kunci": "warna_utama", "nilai": "#1FA463", "wewenang": "admin", "deskripsi": "Warna tema hijau ojol pangkalan"},
    {"kunci": "warna_aksen", "nilai": "#FFB020", "wewenang": "admin", "deskripsi": "Warna tema kuning/oranye koin pangkalan"},
    {"kunci": "nama_hero", "nilai": "Bang Gas", "wewenang": "admin", "deskripsi": "Nama panggilan karakter pemandu driver ojol"},
    {"kunci": "sapaan", "nilai": "bro", "wewenang": "admin", "deskripsi": "Sapaan santai khas komunitas driver"}
]

# Check existing
req_list = urllib.request.Request(f"{BASE_URL}/collections/konfigurasi/records?perPage=200", headers={"Authorization": token})
try:
    with urllib.request.urlopen(req_list) as resp:
        existing = {item["kunci"]: item["id"] for item in json.loads(resp.read().decode("utf-8")).get("items", [])}
except Exception as e:
    print("Konfigurasi collection not ready yet:", e)
    exit(1)

count_created = 0
for d in DEFAULTS:
    k = d["kunci"]
    if k not in existing:
        req_create = urllib.request.Request(
            f"{BASE_URL}/collections/konfigurasi/records",
            data=json.dumps(d).encode("utf-8"),
            headers={"Content-Type": "application/json", "Authorization": token}
        )
        try:
            with urllib.request.urlopen(req_create) as resp:
                count_created += 1
        except Exception as e:
            print(f"Error creating config {k}:", e)

print(f"Seed konfigurasi completed. Created: {count_created}, Total keys: {len(DEFAULTS)}")
