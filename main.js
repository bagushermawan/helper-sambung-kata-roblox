const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

require("electron-reload")(__dirname, {
  electron: require("path").join(__dirname, "node_modules", ".bin", "electron"),
});

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 400,
    height: 500,
    alwaysOnTop: true,
    frame: false,
    resizable: true,
    movable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile("index.html");
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
