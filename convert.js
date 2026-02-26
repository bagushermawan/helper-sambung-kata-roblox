const fs = require("fs");

const text = fs.readFileSync("kata.txt", "utf-8");

const words = text
  .split("\n")
  .map((w) => w.trim().toLowerCase())
  .filter(
    (w) =>
      w.length > 1 && // buang 1 huruf
      /^[a-z]+$/.test(w), // hanya huruf a-z
  );

const uniqueWords = [...new Set(words)];

fs.writeFileSync("words.json", JSON.stringify(uniqueWords, null, 2));

console.log("Total kata bersih:", uniqueWords.length);
console.log("words.json berhasil dibuat ✅");
