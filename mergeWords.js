const fs = require("fs");

// load data
const oldWords = JSON.parse(fs.readFileSync("words.json", "utf-8"));
const newWords = JSON.parse(fs.readFileSync("datasetBaru.json", "utf-8"));
const usedWordsRaw = JSON.parse(fs.readFileSync("usedWords.json", "utf-8"));

// bersihkan usedWords juga
const usedWords = usedWordsRaw
  .map((w) => w.toLowerCase().trim())
  .filter((w) => /^[a-z]+$/.test(w));

const usedSet = new Set(usedWords);

// gabungkan
const combined = [...oldWords, ...newWords];

const cleaned = combined
  .map((w) => w.toLowerCase().trim())
  .filter((w) => /^[a-z]+$/.test(w));

const uniqueSet = new Set(cleaned);

// hapus yang sudah used
for (const used of usedSet) {
  uniqueSet.delete(used);
}

const finalWords = [...uniqueSet].sort();

// simpan
fs.writeFileSync("words.json", JSON.stringify(finalWords, null, 2));
fs.writeFileSync(
  "usedWords.json",
  JSON.stringify([...usedSet].sort(), null, 2),
);

console.log("Merge selesai.");
console.log("Kata lama:", oldWords.length);
console.log("Dataset baru:", newWords.length);
console.log("Total unik bersih:", uniqueSet.size);
console.log("Total kata aktif:", finalWords.length);
console.log("Used tetap:", usedSet.size);
