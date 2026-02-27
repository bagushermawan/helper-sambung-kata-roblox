# 🔥 Helper Sambung Kata Roblox

A lightweight desktop helper tool built with Electron to assist in playing Roblox word-chain (Sambung Kata) games strategically.

## 🚀 Features

- 🔎 Fast prefix-based word search
- 😈 Smart ranking system (prioritizes hardest follow-up for opponents)
- 📊 Remaining unused word counter
- 🧠 Tracks used words automatically
- ➕ Add or delete custom words
- 🪟 Always-on-top floating window
- ⚡ Optimized for large word datasets (30k+ words)

---

## 🛠 Built With

- Electron
- Node.js
- Vanilla JavaScript

---

## 📦 Installation

Clone the repository:

```bash
git clone https://github.com/bagushermawan/helper-sambung-kata-roblox.git
cd helper-sambung-kata-roblox
npm install
npm start
```

---

## 📂 Project Structure

```
main.js        → Electron main process
renderer.js    → Word logic & UI logic
index.html     → UI layout
words.json     → Word database
```

---

## 🧠 Strategy Logic

The bot ranks words by calculating how many possible next-prefix continuations exist.

The fewer the opponent options, the higher the word ranks.

---

## 📝 Notes

- `node_modules` is excluded from the repository.
- `usedWords.json` is local-only and not committed.
- Designed for performance with ~30k word entries.

---

## 📄 License

MIT License
