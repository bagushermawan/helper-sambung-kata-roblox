const fs = require("fs");
const readline = require("readline");

// load words
const words = JSON.parse(fs.readFileSync("./words.json", "utf-8"));

// setup CLI
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("-- Sambung Kata Bot Siap! --");
console.log("-- Total kata tersedia:", words.length, "--");
console.log("Ketik potongan huruf, lalu enter.");
console.log("Ketik 'exit' untuk keluar.\n");

rl.on("line", (input) => {
  const prefix = input.trim().toLowerCase();

  if (prefix === "exit") {
    console.log("Bye ??");
    process.exit(0);
  }

  const result = words.filter((word) => word.startsWith(prefix));

  if (result.length > 0) {
    console.log(`Ditemukan ${result.length} kata:\n`);
    result.forEach((word, index) => {
      result.sort((a, b) => a.length - b.length);
      console.log(`${index + 1}. ${word}`);
    });
  } else {
    console.log("❌ Tidak ditemukan kata untuk prefix itu.");
  }

  console.log("");
});
