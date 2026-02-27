const fs = require("fs");
const path = require("path");

const wordsPath = path.join(__dirname, "words.json");
let words = require("./words.json");

const usedFilePath = path.join(__dirname, "usedWords.json");

// ================= PREFIX INDEX =================
const MAX_PREFIX_LENGTH = 3;
const prefixMap = {
  1: {},
  2: {},
  3: {},
};

function buildPrefixMap() {
  for (let len = 1; len <= MAX_PREFIX_LENGTH; len++) {
    prefixMap[len] = {};
  }

  for (const word of words) {
    for (let len = 1; len <= MAX_PREFIX_LENGTH; len++) {
      if (word.length >= len) {
        const prefix = word.slice(0, len);

        if (!prefixMap[len][prefix]) {
          prefixMap[len][prefix] = [];
        }

        prefixMap[len][prefix].push(word);
      }
    }
  }
}

buildPrefixMap();

// ================= LOAD USED WORDS =================
let usedWords = new Set();

if (fs.existsSync(usedFilePath)) {
  const data = JSON.parse(fs.readFileSync(usedFilePath));
  usedWords = new Set(data);
}

// ================= DOM =================
const input = document.getElementById("prefix");
const best = document.getElementById("best");
const list = document.getElementById("list");
const clearBtn = document.getElementById("clearBtn");
const resetUsedBtn = document.getElementById("resetUsedBtn");
const toggleHideBtn = document.getElementById("toggleHideBtn");
const counter = document.getElementById("counter");

const newWordInput = document.getElementById("newWordInput");
const addWordBtn = document.getElementById("addWordBtn");
const addWordMsg = document.getElementById("addWordMsg");

let hideUsed = false;
let currentResults = [];

// ================= SEARCH =================
let debounceTimer;

input.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    performSearch();
  }, 80);
});

function performSearch() {
  const value = input.value.toLowerCase().trim();

  if (!value) {
    best.innerText = "";
    list.innerHTML = "";
    counter.innerText = "";
    return;
  }

  const inputLength = Math.min(value.length, MAX_PREFIX_LENGTH);
  const basePrefix = value.slice(0, inputLength);

  const baseList = prefixMap[inputLength][basePrefix] || [];

  const candidates = baseList.filter((w) => w.startsWith(value));

  const ranked = candidates.map((word) => {
    const prefixResults = {};
    let isAutoWin = false;
    let minOptions = Infinity;

    for (let len = 1; len <= MAX_PREFIX_LENGTH; len++) {
      if (word.length < len) continue;

      const nextPrefix = word.slice(-len);

      const nextOptions =
        prefixMap[len][nextPrefix]?.filter(
          (w) => w !== word && !usedWords.has(w),
        ).length || 0;

      prefixResults[len] = nextOptions;

      if (nextOptions === 0) {
        isAutoWin = true;
      }

      if (nextOptions < minOptions) {
        minOptions = nextOptions;
      }
    }

    return {
      word,
      prefixResults,
      autoWin: isAutoWin,
      minOptions,
    };
  });

 ranked.sort((a, b) => {
   if (a.autoWin && !b.autoWin) return -1;
   if (!a.autoWin && b.autoWin) return 1;
   return a.minOptions - b.minOptions;
 });
  const result = ranked.map((r) => r.word);

  const unused = result.filter((w) => !usedWords.has(w));
  const used = result.filter((w) => usedWords.has(w));

  let finalResult = hideUsed
    ? unused.slice(0, 5)
    : [...unused, ...used].slice(0, 5);

  currentResults = finalResult;

  if (ranked.length > 0) {
    const top = ranked[0];

    let message = "";

    if (top.autoWin) {
      message += `☠ AUTO WIN: ${top.word}<br>`;
    } else {
      message += `😈 ${top.word}\n`;
    }

    for (let len = MAX_PREFIX_LENGTH; len >= 1; len--) {
      if (top.prefixResults[len] !== undefined) {
        const count = top.prefixResults[len];
        let color = "#ffffff";

        if (count === 0) color = "#ff4444";
        else if (count <= 50) color = "#ffcc00";

        message += `<span style="color:${color}">
      prefix ${len} huruf → ${count} opsi
    </span><br>`;
      }
    }

    best.innerHTML = message.trim();
  } else {
    best.innerHTML = "❌ Tidak ditemukan";
  }

  updateCounter(result.length, unused.length);
  renderResults();
}

// ================= RENDER =================
function renderResults() {
  list.innerHTML = currentResults
    .map((word, index) => {
      const used = usedWords.has(word) ? "used" : "";
      return `
        <div class="item ${used}" data-word="${word}" 
             style="display:flex;justify-content:space-between;align-items:center;">
          <span>${index + 1}. ${word}</span>
          <button class="delete-btn" data-word="${word}" 
            style="background:none;border:none;color:#ff4444;cursor:pointer;">
            🗑
          </button>
        </div>
      `;
    })
    .join("");
}

// ================= LIST CLICK =================
list.addEventListener("click", (e) => {
  if (e.target.classList.contains("delete-btn")) {
    deleteWord(e.target.dataset.word);
    return;
  }

  const item = e.target.closest(".item");
  if (!item) return;

  toggleUsed(item.dataset.word);
});

// ================= TOGGLE USED =================
function toggleUsed(word) {
  if (usedWords.has(word)) {
    usedWords.delete(word);
  } else {
    usedWords.add(word);
  }

  saveUsedWords();
  performSearch();
}

// ================= DELETE WORD =================
function deleteWord(word) {
  const index = words.indexOf(word);
  if (index !== -1) words.splice(index, 1);

  usedWords.delete(word);

  for (let len = 1; len <= MAX_PREFIX_LENGTH; len++) {
    if (word.length >= len) {
      const prefix = word.slice(0, len);

      if (prefixMap[len][prefix]) {
        prefixMap[len][prefix] = prefixMap[len][prefix].filter(
          (w) => w !== word,
        );
      }
    }
  }

  fs.writeFileSync(wordsPath, JSON.stringify(words, null, 2));
  saveUsedWords();

  performSearch();
}

// ================= ADD WORD =================
addWordBtn.addEventListener("click", addNewWord);

newWordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addNewWord();
});

function addNewWord() {
  const newWord = newWordInput.value.toLowerCase().trim();
  addWordMsg.classList.remove("success", "error");

  if (!newWord) return showMsg("Kata tidak boleh kosong", "error");
  if (!/^[a-z]+$/.test(newWord))
    return showMsg("Hanya huruf a-z tanpa spasi", "error");
  if (words.includes(newWord)) return showMsg("Kata sudah tersedia", "error");

  words.push(newWord);

  for (let len = 1; len <= MAX_PREFIX_LENGTH; len++) {
    if (newWord.length >= len) {
      const prefix = newWord.slice(0, len);

      if (!prefixMap[len][prefix]) {
        prefixMap[len][prefix] = [];
      }

      prefixMap[len][prefix].push(newWord);
    }
  }

  fs.writeFileSync(wordsPath, JSON.stringify(words, null, 2));

  showMsg("Kata berhasil ditambahkan", "success");

  newWordInput.value = "";
  performSearch();
}

function showMsg(text, type) {
  addWordMsg.innerText = text;
  addWordMsg.classList.add(type);

  setTimeout(() => {
    addWordMsg.innerText = "";
    addWordMsg.classList.remove("success", "error");
  }, 2000);
}

// ================= COUNTER =================
function updateCounter(total, unusedCount) {
  if (total === 0) {
    counter.innerText = "";
    return;
  }

  const percentage = unusedCount / total;

  counter.classList.remove("counter-green", "counter-yellow", "counter-red");

  if (percentage > 0.6) {
    counter.classList.add("counter-green");
  } else if (percentage > 0.3) {
    counter.classList.add("counter-yellow");
  } else {
    counter.classList.add("counter-red");
  }

  counter.innerText = `Unused left: ${unusedCount} / ${total}`;
}

// ================= BUTTONS =================
toggleHideBtn.addEventListener("click", () => {
  hideUsed = !hideUsed;
  toggleHideBtn.innerText = hideUsed ? "Hide: ON" : "Hide: OFF";
  performSearch();
});

clearBtn.addEventListener("click", clearAll);

resetUsedBtn.addEventListener("click", () => {
  usedWords.clear();
  saveUsedWords();
  performSearch();
});

document.addEventListener("keydown", (e) => {
  if (["1", "2", "3", "4", "5"].includes(e.key)) {
    const index = parseInt(e.key) - 1;
    if (currentResults[index]) toggleUsed(currentResults[index]);
  }

  if (e.key === "Escape") clearAll();
});

function clearAll() {
  input.value = "";
  best.innerHTML = "";
  list.innerHTML = "";
  counter.innerText = "";
  input.focus();
}

function saveUsedWords() {
  fs.writeFileSync(usedFilePath, JSON.stringify([...usedWords], null, 2));
}

const { ipcRenderer } = require("electron");

document.getElementById("close-btn").addEventListener("click", () => {
  ipcRenderer.send("close-app");
});
