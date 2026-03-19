const fs = require("fs");
const path = require("path");
const { ipcRenderer } = require("electron");
const { createClient } = require("@supabase/supabase-js");
const { machineIdSync } = require("node-machine-id");
const { exec } = require("child_process");

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
const sortBtn = document.getElementById("sortBtn");
let currentSort = localStorage.getItem("savedSort") || "default";

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
  // Fungsi eksekusi ngetik lewat PowerShell
  function triggerAutoType(word) {
    // ================= FITUR BARU: GUNTING PREFIX =================
    // 1. Ambil teks yang ada di kotak pencarian (prefix)
    const prefixInput = document.getElementById("prefix");
    const prefixText = prefixInput
      ? prefixInput.value.trim().toLowerCase()
      : "";

    // 2. Siapkan variabel kata yang akan diketik
    let wordToType = word;

    // 3. Cek apakah kata target benar-benar diawali oleh prefix tersebut
    if (prefixText && word.toLowerCase().startsWith(prefixText)) {
      // Gunting bagian depan kata sepanjang jumlah huruf prefix-nya
      wordToType = word.substring(prefixText.length);
    }
    // ==============================================================

    // Cek mode Auto Enter
    const isAutoEnter = document.getElementById("autoEnterCheck")?.checked;
    const modeText = isAutoEnter ? "Ketik+Enter" : "Ketik Saja";

    // Tampilkan di Toast kata yang SUDAH DIPOTONG
    showToast(`⏳ 1.5s: Siap ${modeText} "${wordToType}"...`);

    setTimeout(() => {
      // SCRIPT RAHASIA (PowerShell Level Dewa)
      let psScript = `
      $code = @"
      using System;
      using System.Runtime.InteropServices;
      public class Kbd {
          [DllImport("user32.dll")]
          public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
          [DllImport("user32.dll")]
          public static extern byte MapVirtualKey(uint uCode, uint uMapType);
      }
"@;
      Add-Type -TypeDefinition $code;
      
      # ==== PENTING: Gunakan wordToType di sini, bukan word ====
      $word = '${wordToType}';
      
      foreach ($char in $word.ToCharArray()) {
          $vk = [byte][char]$char.ToString().ToUpper()[0];
          $scan = [Kbd]::MapVirtualKey($vk, 0);
          
          # 1. Tekan Tombol
          [Kbd]::keybd_event($vk, $scan, 0, [UIntPtr]::Zero);
          
          # Jeda ATAS (Tahan tombol): 20ms - 45ms 
          # (Pas untuk simulasi tekanan mekanik keyboard)
          Start-Sleep -Milliseconds (Get-Random -Minimum 20 -Maximum 45);
          
          # 2. Lepas Tombol
          [Kbd]::keybd_event($vk, $scan, 2, [UIntPtr]::Zero);
          
          # Jeda BAWAH (Pindah huruf): 25ms - 55ms 
          # (Sangat cepat, tapi acaknya bikin anti-cheat bingung)
          Start-Sleep -Milliseconds (Get-Random -Minimum 25 -Maximum 55);
      }
    `;

      // Tambahkan tombol Enter jika dicentang
      if (isAutoEnter) {
        psScript += `
        Start-Sleep -Milliseconds (Get-Random -Minimum 80 -Maximum 120);
        $enterScan = [Kbd]::MapVirtualKey(13, 0);
        [Kbd]::keybd_event(13, $enterScan, 0, [UIntPtr]::Zero);
        Start-Sleep -Milliseconds 40;
        [Kbd]::keybd_event(13, $enterScan, 2, [UIntPtr]::Zero);
      `;
      }

      // ENCODE SCRIPT
      const base64Script = Buffer.from(psScript, "utf16le").toString("base64");

      exec(
        `powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${base64Script}`,
        (error) => {
          if (error) {
            console.error("Gagal Auto-Type:", error);
            showToast(`❌ Gagal mengetik: ${wordToType}`);
          } else {
            showToast(`✅ Berhasil: ${wordToType}`);
          }
        },
      );
    }, 800);
  }

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
    "ao",
    "ts",
    "ei",
    "ie",
    "rp",
    "ax",
    "x",
    "ah",
    "rb",
    "ps",
    "ny",
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
    "ae",
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
  const prefixInput = document.getElementById("prefix");
  const clearBtn = document.getElementById("clearBtn");
  const normalSuffixInput = document.getElementById("normalSuffixInput");
  const clearNormalSuffixBtn = document.getElementById("clearNormalSuffixBtn");
  const resetUsedBtn = document.getElementById("resetUsedBtn");
  const modeBtn = document.getElementById("modeBtn");
  const normalSuffixContainer = document.getElementById(
    "normalSuffixContainer",
  );

  // Fungsi untuk memunculkan Toast Notification
  function showToast(message) {
    const toast = document.getElementById("toast-notification");
    if (!toast) return;

    toast.innerText = message;
    toast.classList.add("show");

    // Hilangkan otomatis setelah 2.5 detik
    setTimeout(() => {
      toast.classList.remove("show");
    }, 2500);
  }

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
      modeBtn.classList.remove("normal-mode");
      modeBtn.classList.add("skakmat-mode");
      modeBtn.innerText = "☠️ SKAKMAT";
    } else {
      modeBtn.innerText = "🟢 NORMAL";
      modeBtn.classList.remove("skakmat-mode");
      modeBtn.classList.add("normal-mode");
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
      applySorting(); //buat sorting
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
      applySorting(); //buat sorting
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

    // VERSI TURBO UNTUK PERHITUNGAN RANKING
    const ranked = candidates.map((word) => {
      const prefixResults = {};
      let autoWin = false;
      let minOptions = Infinity;

      for (let len = 1; len <= MAX_PREFIX_LENGTH; len++) {
        if (word.length < len) continue;
        const suf = word.slice(-len);

        // Panggil fungsi Turbo yang baru dibuat
        const nextOptions = countNextOptions(suf, word);

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

    applySorting(); //buat sorting
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

  // ================= PENGHITUNG SUPER CEPAT (PENGGANTI .filter) =================
  function countNextOptions(prefix, currentWord) {
    const len = Math.min(prefix.length, MAX_PREFIX_LENGTH);
    const list = prefixMap[len][prefix];
    if (!list) return 0;

    let count = 0;
    // Pakai For Loop biasa agar 10x lebih ringan dari .filter()
    for (let i = 0; i < list.length; i++) {
      const w = list[i];
      if (w !== currentWord && !usedWords.has(w)) {
        count++;
      }
    }
    return count;
  }

  function autoSkakmat(prefixAwal, wordList) {
    // AMBIL DARI PREFIX MAP BIAR INSTAN (Tidak perlu scan ratusan ribu kata lagi)
    const inputLength = Math.min(prefixAwal.length, MAX_PREFIX_LENGTH);
    const basePrefix = prefixAwal.slice(0, inputLength);
    let candidates = prefixMap[inputLength][basePrefix] || [];

    // Jika user ngetik lebih dari 3 huruf, baru filter sisanya
    if (prefixAwal.length > MAX_PREFIX_LENGTH) {
      candidates = candidates.filter((w) => w.startsWith(prefixAwal));
    }

    const results = [];

    for (const word of candidates) {
      const hasDeadlySuffix = DEADLY_SUFFIXES.some((suf) => word.endsWith(suf));
      if (!hasDeadlySuffix) continue;

      const suffixes = getSuffixes(word);
      let bestSuffix = null;
      let minCount = Infinity;

      for (const suf of suffixes) {
        // Panggil fungsi Turbo
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

    // Sisa sorting sama seperti sebelumnya
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
    list.innerHTML = ""; // Kosongkan daftar sebelumnya

    // Hitung angka urut awal berdasarkan halaman saat ini
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

    // ==== INI YANG TADI HILANG: BUKA LOOPING ====
    currentResults.forEach((word, index) => {
      // 1. Setup LI agar dikenali oleh closest(".item")
      const li = document.createElement("li");
      li.classList.add("item"); // WAJIB
      li.dataset.word = word; // WAJIB
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";
      li.style.padding = "6px 10px";
      li.style.borderBottom = "1px solid #333";

      // Cek status terpakai
      const isUsed = usedWords.has(word);

      // ==========================================
      // BAGIAN KIRI: NOMOR & TEKS
      // ==========================================
      const leftDiv = document.createElement("div");
      leftDiv.style.display = "flex";
      leftDiv.style.alignItems = "center";
      leftDiv.style.flex = "1";
      leftDiv.style.cursor = "pointer";

      const numSpan = document.createElement("span");
      numSpan.innerText = `${startIndex + index + 1}.`;
      numSpan.style.marginRight = "10px";
      numSpan.style.color = "#7b2cbf";
      numSpan.style.fontWeight = "bold";
      numSpan.style.minWidth = "25px";

      const wordText = document.createElement("span");
      wordText.innerText = word;
      if (isUsed) {
        wordText.style.textDecoration = "line-through";
        wordText.style.color = "#888";
      }

      leftDiv.appendChild(numSpan);
      leftDiv.appendChild(wordText);

      // ==========================================
      // BAGIAN KANAN: TOMBOL NGETIK & DELETE
      // ==========================================
      const rightDiv = document.createElement("div");
      rightDiv.style.display = "flex";
      rightDiv.style.gap = "10px";

      // Tombol Ngetik ⌨️

      const typeBtn = document.createElement("button");
      typeBtn.innerText = "⌨️";
      typeBtn.style.background = "none";
      typeBtn.style.border = "none";
      typeBtn.style.cursor = "pointer";
      typeBtn.style.fontSize = "16px";

      if (isUsed) {
        typeBtn.style.opacity = "0.5";
      }

      typeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        triggerAutoType(word);
      });

      rightDiv.appendChild(typeBtn);

      // Tombol Delete 🗑️
      const delBtn = document.createElement("button");
      delBtn.innerText = "🗑️";
      delBtn.classList.add("delete-btn");
      delBtn.dataset.word = word;
      delBtn.style.background = "none";
      delBtn.style.border = "none";
      delBtn.style.cursor = "pointer";
      delBtn.style.fontSize = "16px";

      rightDiv.appendChild(delBtn);

      // Gabungkan semua ke LI
      li.appendChild(leftDiv);
      li.appendChild(rightDiv);

      // Masukkan LI ke dalam List
      list.appendChild(li);
    }); // ==== INI YANG TADI HILANG: TUTUP LOOPING ====
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

  // Fungsi untuk update teks tombol Sort
  function updateSortBtnText() {
    if (currentSort === "shortest") {
      sortBtn.innerText = "⬇️ Sort: Short";
    } else if (currentSort === "longest") {
      sortBtn.innerText = "⬆️ Sort: Long";
    } else {
      sortBtn.innerText = "↕️ Sort: Default";
    }
  }
  updateSortBtnText();

  // Event Listener saat tombol Sort diklik
  sortBtn.addEventListener("click", () => {
    const sorts = ["default", "shortest", "longest"];
    const index = sorts.indexOf(currentSort);
    currentSort = sorts[(index + 1) % sorts.length];

    localStorage.setItem("savedSort", currentSort);
    updateSortBtnText();
    performSearch(); // Langsung perbarui daftar kata!
  });

  // Helper Fungsi untuk melakukan Sorting
  function applySorting() {
    if (currentSort === "shortest") {
      // Urutkan dari yang hurufnya paling sedikit
      allCurrentResults.sort(
        (a, b) => a.length - b.length || a.localeCompare(b),
      );
    } else if (currentSort === "longest") {
      // Urutkan dari yang hurufnya paling banyak
      allCurrentResults.sort(
        (a, b) => b.length - a.length || a.localeCompare(b),
      );
    }
    // Jika "default", kita biarkan urutannya apa adanya (karena bawaan mesin itu urutan strategis terbaik / Auto-Win)
  }

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
      modeBtn.classList.remove("normal-mode");
      modeBtn.classList.add("skakmat-mode");
      modeBtn.innerText = "☠️ SKAKMAT";
    } else {
      modeBtn.innerText = "🟢 NORMAL";
      modeBtn.classList.remove("skakmat-mode");
      modeBtn.classList.add("normal-mode");
    }
    performSearch();
  });

  // 1. Sembunyikan tombol saat awal (Kondisi Kosong)
  clearBtn.style.visibility = "hidden";
  clearNormalSuffixBtn.style.visibility = "hidden";

  // 2. Logika untuk Input Prefix
  prefixInput.addEventListener("input", () => {
    // Munculkan X hanya jika prefixInput ada isinya
    clearBtn.style.visibility = prefixInput.value ? "visible" : "hidden";
    performSearch(); // Jalankan pencarian otomatis saat mengetik
  });

  // 3. Logika untuk Input Suffix (Target Akhiran)
  normalSuffixInput.addEventListener("input", () => {
    // Munculkan X hanya jika normalSuffixInput ada isinya
    clearNormalSuffixBtn.style.visibility = normalSuffixInput.value
      ? "visible"
      : "hidden";
    performSearch(); // Jalankan pencarian otomatis saat mengetik
  });

  // 4. Fungsi Klik Tombol X - Prefix
  clearBtn.addEventListener("click", () => {
    prefixInput.value = "";
    clearBtn.style.visibility = "hidden";
    best.innerHTML = "";
    best.style.display = "none";
    list.innerHTML = "";
    counter.innerText = "";
    pagination.style.display = "none";
    prefixInput.focus();
    performSearch();
  });

  // 5. Fungsi Klik Tombol X - Suffix
  clearNormalSuffixBtn.addEventListener("click", () => {
    normalSuffixInput.value = "";
    clearNormalSuffixBtn.style.visibility = "hidden";

    normalSuffixInput.focus();
    performSearch();
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
    prefixInput.value = "";
    best.innerHTML = "";
    best.style.display = "none";
    list.innerHTML = "";
    counter.innerText = "";
    pagination.style.display = "none";
    currentActiveSuffix = "ALL";
    suffixFiltersDiv.style.display = "none";
    normalSuffixInput.value = "";
    clearBtn.style.visibility = "hidden";
    clearNormalSuffixBtn.style.visibility = "hidden";
    prefixInput.focus();
  }

  function saveUsedWords() {
    fs.writeFileSync(usedFilePath, JSON.stringify([...usedWords], null, 2));
  }

  document.getElementById("close-btn").addEventListener("click", () => {
    ipcRenderer.send("close-app");
  });
}
