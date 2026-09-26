# 🎓 Telegram Bot Pengingat Jadwal Kuliah

Bot Telegram interaktif yang membantu mahasiswa mengelola jadwal perkuliahan harian dengan fitur pengingat otomatis (notifikasi pagi & alarm sebelum kelas dimulai), serta kemudahan menambah, mengubah, menghapus, dan melihat jadwal kuliah secara langsung via menu chat Telegram.

---

## ✨ Fitur Utama

- 📅 **Lihat Jadwal Harian**:
  - `Jadwal Hari Ini`: Menampilkan mata kuliah hari ini.
  - `Jadwal Besok`: Persiapan mata kuliah untuk besok.
  - `Semua Jadwal`: Rangkuman seluruh jadwal kuliah mingguan (Senin - Minggu).
- ➕ **Tambah Jadwal (Create)**:
  - Wizard interaktif (Pilih Hari -> Nama Matkul -> Jam Mulai & Selesai -> Ruangan -> Dosen).
- ✏️ **Edit Jadwal (Update)**:
  - Pilih jadwal yang ingin diubah langsung dari tombol interaktif.
  - Dapat mengubah nama matkul, hari, jam, ruangan, atau nama dosen secara fleksibel.
- ❌ **Hapus Jadwal (Delete)**:
  - Tombol hapus dengan konfirmasi aman agar jadwal tidak terhapus tidak sengaja.
- ⏰ **Pengingat Otomatis (Reminder Engine)**:
  - **Rangkuman Pagi Hari**: Dikirim otomatis setiap pagi (default pk 06:30 WIB) berisi ringkasan kuliah hari itu.
  - **Alarm Sebelum Kelas**: Dikirim otomatis 15-30 menit sebelum setiap sesi perkuliahan dimulai agar Anda tidak telat.
  - **Pengaturan Mandiri**: Pengguna dapat menyalakan/mematikan pengingat atau mengubah jam alarm langsung dari bot.

---

## 🚀 Cara Menjalankan Bot

### 1. Dapatkan Bot Token dari Telegram
1. Buka aplikasi Telegram dan cari akun **[@BotFather](https://t.me/BotFather)**.
2. Kirim perintah `/newbot`.
3. Ikuti instruksi untuk memberi nama dan username bot Anda (misal: `JadwalKuliahKuBot`).
4. Setelah selesai, @BotFather akan memberikan **HTTP API Token** (contoh: `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`).

### 2. Konfigurasi File `.env`
Buka file `.env` di folder proyek ini (`telegram-kuliah-bot/.env`) dan ganti `BOT_TOKEN` dengan token yang Anda dapatkan:
```env
BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
TIMEZONE=Asia/Jakarta
DATABASE_PATH=./data/schedule.db
```

### 3. Jalankan Pengujian (Testing)
Untuk memastikan database dan sistem berfungsi normal:
```powershell
npm test
```

### 4. Jalankan Bot
Jalankan perintah berikut di terminal:
```powershell
npm start
```
Saat bot berjalan, akan muncul teks:
```
🚀 Bot Telegram Jadwal Kuliah berhasil berjalan!
⏰ Reminder service started (checking every minute)...
```

---

## 📱 Cara Menggunakan Bot di Telegram

1. Buka bot yang telah Anda buat di Telegram.
2. Klik tombol **START** atau kirim `/start`.
3. Gunakan tombol keyboard yang tersedia di bagian bawah layar:
   - 📅 **Jadwal Hari Ini**
   - 📆 **Jadwal Besok**
   - 📋 **Semua Jadwal**
   - ➕ **Tambah Jadwal**
   - ✏️ **Edit Jadwal**
   - ❌ **Hapus Jadwal**
   - ⚙️ **Pengaturan Notifikasi**
4. Atau gunakan perintah teks:
   - `/hariini` - Jadwal kuliah hari ini
   - `/besok` - Jadwal kuliah besok
   - `/jadwal` - Rangkuman jadwal seminggu
   - `/tambah` - Tambah jadwal
   - `/edit` - Edit jadwal
   - `/hapus` - Hapus jadwal
   - `/pengaturan` - Atur alarm & notifikasi
   - `/batal` - Membatalkan proses input saat ini

---

## 🛠️ Struktur Proyek

```
telegram-kuliah-bot/
├── src/
│   ├── config.js              # Membaca token & env
│   ├── database.js            # SQLite database (node:sqlite)
│   ├── index.js               # Entry point bot Telegram
│   ├── handlers/
│   │   ├── createHandler.js   # Wizard tambah jadwal
│   │   ├── deleteHandler.js   # Konfirmasi & hapus jadwal
│   │   ├── editHandler.js     # Interaksi edit bagian jadwal
│   │   ├── keyboards.js       # Layout tombol reply & inline
│   │   ├── settingsHandler.js # Pengaturan pengingat & waktu
│   │   └── viewHandler.js     # Menampilkan jadwal harian & mingguan
│   ├── repositories/
│   │   └── scheduleRepo.js    # Query CRUD database SQLite
│   ├── services/
│   │   └── reminderService.js # Scheduler cron pengingat otomatis
│   └── utils/
│       ├── dateTime.js        # Utilitas waktu, hari, & kalkulasi menit
│       └── formatter.js       # Pemformatan pesan Telegram (HTML)
├── tests/
│   └── test_crud.js           # Smoke test otomatis CRUD & utilitas
├── .env                       # File konfigurasi (Token Telegram)
├── .env.example               # Contoh template file konfigurasi
└── package.json               # Dependensi & skrip npm
```
