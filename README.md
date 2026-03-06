# 🔥 Helper Sambung Kata Roblox 🔥

Aplikasi desktop ringan berbasis Electron yang dirancang khusus untuk membantu memenangkan game [Sambung Kata](https://www.roblox.com/id/games/130342654546662/) di **Roblox** dengan strategi mematikan.

## 🚀 Fitur Unggulan

- 🔎 **Pencarian Cepat & Ringan:** Menggunakan teknik *debouncing* (300ms) sehingga aplikasi tetap anti-lag meski mengolah lebih dari 30.000 kata.
- ☠️ **Mode Skakmat (Auto-Win):** Algoritma *auto-pilot* yang otomatis menyaring dan memprioritaskan kata dengan akhiran mematikan (*Deadly Suffixes*) untuk mengunci pergerakan lawan.
- 🎯 **Target Akhiran Manual:** Pada Mode Normal, kamu bisa memasukkan target akhiran huruf spesifik untuk menjebak lawan secara manual.
- 😈 **Sistem Ranking Cerdas:** Mengurutkan kata berdasarkan jumlah opsi balasan lawan. Semakin sedikit opsi lawan (mendekati 0), semakin tinggi posisi kata tersebut.
- 🧠 **Pelacakan Kata Otomatis:** Otomatis mendata kata yang sudah dipakai. Tersedia tombol *Hide Used* dan *Used Only* untuk manajemen daftar kata.
- ➕ **Manajemen Kata Kustom:** Tambah atau hapus kata langsung dari dalam aplikasi.
- 🪟 **UI Elegan & Fungsional:** Jendela transparan efek kaca (blur), *always-on-top*, *frameless*, lengkap dengan tuas *resize* kustom yang nyaman ditarik di pojok layar.
- 🚀 **Dual Engine Support:** Mendukung pergantian *database* kata secara instan hanya dengan satu tombol.

---

## 🛠 Dibangun Menggunakan

- [Electron](https://electronjs.org/)
- [Node.js](https://nodejs.org/)
- Vanilla JavaScript, HTML5, & CSS3 (Tanpa framework tambahan)

---

## 📦 Instalasi & Cara Penggunaan

Clone repository ini ke komputer kamu:

```bash
git clone https://github.com/bagushermawan/helper-sambung-kata-roblox.git
cd helper-sambung-kata-roblox
npm install
npm start
```

---

## 📂 Struktur Project

```
main.js      → Proses utama Electron (Pengaturan Window, IPC, State)
renderer.js  → Logika inti aplikasi (Pencarian, Algoritma Skakmat, DOM UI)
index.html   → Tata letak UI & Styling CSS
words.json   → Database utama daftar kata (Engine 1)
words2.json  → Database alternatif daftar kata (Engine 2)
```

---

## 🧠 Logika Strategi (Cara Kerja Mesin)

- **Mode Normal:** Mengalkulasi sisa opsi lawan. Kata dengan kemungkinan balasan 0 akan diberi label **AUTO WIN**.
- **Mode Skakmat:** Mesin akan memfilter ratusan kata dalam sepersekian detik dan HANYA menampilkan kata-kata yang berakhiran sulit (contoh: cy, o, ax, x, ah, ps, dll). Diurutkan dari yang belum pernah dipakai hingga yang mematikan.

---

## 📝 Catatan Penting

- Folder `node_modules` tidak disertakan dalam repository ini (otomatis terbuat saat `npm install`).
- File `usedWords.json` (penyimpan riwayat kata yang sudah dipakai) bersifat lokal dan tidak akan di-commit ke GitHub.
- Aplikasi dirancang scalable dan sudah diuji berjalan mulus dengan ~30.000 entri kata.

---

## 📄 License

MIT License
