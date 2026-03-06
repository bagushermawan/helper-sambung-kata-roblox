const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

require("electron-reload")(__dirname, {
  electron: require("path").join(__dirname, "node_modules", ".bin", "electron"),
});

let win;

// lokasi file penyimpanan ukuran window
const windowStatePath = path.join(app.getPath("userData"), "window-state.json");

// ambil ukuran terakhir
function getWindowState() {
  try {
    return JSON.parse(fs.readFileSync(windowStatePath));
  } catch {
    return { width: 400, height: 500 };
  }
}

// simpan ukuran saat ditutup
function saveWindowState() {
  if (!win) return;

  const bounds = win.getBounds();
  fs.writeFileSync(
    windowStatePath,
    JSON.stringify({
      width: bounds.width,
      height: bounds.height,
    }),
  );
}

function createWindow() {
  const { width, height } = getWindowState();

  win = new BrowserWindow({
    width,
    height,
    alwaysOnTop: true,
    frame: false,
    resizable: true,
    movable: true,
    transparent: true,
    hasShadow: false,
    backgroundColor: "#00000000",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    autoHideMenuBar: true,
  });

  win.loadFile("index.html");

  // simpan ukuran setiap kali resize
  win.on("resize", saveWindowState);

  // simpan juga saat close
  win.on("close", saveWindowState);
}

// IPC Close Handler
ipcMain.on("close-app", () => {
  if (win) {
    win.close();
  }
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  app.quit();
});
