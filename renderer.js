const fs = require("fs");
const path = require("path");
const { ipcRenderer } = require("electron");

const wordsPath = path.join(__dirname, "words.json");
const usedFilePath = path.join(__dirname, "usedWords.json");

let words = require("./words.json");

// ================= MINIMIZE =================
const collapseBtn = document.getElementById("collapse-btn");
let isCollapsed = false;
let originalHeight = window.innerHeight;

collapseBtn.addEventListener("click", () => {
  if (!isCollapsed) {
    // Simpan tinggi asli sebelum ciut
    originalHeight = window.outerHeight;
    // Ciutkan window (misal jadi tinggi 60px saja, sesuaikan dengan tinggi headermu)
    window.resizeTo(window.outerWidth, 10);
    collapseBtn.innerText = "+"; // Ganti icon jadi plus
    isCollapsed = true;
  } else {
    // Kembalikan ke tinggi semula
    window.resizeTo(window.outerWidth, originalHeight);
    collapseBtn.innerText = "-";
    isCollapsed = false;
  }
});

// ================= TARGET AKHIRAN (HEURISTIC) =================
const DEADLY_SUFFIXES = ["cy", "o", "ax", "x", "ah","ux", "ps", "ny", "is", "ur", "kh", "eh", "ih", "ai", "ia", "au", "sme", "if", "tif", "ks", "iat", "ed", "in", "ae", "al", "um", "an"];
DEADLY_SUFFIXES.sort((a, b) => {
  if (a.length !== b.length) return a.length - b.length;
  return a.localeCompare(b);
});

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
// Tambahkan elemen baru
const pagination = document.getElementById("pagination");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const pageInfo = document.getElementById("pageInfo");

const suffixFiltersDiv = document.getElementById("suffixFilters");
let currentActiveSuffix = "ALL"; // Menyimpan filter akhiran yang sedang dipilih

// State pagination
let currentPage = 1;
const ITEMS_PER_PAGE = 5; // Ubah jika ingin lebih dari 5 item per halaman
let allCurrentResults = []; // Menyimpan SEMUA hasil sebelum dipotong
const input = document.getElementById("prefix");
const best = document.getElementById("best");
const list = document.getElementById("list");
const counter = document.getElementById("counter");
const toggleHideBtn = document.getElementById("toggleHideBtn");
const toggleUsedOnlyBtn = document.getElementById("toggleUsedOnlyBtn");
const clearBtn = document.getElementById("clearBtn");
const resetUsedBtn = document.getElementById("resetUsedBtn");
const modeBtn = document.getElementById("modeBtn");

let hideUsed = false;
let showUsedOnly = false;
let currentResults = [];

// ================= MODE =================
// Ambil mode terakhir dari storage, kalau belum ada default ke "normal"
let currentMode = localStorage.getItem("savedMode") || "normal";

// JALANKAN INI SAAT STARTUP (Agar UI sesuai dengan mode yang tersimpan)
function initMode() {
  modeBtn.classList.remove("skakmat-mode");
  if (currentMode === "skakmat") {
    modeBtn.classList.add("skakmat-mode");
    modeBtn.innerText = "☠️ SKAKMAT";
  } else {
    modeBtn.innerText = "🟢 NORMAL";
  }
  performSearch();
}

// Panggil fungsinya
initMode();

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
    best.style.display = "none";
    list.innerHTML = "";
    counter.innerText = "";
    pagination.style.display = "none";
    suffixFiltersDiv.style.display = "none"; // (Jika ada)
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
      pagination.style.display = "none"; // Sembunyikan pagination
      return;
    }

    // ================= SKAKMAT MODE UI & FILTERING =================

    // 1. Terapkan Filter Hide/Only Used PERTAMA KALI ke seluruh hasil
    let baseFilteredResults = results;
    if (showUsedOnly) {
      baseFilteredResults = results.filter((r) => usedWords.has(r.word));
    } else if (hideUsed) {
      baseFilteredResults = results.filter((r) => !usedWords.has(r.word));
    }

    // 2. Update Teks Info (Angka total yang sudah difilter)
    const OP_Count = baseFilteredResults.length;
    best.innerText = `♟ MODE SKAKMAT (${OP_Count} kandidat mematikan)`;
    best.style.display = "block";

    // 3. Cek pengaman: Jika chip yang sedang aktif ternyata jumlahnya jadi 0
    // karena filter Hide/Used ditekan, kembalikan ke "ALL" otomatis agar list tidak kosong
    if (currentActiveSuffix !== "ALL") {
      const activeCount = baseFilteredResults.filter((r) =>
        r.word.endsWith(currentActiveSuffix),
      ).length;
      if (activeCount === 0) {
        currentActiveSuffix = "ALL";
      }
    }

    // 4. Tampilkan & Render tombol chips dengan data yang akurat
    suffixFiltersDiv.style.display = "flex";
    renderSuffixChips(baseFilteredResults);

    // 5. Filter terakhir berdasarkan Chip Suffix yang sedang aktif
    let finalResults = baseFilteredResults;
    if (currentActiveSuffix !== "ALL") {
      finalResults = baseFilteredResults.filter((r) =>
        r.word.endsWith(currentActiveSuffix),
      );
    }

    // 6. Siapkan data untuk ditampilkan di List (Pagination)
    allCurrentResults = finalResults.map((r) => r.word);
    currentPage = 1;
    updatePagination();
    return;
  }

  // ================= NORMAL  =================
  suffixFiltersDiv.style.display = "none"; // Sembunyikan chip saat mode normal
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

  // Simpan SEMUA hasil ke allCurrentResults
  // allCurrentResults = hideUsed ? unused : [...unused, ...used];
  // currentPage = 1;
  // ================= FILTER LOGIC =================
  if (showUsedOnly) {
    allCurrentResults = used; // Hanya tampilkan yang sudah terpakai
  } else if (hideUsed) {
    allCurrentResults = unused; // Hanya tampilkan yang belum terpakai
  } else {
    allCurrentResults = [...unused, ...used]; // Tampilkan semua
  }

  currentPage = 1;

  if (ranked.length > 0) {
    // ... (biarkan logika best message kamu tetap di sini) ...
    best.style.display = "block"; // TAMBAHKAN INI
  } else {
    best.innerText = "❌ Tidak ditemukan";
    best.style.display = "block"; // TAMBAHKAN INI
  }

  updateCounter(resultWords.length, unused.length);
  updatePagination(); // Ganti renderResults() dengan updatePagination()

  if (ranked.length > 0) {
    const top = ranked[0];
    let message = "";

    if (top.autoWin) {
      message += `☠ <b>AUTO WIN:</b> ${top.word} (?)<br>`;
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

// ================= SKAKMAT LOGIC =================
function autoSkakmat(prefixAwal, wordList) {
  // Ambil semua kata yang cocok dengan awalan (termasuk yang sudah dipakai)
  const candidates = wordList.filter((w) => w.startsWith(prefixAwal));

  const results = [];

  for (const word of candidates) {
    // 1. Cek apakah kata memiliki akhiran mematikan dari daftar kita
    const hasDeadlySuffix = DEADLY_SUFFIXES.some((suf) => word.endsWith(suf));

    // FILTER UTAMA: Jika tidak punya akhiran mematikan, lewati kata ini!
    if (!hasDeadlySuffix) continue;

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

    results.push({
      word,
      suffix: bestSuffix,
      nextCount: minCount,
      hasDeadlySuffix,
    });
  }

  // 2. Sorting / Pengurutan Kata (Kini semua kata di list adalah Deadly Suffix)
  results.sort((a, b) => {
    // Cek status apakah kata sudah dipakai atau belum
    const aUsed = usedWords.has(a.word);
    const bUsed = usedWords.has(b.word);

    // PRIORITAS 1: Utamakan kata yang BELUM terpakai ditaruh di atas!
    if (!aUsed && bUsed) return -1;
    if (aUsed && !bUsed) return 1;

    // PRIORITAS 2: Kata yang opsi lanjutannya 0 (Auto Win)
    if (a.nextCount === 0 && b.nextCount !== 0) return -1;
    if (a.nextCount !== 0 && b.nextCount === 0) return 1;

    // PRIORITAS 3: Sisanya urutkan berdasarkan opsi lanjutan musuh paling sedikit
    return a.nextCount - b.nextCount;
  });

  return results;
}
// ================= PAGINATION LOGIC =================
function updatePagination() {
  if (allCurrentResults.length === 0) {
    pagination.style.display = "none";
    currentResults = [];
    renderResults();
    return;
  }

  pagination.style.display = "flex";
  const totalPages = Math.ceil(allCurrentResults.length / ITEMS_PER_PAGE);

  // Pastikan currentPage tidak melebihi batas
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  // Potong data berdasarkan halaman saat ini
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  currentResults = allCurrentResults.slice(start, end);

  // Update Teks & Tombol
  pageInfo.innerText = `Hal ${currentPage} / ${totalPages}`;
  // prevBtn.disabled = currentPage === 1;
  // nextBtn.disabled = currentPage === totalPages;
  prevBtn.disabled = false;
  nextBtn.disabled = false;

  renderResults();
}

// ================= PAGINATION BUTTONS =================
prevBtn.addEventListener("click", () => {
  const totalPages = Math.ceil(allCurrentResults.length / ITEMS_PER_PAGE);
  if (totalPages === 0) return; // Mencegah error jika tidak ada data

  if (currentPage === 1) {
    currentPage = totalPages; // Jika di halaman 1, lompat ke halaman terakhir
  } else {
    currentPage--;
  }
  
  updatePagination();
});

nextBtn.addEventListener("click", () => {
  const totalPages = Math.ceil(allCurrentResults.length / ITEMS_PER_PAGE);
  if (totalPages === 0) return;

  if (currentPage === totalPages) {
    currentPage = 1; // Jika di halaman terakhir, kembali ke halaman 1
  } else {
    currentPage++;
  }
  
  updatePagination();
});

// ================= SUFFIX CHIPS (SKAKMAT) =================
function renderSuffixChips(allSkakmatResults) {
  let html = `<button class="suffix-chip ${currentActiveSuffix === 'ALL' ? 'active' : ''}" data-suf="ALL">SEMUA (${allSkakmatResults.length})</button>`;

  DEADLY_SUFFIXES.forEach(suf => {
    // Hitung berapa kata yang berakhiran ini
    const count = allSkakmatResults.filter(r => r.word.endsWith(suf)).length;
    
    // Jika 0, tombol dibuat mati (disabled) agar rapi
    const isDisabled = count === 0 ? "disabled" : "";
    const isActive = currentActiveSuffix === suf ? "active" : "";

    html += `<button class="suffix-chip ${isActive}" data-suf="${suf}" ${isDisabled}>• ${suf.toUpperCase()} (${count})</button>`;
  });

  suffixFiltersDiv.innerHTML = html;
}

// Event listener saat chip diklik
suffixFiltersDiv.addEventListener("click", (e) => {
  if (e.target.classList.contains("suffix-chip") && !e.target.disabled) {
    currentActiveSuffix = e.target.dataset.suf;
    performSearch(); // Refresh pencarian
  }
});

// ================= RENDER =================
function renderResults() {
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  
  list.innerHTML = currentResults
    .map((word, index) => {
      const used = usedWords.has(word) ? "used" : "";
      
      // LOGIKA HIGHLIGHT AKHIRAN MEMATIKAN
      let displayWord = word;
      
      // Cari apakah kata ini berakhiran salah satu dari DEADLY_SUFFIXES
      const foundSuffix = DEADLY_SUFFIXES.find(suf => word.endsWith(suf));
      
      if (foundSuffix) {
        // Potong kata menjadi dua: bagian depan dan bagian akhiran
        const baseStr = word.slice(0, -foundSuffix.length);
        
        // Gabungkan kembali dengan tag <span> untuk memberi warna
        displayWord = `${baseStr}<span class="deadly-highlight">${foundSuffix}</span>`;
      }

      return `
        <div class="item ${used}" data-word="${word}" 
             style="display:flex;justify-content:space-between;align-items:center;">
          <span>${startIndex + index + 1}. ${displayWord}</span>
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

  // Jika kata sudah ada
  if (words.includes(newWord)) {
    newWordInput.value = ""; // <--- Tambahkan ini agar input langsung bersih
    newWordInput.focus(); // <--- Opsional: Pastikan kursor tetap aktif di sana
    return showMsg("Kata sudah tersedia", "error");
  }

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
// Tombol untuk menyembunyikan kata yang sudah dipakai (Unused Only)
toggleHideBtn.addEventListener("click", () => {
  hideUsed = !hideUsed;

  // Jika Hide nyala, pastikan Only Used mati
  if (hideUsed) {
    showUsedOnly = false;
    toggleUsedOnlyBtn.innerText = "♻️ Used: OFF";
  }

  // Teks dan emoji berubah secara dinamis
  toggleHideBtn.innerText = hideUsed ? "🙈 Hide: ON" : "👁️ Hide: OFF";
  performSearch();
});

// Tombol baru untuk HANYA menampilkan kata yang sudah dipakai
toggleUsedOnlyBtn.addEventListener("click", () => {
  showUsedOnly = !showUsedOnly;

  // Jika Only Used nyala, pastikan Hide mati
  if (showUsedOnly) {
    hideUsed = false;
    toggleHideBtn.innerText = "👁️ Hide: OFF";
  }

  // Teks dan emoji berubah secara dinamis
  toggleUsedOnlyBtn.innerText = showUsedOnly ? "🎯 Used: ON" : "♻️ Used: OFF";
  performSearch();
});

modeBtn.addEventListener("click", () => {
  const modes = ["normal", "skakmat"];
  const index = modes.indexOf(currentMode);
  currentMode = modes[(index + 1) % modes.length];

  // SIMPAN MODE KE LOCALSTORAGE
  localStorage.setItem("savedMode", currentMode);

  // Reset class styling
  modeBtn.classList.remove("skakmat-mode");

  // Update teks tombol & tambahkan styling khusus jika skakmat
  if (currentMode === "skakmat") {
    modeBtn.classList.add("skakmat-mode");
    modeBtn.innerText = "☠️ SKAKMAT";
  } else {
    modeBtn.innerText = "🟢 NORMAL";
  }

  performSearch(); // Refresh list otomatis saat mode diganti
});

clearBtn.addEventListener("click", () => {
  input.value = "";
  best.innerHTML = "";
  best.style.display = "none";
  list.innerHTML = "";
  counter.innerText = "";
  pagination.style.display = "none"; // Tambahkan ini
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
  best.style.display = "none";
  list.innerHTML = "";
  counter.innerText = "";
  pagination.style.display = "none";
  currentActiveSuffix = "ALL";
  suffixFiltersDiv.style.display = "none";
  input.focus();
}

function saveUsedWords() {
  fs.writeFileSync(usedFilePath, JSON.stringify([...usedWords], null, 2));
}

document.getElementById("close-btn").addEventListener("click", () => {
  ipcRenderer.send("close-app");
});
