const fs = require('fs');

// baca file txt
const raw = fs.readFileSync("counterxvalid.txt", "utf-8");

// pecah per baris
const lines = raw.split('\n');

// bersihkan nomor dan spasi
const words = lines
  .map(line => line.trim()) // hapus spasi depan belakang
  .filter(line => line.length > 0) // buang baris kosong
  .map(line => line.replace(/^\d+\.\s*/, '')); // hapus angka + titik + spasi

// convert ke JSON
const json = JSON.stringify(words, null, 2);

// simpan ke file json
fs.writeFileSync('all3.json', json);

console.log('Berhasil convert ke data.json ✨');