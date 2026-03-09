const fs = require("fs");
const path = require("path");
const { ipcRenderer } = require("electron");
const { createClient } = require("@supabase/supabase-js");
const { machineIdSync } = require("node-machine-id");

const SUPABASE_URL = "https://lsnomevsllvjguotwchm.supabase.co";
const SUPABASE_KEY = "sb_publishable_1o9iZscYpzdpg7eEY3xwqQ_zvgsjdrX";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ================= UI LOGIN =================
const loginOverlay = document.getElementById("login-overlay");
const loginForm = document.getElementById("login-form");
const welcomeBack = document.getElementById("welcome-back");
const displaySavedKey = document.getElementById("display-saved-key");
const continueBtn = document.getElementById("continue-btn");
const switchKeyBtn = document.getElementById("switch-key-btn");
const keyInput = document.getElementById("license-key-input");
const loginBtn = document.getElementById("submit-key-btn");
const loginMsg = document.getElementById("login-msg");

// Cek otomatis saat buka aplikasi (Auto-login)
const savedKey = localStorage.getItem("saved_key");
let isLicenseValid = false;

if (savedKey) {
  // Sembunyikan form input, tampilkan kartu Welcome Back
  loginForm.style.display = "none";
  welcomeBack.style.display = "flex";
  displaySavedKey.innerText = `Key: ${savedKey}`;
}

// Tombol LANJUTKAN
continueBtn.addEventListener("click", () => {
  const currentSavedKey = localStorage.getItem("saved_key");
  if (currentSavedKey) {
    validateLicense(currentSavedKey);
  } else {
    welcomeBack.style.display = "none";
    loginForm.style.display = "flex";
  }
});

// Tombol GANTI KEY
switchKeyBtn.addEventListener("click", () => {
  localStorage.removeItem("saved_key");
  welcomeBack.style.display = "none";
  loginForm.style.display = "flex";
  loginMsg.innerText = "";
});

const currentHWID = machineIdSync();

async function validateLicense(userKey) {
  console.log("Memvalidasi Key:", userKey);
  if (!userKey || userKey === "undefined") return;

  loginMsg.innerText = "Mengecek lisensi & HWID...";
  loginBtn.disabled = true;

  try {
    const { data, error } = await supabase
      .from("license_keys")
      .select("*")
      .eq("key", userKey)
      .eq("status", "active")
      .single();

    if (error) {
      loginMsg.innerText = "Key salah atau tidak aktif!";
      loginBtn.disabled = false;
      return;
    }
    if (!data) {
      loginMsg.innerText = "Silakan masukkan key!";
      loginBtn.disabled = false;
      return;
    }

    if (!data.hwid) {
      console.log("Mencoba mendaftarkan HWID:", currentHWID);
      const { error: updateError } = await supabase
        .from("license_keys")
        .update({ hwid: currentHWID })
        .eq("key", userKey);

      if (updateError) {
        console.error("Gagal Update HWID:", updateError.message);
        loginMsg.innerText = "Gagal mengunci perangkat!";
        loginBtn.disabled = false;
        return;
      }
      console.log("HWID berhasil didaftarkan!");
    } else if (data.hwid !== currentHWID) {
      loginMsg.innerText = "Key ini sudah terikat di perangkat lain!";
      loginBtn.disabled = false;
      return;
    }

    // EFEK VISUAL: Animasi Menutup
    loginMsg.innerText = "Akses diterima! Memuat data...";
    loginOverlay.style.transition = "opacity 0.5s ease";
    loginOverlay.style.opacity = "0";

    setTimeout(() => {
      loginOverlay.style.display = "none";
      isLicenseValid = true;
      localStorage.setItem("saved_key", userKey);
      startApp(); // JALANKAN APLIKASI
    }, 1000);
  } catch (err) {
    console.error(err);
    loginMsg.innerText = "Kesalahan koneksi!";
    loginBtn.disabled = false;
  }
}

loginBtn.addEventListener("click", () => {
  const val = keyInput.value.trim();
  if (val) validateLicense(val);
});

keyInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loginBtn.click();
});

// ================= FUNGSI UTAMA APLIKASI =================
function startApp() {
  console.log("Aplikasi diaktifkan...");
  const wordsPath = path.join(__dirname, "words.json");
  const usedFilePath = path.join(__dirname, "usedWords.json");

  let words = require("./words.json");

  // ================= MINIMIZE =================
  const collapseBtn = document.getElementById("collapse-btn");
  let isCollapsed = false;
  let originalHeight = window.innerHeight;

  collapseBtn.addEventListener("click", () => {
    if (!isCollapsed) {
      originalHeight = window.outerHeight;
      window.resizeTo(window.outerWidth, 10);
      collapseBtn.innerText = "+";
      isCollapsed = true;
    } else {
      window.resizeTo(window.outerWidth, originalHeight);
      collapseBtn.innerText = "-";
      isCollapsed = false;
    }
  });

  // ================= TARGET AKHIRAN (HEURISTIC) =================
  const DEADLY_SUFFIXES = [
    "cy",
    "o",
    "ax",
    "x",
    "ah",
    "ux",
    "ps",
    "ny",
    "is",
    "ur",
    "kh",
    "eh",
    "ih",
    "ai",
    "ia",
    "au",
    "sme",
    "if",
    "tif",
    "ks",
    "iat",
    "ed",
    "in",
    "ae",
    "al",
    "um",
    "an",
  ];
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
  const pagination = document.getElementById("pagination");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const pageInfo = document.getElementById("pageInfo");

  const suffixFiltersDiv = document.getElementById("suffixFilters");
  let currentActiveSuffix = "ALL";

  let currentPage = 1;
  const ITEMS_PER_PAGE = 5;
  let allCurrentResults = [];

  const input = document.getElementById("prefix");
  const best = document.getElementById("best");
  const list = document.getElementById("list");
  const counter = document.getElementById("counter");
  const toggleHideBtn = document.getElementById("toggleHideBtn");
  const toggleUsedOnlyBtn = document.getElementById("toggleUsedOnlyBtn");
  const clearBtn = document.getElementById("clearBtn");
  const resetUsedBtn = document.getElementById("resetUsedBtn");
  const modeBtn = document.getElementById("modeBtn");
  const normalSuffixContainer = document.getElementById(
    "normalSuffixContainer",
  );
  const normalSuffixInput = document.getElementById("normalSuffixInput");

  // Input tambah kata
  const newWordInput = document.getElementById("newWordInput");
  const addWordBtn = document.getElementById("addWordBtn");
  const addWordMsg = document.getElementById("addWordMsg");

  let hideUsed = false;
  let showUsedOnly = false;
  let currentResults = [];

  // ================= MODE =================
  let currentMode = localStorage.getItem("savedMode") || "normal";

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

  initMode();

  // ================= SEARCH =================
  let debounceTimer;

  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(performSearch, 300);
  });
  normalSuffixInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(performSearch, 300);
  });

  function performSearch() {
    if (!isLicenseValid) return;
    const value = input.value.toLowerCase().trim();

    // Reset tampilan jika kosong
    if (!value) {
      best.innerHTML = "";
      best.style.display = "none";
      list.innerHTML = "";
      counter.innerText = "";
      pagination.style.display = "none";
      suffixFiltersDiv.style.display = "none";
      normalSuffixContainer.style.display =
        currentMode === "normal" ? "flex" : "none";
      return;
    }

    // ================= MODE 2: LENGKAPI KATA DETECTOR =================
    if (value.includes("_")) {
      normalSuffixContainer.style.display = "none";
      suffixFiltersDiv.style.display = "none";

      const results = cariLengkapiKata(value, words);

      best.innerHTML = `🔍 <b>MODE LENGKAPI KATA</b><br><span style="color:#00d4ff">Mencari pola: ${value.toUpperCase()}</span>`;
      best.style.display = "block";
      best.style.color = "#00d4ff";

      let filtered = results;
      if (showUsedOnly) filtered = results.filter((w) => usedWords.has(w));
      else if (hideUsed) filtered = results.filter((w) => !usedWords.has(w));

      allCurrentResults = filtered;
      currentPage = 1;
      updatePagination();
      updateCounter(
        results.length,
        results.filter((w) => !usedWords.has(w)).length,
      );
      return;
    }

    // ================= MODE 1: SAMBUNG KATA (NORMAL & SKAKMAT) =================
    best.style.color = "#00e676";
    const inputLength = Math.min(value.length, MAX_PREFIX_LENGTH);
    const basePrefix = value.slice(0, inputLength);
    const baseList = prefixMap[inputLength][basePrefix] || [];

    // --- SUB-MODE: SKAKMAT ---
    if (currentMode === "skakmat") {
      const results = autoSkakmat(value, words);
      normalSuffixContainer.style.display = "none";

      if (!results.length) {
        best.innerText = "❌ Tidak ada skakmat tersedia";
        list.innerHTML = "";
        pagination.style.display = "none";
        return;
      }

      let baseFilteredResults = results;
      if (showUsedOnly) {
        baseFilteredResults = results.filter((r) => usedWords.has(r.word));
      } else if (hideUsed) {
        baseFilteredResults = results.filter((r) => !usedWords.has(r.word));
      }

      const OP_Count = baseFilteredResults.length;
      best.innerText = `♟ MODE SKAKMAT (${OP_Count} kandidat mematikan)`;
      best.style.display = "block";

      if (currentActiveSuffix !== "ALL") {
        const activeCount = baseFilteredResults.filter((r) =>
          r.word.endsWith(currentActiveSuffix),
        ).length;
        if (activeCount === 0) currentActiveSuffix = "ALL";
      }

      suffixFiltersDiv.style.display = "flex";
      renderSuffixChips(baseFilteredResults);

      let finalResults = baseFilteredResults;
      if (currentActiveSuffix !== "ALL") {
        finalResults = baseFilteredResults.filter((r) =>
          r.word.endsWith(currentActiveSuffix),
        );
      }

      allCurrentResults = finalResults.map((r) => r.word);
      currentPage = 1;
      updatePagination();
      return;
    }

    // --- SUB-MODE: NORMAL ---
    suffixFiltersDiv.style.display = "none";
    normalSuffixContainer.style.display = "flex";

    let candidates = baseList.filter((w) => w.startsWith(value));

    const customSuf = normalSuffixInput.value.toLowerCase().trim();
    if (customSuf) {
      candidates = candidates.filter((w) => w.endsWith(customSuf));
    }

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

      return { word, prefixResults, autoWin, minOptions };
    });

    ranked.sort((a, b) => {
      if (a.autoWin && !b.autoWin) return -1;
      if (!a.autoWin && b.autoWin) return 1;
      return a.minOptions - b.minOptions;
    });

    const resultWords = ranked.map((r) => r.word);
    const unused = resultWords.filter((w) => !usedWords.has(w));
    const used = resultWords.filter((w) => usedWords.has(w));

    if (showUsedOnly) {
      allCurrentResults = used;
    } else if (hideUsed) {
      allCurrentResults = unused;
    } else {
      allCurrentResults = [...unused, ...used];
    }

    currentPage = 1;

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

          message += `<span style="color:${color}">prefix ${len} huruf → ${count} opsi</span><br>`;
        }
      }
      best.innerHTML = message;
      best.style.display = "block";
    } else {
      best.innerText = "❌ Tidak ditemukan";
      best.style.display = "block";
    }

    updateCounter(resultWords.length, unused.length);
    updatePagination();
  }

  // ================= SKAKMAT & LENGKAPI LOGIC =================
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
    const candidates = wordList.filter((w) => w.startsWith(prefixAwal));
    const results = [];

    for (const word of candidates) {
      const hasDeadlySuffix = DEADLY_SUFFIXES.some((suf) => word.endsWith(suf));
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

    results.sort((a, b) => {
      const aUsed = usedWords.has(a.word);
      const bUsed = usedWords.has(b.word);

      if (!aUsed && bUsed) return -1;
      if (aUsed && !bUsed) return 1;
      if (a.nextCount === 0 && b.nextCount !== 0) return -1;
      if (a.nextCount !== 0 && b.nextCount === 0) return 1;
      return a.nextCount - b.nextCount;
    });

    return results;
  }

  function cariLengkapiKata(inputUser, daftarKata) {
    if (!inputUser) return [];

    let cleanInput = inputUser.toLowerCase().replace(/\s+/g, "");
    let patternRaw = cleanInput.replace(/_+/g, ".+");

    try {
      let regexPattern = new RegExp("^" + patternRaw + "$");

      let matches = daftarKata.filter((word) => {
        return regexPattern.test(word.toLowerCase());
      });

      return matches.sort((a, b) => {
        const aUsed = usedWords.has(a);
        const bUsed = usedWords.has(b);
        if (aUsed !== bUsed) return aUsed ? 1 : -1;
        return a.length - b.length;
      });
    } catch (e) {
      return [];
    }
  }

  // ================= PAGINATION & CHIPS LOGIC =================
  function updatePagination() {
    if (allCurrentResults.length === 0) {
      pagination.style.display = "none";
      currentResults = [];
      renderResults();
      return;
    }

    pagination.style.display = "flex";
    const totalPages = Math.ceil(allCurrentResults.length / ITEMS_PER_PAGE);

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    currentResults = allCurrentResults.slice(start, end);

    pageInfo.innerText = `Hal ${currentPage} / ${totalPages}`;
    prevBtn.disabled = false;
    nextBtn.disabled = false;

    renderResults();
  }

  prevBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(allCurrentResults.length / ITEMS_PER_PAGE);
    if (totalPages === 0) return;
    if (currentPage === 1) currentPage = totalPages;
    else currentPage--;
    updatePagination();
  });

  nextBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(allCurrentResults.length / ITEMS_PER_PAGE);
    if (totalPages === 0) return;
    if (currentPage === totalPages) currentPage = 1;
    else currentPage++;
    updatePagination();
  });

  function renderSuffixChips(allSkakmatResults) {
    let html = `<button class="suffix-chip ${currentActiveSuffix === "ALL" ? "active" : ""}" data-suf="ALL">SEMUA (${allSkakmatResults.length})</button>`;

    DEADLY_SUFFIXES.forEach((suf) => {
      const count = allSkakmatResults.filter((r) =>
        r.word.endsWith(suf),
      ).length;
      const isDisabled = count === 0 ? "disabled" : "";
      const isActive = currentActiveSuffix === suf ? "active" : "";
      html += `<button class="suffix-chip ${isActive}" data-suf="${suf}" ${isDisabled}>• ${suf.toUpperCase()} (${count})</button>`;
    });

    suffixFiltersDiv.innerHTML = html;
  }

  suffixFiltersDiv.addEventListener("click", (e) => {
    if (e.target.classList.contains("suffix-chip") && !e.target.disabled) {
      currentActiveSuffix = e.target.dataset.suf;
      performSearch();
    }
  });

  // ================= RENDER =================
  function renderResults() {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

    list.innerHTML = currentResults
      .map((word, index) => {
        const used = usedWords.has(word) ? "used" : "";
        let displayWord = word;

        const isLengkapiKata = input.value.includes("_");

        if (isLengkapiKata) {
          // HIGHLIGHT LENGKAPI KATA (Warnai huruf aslinya)
          let letters = input.value.replace(/_/g, "").toLowerCase().split("");
          displayWord = word
            .split("")
            .map((char) =>
              letters.includes(char)
                ? `<span class="deadly-highlight">${char}</span>`
                : char,
            )
            .join("");
        } else {
          // HIGHLIGHT SAMBUNG KATA BISA (Akhiran)
          const customSufVal = normalSuffixInput.value.toLowerCase().trim();
          let foundSuffix = null;

          if (
            currentMode === "normal" &&
            customSufVal &&
            word.endsWith(customSufVal)
          ) {
            foundSuffix = customSufVal;
          } else {
            foundSuffix = DEADLY_SUFFIXES.find((suf) => word.endsWith(suf));
          }

          if (foundSuffix) {
            const baseStr = word.slice(0, -foundSuffix.length);
            displayWord = `${baseStr}<span class="deadly-highlight">${foundSuffix}</span>`;
          }
        }

        return `
        <div class="item ${used}" data-word="${word}" style="display:flex;justify-content:space-between;align-items:center;">
          <span>${startIndex + index + 1}. ${displayWord}</span>
          <button class="delete-btn" data-word="${word}" style="background:none;border:none;color:#ff4444;cursor:pointer;">
            🗑
          </button>
        </div>
      `;
      })
      .join("");
  }

  // ================= INTERAKSI DOM LAINNYA =================
  list.addEventListener("click", (e) => {
    if (e.target.classList.contains("delete-btn")) {
      deleteWord(e.target.dataset.word);
      return;
    }
    const item = e.target.closest(".item");
    if (!item) return;
    toggleUsed(item.dataset.word);
  });

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

    if (words.includes(newWord)) {
      newWordInput.value = "";
      newWordInput.focus();
      return showMsg("Kata sudah tersedia", "error");
    }

    words.push(newWord);

    for (let len = 1; len <= MAX_PREFIX_LENGTH; len++) {
      if (newWord.length >= len) {
        const prefix = newWord.slice(0, len);
        if (!prefixMap[len][prefix]) prefixMap[len][prefix] = [];
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

  function toggleUsed(word) {
    if (usedWords.has(word)) usedWords.delete(word);
    else usedWords.add(word);

    saveUsedWords();
    performSearch();
  }

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

  function updateCounter(total, unusedCount) {
    if (total === 0) {
      counter.innerText = "";
      counter.className = "";
      return;
    }
    const ratio = unusedCount / total;
    counter.innerText = `Unused left: ${unusedCount} / ${total}`;
    counter.classList.remove("counter-green", "counter-yellow", "counter-red");

    if (ratio > 0.6) counter.classList.add("counter-green");
    else if (ratio > 0.3) counter.classList.add("counter-yellow");
    else counter.classList.add("counter-red");
  }

  // ================= CUSTOM RESIZE =================
  const resizeHandle = document.getElementById("resize-handle");
  let isResizing = false;
  let startX, startY, startWidth, startHeight;

  resizeHandle.addEventListener("mousedown", (e) => {
    isResizing = true;
    startX = e.screenX;
    startY = e.screenY;
    startWidth = window.outerWidth;
    startHeight = window.outerHeight;
    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => {
    if (!isResizing) return;
    const newWidth = startWidth + (e.screenX - startX);
    const newHeight = startHeight + (e.screenY - startY);
    ipcRenderer.send("resize-window", { width: newWidth, height: newHeight });
  });

  window.addEventListener("mouseup", () => {
    isResizing = false;
  });

  // ================= BUTTONS & SETTINGS =================
  toggleHideBtn.addEventListener("click", () => {
    hideUsed = !hideUsed;
    if (hideUsed) {
      showUsedOnly = false;
      toggleUsedOnlyBtn.innerText = "♻️ Used: OFF";
    }
    toggleHideBtn.innerText = hideUsed ? "🙈 Hide: ON" : "👁️ Hide: OFF";
    performSearch();
  });

  toggleUsedOnlyBtn.addEventListener("click", () => {
    showUsedOnly = !showUsedOnly;
    if (showUsedOnly) {
      hideUsed = false;
      toggleHideBtn.innerText = "👁️ Hide: OFF";
    }
    toggleUsedOnlyBtn.innerText = showUsedOnly ? "🎯 Used: ON" : "♻️ Used: OFF";
    performSearch();
  });

  modeBtn.addEventListener("click", () => {
    const modes = ["normal", "skakmat"];
    const index = modes.indexOf(currentMode);
    currentMode = modes[(index + 1) % modes.length];

    localStorage.setItem("savedMode", currentMode);
    modeBtn.classList.remove("skakmat-mode");

    if (currentMode === "skakmat") {
      modeBtn.classList.add("skakmat-mode");
      modeBtn.innerText = "☠️ SKAKMAT";
    } else {
      modeBtn.innerText = "🟢 NORMAL";
    }
    performSearch();
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    best.innerHTML = "";
    best.style.display = "none";
    list.innerHTML = "";
    counter.innerText = "";
    pagination.style.display = "none";
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
    normalSuffixInput.value = "";
    input.focus();
  }

  function saveUsedWords() {
    fs.writeFileSync(usedFilePath, JSON.stringify([...usedWords], null, 2));
  }

  document.getElementById("close-btn").addEventListener("click", () => {
    ipcRenderer.send("close-app");
  });
}
