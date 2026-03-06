const fs = require("fs");

// Ganti nama file sesuai kebutuhan
const file1 = JSON.parse(fs.readFileSync("words.json", "utf-8"));
const file2 = JSON.parse(fs.readFileSync("words2.json", "utf-8"));

// Gabungkan + ubah ke lowercase + trim spasi
const combined = [...file1, ...file2].map((word) => word.toLowerCase().trim());

// Hapus duplikasi
const unique = [...new Set(combined)];

// Optional: urutkan alfabet
unique.sort();

// Simpan hasil
fs.writeFileSync("merged.json", JSON.stringify(unique, null, 2));

console.log("Merge selesai. Semua huruf jadi lowercase dan tanpa duplikasi 🚀");
