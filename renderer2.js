const fs = require("fs");
const path = require("path");
const { ipcRenderer } = require("electron");

const wordsPath = path.join(__dirname, "words2.json");
const usedFilePath = path.join(__dirname, "usedWords2.json");

let words = require("./words2.json");

// ================= MODE =================
let currentMode = "normal"; // "normal" | "skakmat"

// ================= PREFIX INDEX =================
const MAX_PREFIX_LENGTH = 3;
const prefixMap = { 1: {}, 2: {}, 3: {} };

function buildPrefixMap() {
  for (let len = 1; len <= MAX_PREFIX_LENGTH; len++) {
    prefixMap[len] = {};
  }

  for (const word of words) {
    for (let len = 1; len <= MAX_PREFIX_LENGTH; len++) {
      if (word.length >= len) {
        const prefix = word.slice(0, len);
        if (!prefixMap[len][prefix]) prefixMap[len][prefix] = [];
        prefixMap[len][prefix].push(word);
      }
    }
  }
}

buildPrefixMap();

// ================= USED WORDS =================
let usedWords = new Set();

if (fs.existsSync(usedFilePath)) {
  usedWords = new Set(JSON.parse(fs.readFileSync(usedFilePath)));
}

// ================= DOM =================
const input = document.getElementById("prefix");
const best = document.getElementById("best");
const list = document.getElementById("list");
const counter = document.getElementById("counter");
const toggleHideBtn = document.getElementById("toggleHideBtn");
const clearBtn = document.getElementById("clearBtn");
const resetUsedBtn = document.getElementById("resetUsedBtn");
const modeBtn = document.getElementById("modeBtn");
const modeIndicator = document.getElementById("modeIndicator");

let hideUsed = false;
let currentResults = [];

// ================= SEARCH =================
let debounceTimer;

input.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(performSearch, 80);
});

function performSearch() {
  const value = input.value.toLowerCase().trim();

  if (!value) {
    best.innerHTML = "";
    list.innerHTML = "";
    counter.innerText = "";
    return;
  }

  const inputLength = Math.min(value.length, MAX_PREFIX_LENGTH);
  const basePrefix = value.slice(0, inputLength);
  const baseList = prefixMap[inputLength][basePrefix] || [];

  // ================= SKAKMAT MODE =================
  if (currentMode === "skakmat") {
    const results = autoSkakmat(value, words);

    if (!results.length) {
      best.innerText = "❌ Tidak ada skakmat tersedia";
      list.innerHTML = "";
      return;
    }

    best.innerText = `♟ MODE SKAKMAT (${results.length} kandidat mematikan)`;

    currentResults = results.map((r) => r.word);
    renderResults();
    return;
  }

  // ================= NORMAL  =================
  const candidates = baseList.filter((w) => w.startsWith(value));

  const ranked = candidates.map((word) => {
    const prefixResults = {};
    let autoWin = false;
    let minOptions = Infinity;

    for (let len = 1; len <= MAX_PREFIX_LENGTH; len++) {
      if (word.length < len) continue;

      const suf = word.slice(-len);

      const nextOptions =
        prefixMap[len][suf]?.filter((w) => w !== word && !usedWords.has(w))
          .length || 0;

      prefixResults[len] = nextOptions;

      if (nextOptions === 0) autoWin = true;
      if (nextOptions < minOptions) minOptions = nextOptions;
    }

    return {
      word,
      prefixResults,
      autoWin,
      minOptions,
    };
  });

 ranked.sort((a, b) => {
   if (a.autoWin && !b.autoWin) return -1;
   if (!a.autoWin && b.autoWin) return 1;
   return a.minOptions - b.minOptions;
 });

  const resultWords = ranked.map((r) => r.word);
  const unused = resultWords.filter((w) => !usedWords.has(w));
  const used = resultWords.filter((w) => usedWords.has(w));

  currentResults = hideUsed
    ? unused.slice(0, 5)
    : [...unused, ...used].slice(0, 5);

  if (ranked.length > 0) {
    const top = ranked[0];
    let message = "";

    if (top.autoWin) {
      message += `☠ <b>AUTO WIN:</b> ${top.word}<br>`;
    } else {
      message += `😈 <b>${top.word}</b><br>`;
    }

    for (let len = 3; len >= 1; len--) {
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

    best.innerHTML = message;
  } else {
    best.innerText = "❌ Tidak ditemukan";
  }

  updateCounter(resultWords.length, unused.length);
  renderResults();
}

// ================= SKAKMAT LOGIC =================
function getSuffixes(word) {
  const s = [];
  for (let i = MAX_PREFIX_LENGTH; i >= 1; i--) {
    if (word.length >= i) s.push(word.slice(-i));
  }
  return s;
}

function countNextOptions(prefix, currentWord) {
  const len = prefix.length;

  const list = prefixMap[len][prefix] || [];

  return list.filter((w) => w !== currentWord && !usedWords.has(w)).length;
}

function autoSkakmat(prefixAwal, wordList) {
  const candidates = wordList.filter(
    (w) => w.startsWith(prefixAwal) && !usedWords.has(w),
  );

  const results = [];

  for (const word of candidates) {
    const suffixes = getSuffixes(word);

    let bestSuffix = null;
    let minCount = Infinity;

    for (const suf of suffixes) {
      const nextCount = countNextOptions(suf, word);

      if (nextCount < minCount) {
        minCount = nextCount;
        bestSuffix = suf;
      }

      if (nextCount === 0) break;
    }

    if (bestSuffix) {
      results.push({
        word,
        suffix: bestSuffix,
        nextCount: minCount,
      });
    }
  }

  results.sort((a, b) => {
    if (a.nextCount === 0 && b.nextCount !== 0) return -1;
    if (a.nextCount !== 0 && b.nextCount === 0) return 1;
    return a.nextCount - b.nextCount;
  });

  return results.slice(0, 5);
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

// ================= COUNTER =================
function updateCounter(total, unusedCount) {
  if (total === 0) {
    counter.innerText = "";
    counter.className = "";
    return;
  }

  const ratio = unusedCount / total;

  counter.innerText = `Unused left: ${unusedCount} / ${total}`;

  counter.classList.remove("counter-green", "counter-yellow", "counter-red");

  if (ratio > 0.6) {
    counter.classList.add("counter-green");
  } else if (ratio > 0.3) {
    counter.classList.add("counter-yellow");
  } else {
    counter.classList.add("counter-red");
  }
}

// ================= BUTTONS =================
toggleHideBtn.addEventListener("click", () => {
  hideUsed = !hideUsed;
  toggleHideBtn.innerText = hideUsed ? "Hide: ON" : "Hide: OFF";
  performSearch();
});

modeBtn.addEventListener("click", () => {
  const modes = ["normal", "skakmat"];
  const index = modes.indexOf(currentMode);
  currentMode = modes[(index + 1) % modes.length];

  modeBtn.classList.remove("skakmat-mode");
  modeIndicator.classList.remove(
    "normal-indicator",
    "skakmat-indicator",
  );

  if (currentMode === "skakmat") {
    modeBtn.classList.add("skakmat-mode");
    modeIndicator.classList.add("skakmat-indicator");
    modeIndicator.innerText = "♟ SKAKMAT MODE";
  }  else {
    modeIndicator.classList.add("normal-indicator");
    modeIndicator.innerText = "🟢 NORMAL MODE";
  }

  modeBtn.innerText = `Mode: ${currentMode.toUpperCase()}`;
  performSearch();
});

clearBtn.addEventListener("click", () => {
  input.value = "";
  best.innerHTML = "";
  list.innerHTML = "";
  counter.innerText = "";
  input.focus();
});

resetUsedBtn.addEventListener("click", () => {
  usedWords.clear();
  saveUsedWords();
  performSearch();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") clearAll();
});

function clearAll() {
  counter.className = "";
  input.value = "";
  best.innerHTML = "";
  list.innerHTML = "";
  counter.innerText = "";
  input.focus();
}

function saveUsedWords() {
  fs.writeFileSync(usedFilePath, JSON.stringify([...usedWords], null, 2));
}

document.getElementById("close-btn").addEventListener("click", () => {
  ipcRenderer.send("close-app");
});
