# Webapp Komunitas — Basecamp Ojol (Kas Transparan & Komunitas)

Aplikasi komunitas driver ojol: kas transparan, iuran bulanan, profil anggota,
pendaftaran calon anggota baru, forum/panduan, event, progres pengembangan
otomatis, dan **Bug Hunter** (pemindai bug + penalti progres).

> **Dokumen ini adalah gambaran implementasi** dari `PLAN.md` dan realita
> pengembangan. Jika README dan PLAN.md berbeda, README yang menang —
> di sini dicatat ide dan penyimpangan yang muncul selama dev (lihat §4).

## 1. Cara akses & status

| Akses | URL |
|---|---|
| IP langsung (di tailnet/LAN) | `http://100.117.176.41:8095/` |
| Domain Tailscale | `https://ardyvaio.taild277bb.ts.net/drg/` |
| Admin UI (langsung, bukan via domain) | `http://100.117.176.41:8095/_/` |

| Layanan | Perintah |
|---|---|
| PocketBase | `systemctl status webapp-komunitas-pocketbase.service` |
| Scanner otomatis | `systemctl --user status scan-bugs.timer` (tiap 15 mnt) |
| Progres (live) | tab **Progres** di aplikasi |
| Bug (live) | tab **Bug Hunter** di aplikasi |

## 2. Arsitektur (ringkas)

```
Browser (PWA, pb_public/)
   │  fetch /api/* , /collections/* , file statis
   ▼
PocketBase serve  (satu proses, systemd: webapp-komunitas-pocketbase.service)
   ├── pb_data/            SQLite (data.db) — JANGAN edit manual
   ├── pb_migrations/      skema & rules (ada rollback)
   ├── pb_hooks/           logika server (route + hook)
   │   └── lib/            helper bersama (CommonJS, require per-handler)
   ├── pb_public/          frontend statis (index.html + js/ + css)
   └── progres/            registry.json + jalankan-uji (runner uji)
scripts/                    tooling Node (scan-bugs.js, seed_*.py)
```

- **Frontend**: 1 `index.html` + modul JS atomik di `pb_public/js/` (target < 200 baris/file).
- **Backend**: PocketBase JSVM hooks/routes. Payload kecil, tanpa framework lain.
- **Progres**: `pb_hooks/progres.pb.js` menghitung dari `registry.json`,
  hasil uji `progres_uji`, dan auto-deteksi kondisi sistem.

## 3. Peta implementasi vs PLAN.md

| PLAN.md | Implementasi | File utama | Status (jujur) |
|---|---|---|---|
| §5/6.11 Profil anggota | Panel profil 5 sub-tab, privasi per-bidang, kompres foto klien | `js/profil*.js`, `profil_*.pb.js`, `lib/profil.js` | Matur (teruji) |
| §5/6.12 Pendaftaran | Route `/daftar`, cek-status, persetujuan admin | `auth_pendaftaran.pb.js`, `js/pendaftaran.js` | Matur |
| §5.8/6.13 C Bidang kustom | `bidang_profil` + sanitasi `kustom`/`visibilitas` | `profil_validasi.pb.js`, `lib/profil.js` | Matur |
| §5.9/6.11 Direkori anggota | `profil_publik` (anggota baca direktori; manajemen baca `users`) | `profil_publik.pb.js`, `js/anggota*.js` | Matur |
| §6.14 Progres otomatis | API progres jujur + auto-deteksi benih/anak/matur | `progres.pb.js`, `progres.js`, `registry.json` | Matur |
| §6.14 + bug | Penalti bug masuk nilai progres (lihat §4.3) | `lib/bug_progres.js`, `bug_penalties.pb.js`, `js/progres-bug.js` | Baru (benih → matur bertahap) |
| §6.15 Keluar semua perangkat | Route `POST /api/komunitas/logout-all` | `profil_validasi.pb.js` | Matur |
| §6.10 Hapus data pribadi | Route `POST /api/komunitas/permintaan-hapus-data` → `log_aktivitas` | `profil_validasi.pb.js` | Matur |
| Bug Hunter (tidak ada di PLAN, lihat §4.4) | Scanner + halaman + timer | `scripts/scan-bugs.js`, `js/scan-bugs.js`, `scan-bugs.timer` | Baru |

**Catatan kejujuran status:** persentase di tab Progres dihitung ulang tiap kali
API dipanggil (tidak diedit manual). **Benih** = belum ada uji · **Anak** =
ada uji, belum semua lulus · **Matur** = semua uji lulus.

## 4. Penyimpangan & ide yang muncul saat dev (wajar, di luar PLAN)

### 4.1 Hook PocketBase terisolasi → `pb_hooks/lib/` (pelajaran berharga)

PLAN menganggap `hook handler` seperti fungsi biasa. Kenyataannya di PocketBase
tiap handler di-serialize ke runtime **terisolasi** — konstanta/fungsi file-scope
tidak tersedia di dalam handler. Ini pernah memicu outage produksi
`ReferenceError: ppSinkronSemua is not defined` (service crash-loop ±13 jam).

Makanya ada `pb_hooks/lib/profil.js` (CommonJS). **Setiap handler WAJIB**:
```js
const lib = require(`${__hooks}/lib/profil.js`);
```
Lalu hanya memakai `lib.*` + global PocketBase (`$app`, `Record`, dsb.).

### 4.2 Progres jujur: auto-deteksi fitur baru (F9)

Koleksi DB / route hook baru yang belum ada di `registry.json` otomatis muncul
di **F9 Deteksi Otomatis** berstatus **benih** — tanpa edit manual registry.
Perbaiki (luluskan uji) untuk menaikkan tahapnya.

### 4.3 Bug masuk nilai progres (penalti proporsional, lantai 5%)

```
penalti = kritikal×3 + tinggi×2 + sedang×0.5 + low×0.1   (maks 50)
nilai_akhir = progres_fitur × max(5%, 1 − penalti/50)
```

Brutal tapi tidak pernah 0% selama UI bisa diakses (lantai 5%).
Banner di tab Progres menampilkan rinciannya. Scan terbaru:
1 kritikal · 8 tinggi · 25 sedang → penalti ±31.5 → progres ~5–6%.

### 4.4 Bug Hunter (fitur dev-tool baru)

- Scanner `scripts/scan-bugs.js` (Node, filesystem penuh) → `scan-report.json`
- Page khusus **Bug Hunter** (bottom nav + dropdown user)
- Timer user systemd `scan-bugs.timer` (tiap 15 mnt) agar laporan selalu segar
- `scan-report.json` ditulis juga ke `pb_public/drg/` agar bisa diakses via domain `/drg/`

### 4.5 Bug Hunter + Dev Tools (fitur dev-tool, atomik)

- Scanner `scripts/scan-bugs.js` → `scan-report.json`; timer user systemd
  `scan-bugs.service` kini menjalankan `scripts/dt-all.js` (semua snapshot
  devtools) tiap 15 menit.
- Halaman **Dev Tools** (bottom nav 🛠️): sub-tab Git / Diagnosa Bug /
  Monitor / Info & Flag. Data dari `pb_public/devtools-*.json`
  (juga disalin ke `pb_public/drg/` untuk domain `/drg/`).
  - `dt-git`: status kotor + commit per direktori (deteksi konflik antar-agen)
  - `dt-diagnose`: akar masalah + perintah verifikasi + langkah fix per bug
    (JSON untuk UI + MD `devtools-diagnose.md` untuk AI dev)
  - `dt-heartbeat`: uptime, RAM, socket UDP, disk, status PocketBase
  - `dt-drift`: perbandingan PLAN.md vs registry vs kode nyata
  - `dt-inventory`: route hook + koleksi DB + file JS
  - `dt-releases`: release notes otomatis dari git log
  - `dt-logs`: tail 60 baris journal PocketBase (token disamarkan)
  - Feature flag: toggle `konfigurasi.modul_aktif` langsung dari UI (admin)
- **Quality gate** `.githooks/pre-commit` (pasang: `git config core.hooksPath .githooks`):
  tolak commit bila syntax error di file staged atau bug kritikal > 0.
  Semua file baru atomik terpisah; `progres.pb.js` tidak disentuh.

### 4.6 Lainnya

- `svc logout-all`: client tidak lagi PATCH `tokenKey` langsung (dilarang
  validasi); diganti route hook.
- Foto profil dikompres di browser (maks 800px) sebelum upload — hemat kuota.
- `fetchUsers()` untuk anggota biasa dialihkan ke `profil_publik` agar data
  sensitif tidak bocor lewat API (PLAN §5.9).

### 4.7 Keterbatasan & SOP lanjutan

- **Scanner di dalam PocketBase (belum dikerjakan, by design):** runtime JSVM
  hook PocketBase tidak menyediakan `fs`/`child_process`, jadi scanner
  filesystem tetap berjalan sebagai skrip Node di host (timer systemd).
  Jalur memandu: `scan-report.json` bisa di-require hook (pola JSON), tapi
  menulis laporan tetap dari luar.
- **Uji restore backup bulanan:** `bash scripts/test-restore.sh` menyalin
  `pb_data` ke sandbox, menyalakan PocketBase, dan memeriksa health 200.
  Jalankan tiap bulan dan catat di changelog.
- **SOP upgrade PocketBase:** ganti binary → `systemctl restart` →
  verifikasi health + runner 32/32 + regresi pola isolasi hook
  (`grep -rn require pb_hooks/*.pb.js`). Terjadi crash-loop bila ada
  konstanta file-scope yang bocor ke handler (§4.1).

## 5. Cara menjalankan

```bash
# lihat status layanan
systemctl status webapp-komunitas-pocketbase.service
curl http://100.117.176.41:8095/api/health

# jalankan ulang uji (sandbox ephemeral, tidak menyentuh data produksi)
node progres/jalankan-uji

# jalankan pemindai bug secara manual
node scripts/scan-bugs.js
```

Semua JS/hook harus lolos `node --check` sebelum restart layanan.

## 6. SOP — AI Developer (wajib)

1. **Diagnosa dulu, ubah belakangan.** Pisahkan fakta (output command) dari
   hipotesis. Jangan tebak penyebab.
2. **Satu perubahan satu waktu**, lalu verifikasi: `node --check` → restart →
   `curl` health → curl route yang disentuh. Kalau gagal, rollback dulu
   (`git checkout -- <file>`), baru diagnosa lagi.
3. **Urutan file atomik.** Modul frontend `pb_public/js/*.js` tetap < 200 baris;
   fitur baru = file baru (mis. `progres-bug.js`), bukan disusup ke file lama.
   File yang sudah berstatus **KONFIRMASI** (lihat changelog `/home/ardy/docs/04-governance/changelog.md`)
   tidak boleh diotak-atik tanpa konfirmasi pemilik.
4. **Aturan isolasi hook (§4.1).** Setiap handler wajib `require` lib di baris
   pertama. Jangan memakai konstanta/fungsi file-scope di dalam handler.
5. **Aturan data:** jangan edit `pb_data/data.db` manual; skema hanya lewat
   migration baru + ada rollback. Perubahan rule begitu juga.
6. **Jangan sentuh perubahan uncommitted orang lain** (mis. `event*.js`,
   `kas.js`, `pelengkap.js`, `wizard-kas.js`, `data/`). Commit hanya file
   yang Anda ubah; pesan commit konvensional Bahasa Indonesia.
7. **Update changelog** yang sama di `/home/ardy/docs/04-governance/changelog.md`
   dengan blok `Tanggal — Agent / Goal / Changes / Verification / Rollback`.
8. **Aturan host berlaku** (L0–L3 di `/home/ardy/AGENTS.md`): jaringan, DNS,
   firewall, reboot, hapus data = tanya pemilik dulu. Jangan pernah print
   kata sandi/token di chat/log.
9. **Verifikasi akhir wajib:** service `active`, health 200, endpoint yang
   disentuh merespons benar, statistik socket sehat (`grep UDP: /proc/net/sockstat`).

## 7. SOP — Human Developer (opsional, ringkas)

1. Baca PLAN.md (§5 skema, §6 fitur) lalu README ini (§3–§4) sebelum coding.
2. Buat perubahan kecil; uji `node --check`; restart layanan;
   uji lewat browser (hard refresh `Ctrl+F5` bila tampilan belum berubah —
   Service Worker bisa men-cache HTML lama).
3. Jalankan `node progres/jalankan-uji` — target 32/32 LULUS.
4. Commit dengan pesan konvensional, update `registry.json` hanya bila fitur
   benar-benar baru (auto-deteksi F9 sudah menangani sisanya).
5. Jika menambah hook, ikuti pola `require('${__hooks}/lib/...')` (§4.1).

## 8. Ringkasan file penting

| File | Peran |
|---|---|
| `PLAN.md` | Rencana awal produk (skema, fitur, fase) |
| `README.md` | Dokumen ini: implementasi + deviasi + SOP |
| `progres/registry.json` | Katalog fase/fitur/uji untuk runner |
| `progres/jalankan-uji` | Runner uji otomatis (sandbox ephemeral) |
| `pb_hooks/lib/profil.js`, `lib/bug_progres.js` | Helper server bersama (atomik) |
| `pb_public/js/` | Modul frontend atomik |
| `scripts/scan-bugs.js` | Pemindai bug → `scan-report.json` |
| `/home/ardy/docs/04-governance/changelog.md` | Changelog bersama semua agen (L0–L3 host berlaku) |
