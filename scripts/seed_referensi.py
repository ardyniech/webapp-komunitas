#!/usr/bin/env python3
import json
import urllib.request

BASE_URL = "http://100.117.176.41:8095/api"

# Login Admin
req = urllib.request.Request(
    f"{BASE_URL}/admins/auth-with-password",
    data=json.dumps({"identity": "admin@komunitas.local", "password": "AdminKomunitas2026!"}).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read().decode("utf-8"))["token"]

REFERENSI_DATA = [
    # kas_kategori
    {"kelompok": "kas_kategori", "kode": "iuran", "label": "Iuran Bulanan", "urutan": 1, "aktif": True, "sistem": True},
    {"kelompok": "kas_kategori", "kode": "donasi", "label": "Donasi / Sumbangan", "urutan": 2, "aktif": True, "sistem": False},
    {"kelompok": "kas_kategori", "kode": "operasional", "label": "Operasional Basecamp", "urutan": 3, "aktif": True, "sistem": False},
    {"kelompok": "kas_kategori", "kode": "sosial", "label": "Sosial / Santunan Sakit", "urutan": 4, "aktif": True, "sistem": False},
    {"kelompok": "kas_kategori", "kode": "dana_event", "label": "Alokasi Dana Event", "urutan": 5, "aktif": True, "sistem": True},
    {"kelompok": "kas_kategori", "kode": "sisa_dana_event", "label": "Pengembalian Sisa Dana Event", "urutan": 6, "aktif": True, "sistem": True},
    {"kelompok": "kas_kategori", "kode": "lainnya", "label": "Lain-lain", "urutan": 7, "aktif": True, "sistem": False},

    # forum_kategori
    {"kelompok": "forum_kategori", "kode": "umum", "label": "Diskusi Umum", "urutan": 1, "aktif": True, "sistem": False},
    {"kelompok": "forum_kategori", "kode": "tanya_jawab", "label": "Tanya Jawab Ojol", "urutan": 2, "aktif": True, "sistem": False},
    {"kelompok": "forum_kategori", "kode": "saran", "label": "Saran Basecamp", "urutan": 3, "aktif": True, "sistem": False},
    {"kelompok": "forum_kategori", "kode": "info_orderan", "label": "Info Orderan & Spot", "urutan": 4, "aktif": True, "sistem": False},
    {"kelompok": "forum_kategori", "kode": "curhat", "label": "Curhat Santuy", "urutan": 5, "aktif": True, "sistem": False},

    # event_jenis
    {"kelompok": "event_jenis", "kode": "kopdar", "label": "Kopdar Rutin", "urutan": 1, "aktif": True, "sistem": False},
    {"kelompok": "event_jenis", "kode": "bakti_sosial", "label": "Bakti Sosial", "urutan": 2, "aktif": True, "sistem": False},
    {"kelompok": "event_jenis", "kode": "rapat_akbar", "label": "Rapat Akbar Komunitas", "urutan": 3, "aktif": True, "sistem": False},
    {"kelompok": "event_jenis", "kode": "pelatihan", "label": "Pelatihan Safety Riding", "urutan": 4, "aktif": True, "sistem": False},
    {"kelompok": "event_jenis", "kode": "olahraga", "label": "Futsal / Olahraga Bersama", "urutan": 5, "aktif": True, "sistem": False},
    {"kelompok": "event_jenis", "kode": "syukuran", "label": "Syukuran Basecamp", "urutan": 6, "aktif": True, "sistem": False}
]

# Check existing
req_list = urllib.request.Request(f"{BASE_URL}/collections/referensi/records?perPage=200", headers={"Authorization": token})
try:
    with urllib.request.urlopen(req_list) as resp:
        existing = {f"{item['kelompok']}:{item['kode']}": item["id"] for item in json.loads(resp.read().decode("utf-8")).get("items", [])}
except Exception as e:
    print("Referensi collection not ready yet:", e)
    exit(1)

count_created = 0
for r in REFERENSI_DATA:
    key = f"{r['kelompok']}:{r['kode']}"
    if key not in existing:
        req_create = urllib.request.Request(
            f"{BASE_URL}/collections/referensi/records",
            data=json.dumps(r).encode("utf-8"),
            headers={"Content-Type": "application/json", "Authorization": token}
        )
        try:
            with urllib.request.urlopen(req_create) as resp:
                count_created += 1
        except Exception as e:
            print(f"Error creating referensi {key}:", e)

print(f"Seed referensi completed. Created: {count_created}, Total items: {len(REFERENSI_DATA)}")
