const {
  app,
  BrowserWindow,
  shell,
  globalShortcut,
  protocol,
} = require("electron");
const path = require("path");
const fs = require("fs");

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
    title: "SAT Tracker",
    backgroundColor: "#1a1a1a", // Dark neutral color to prevent flash
    autoHideMenuBar: true,
    icon: path.join(__dirname, "../assets/favicon.png"),
    show: false, // Don't show until ready
  });

  const distPath = path.join(__dirname, "dist");
  const indexPath = path.join(distPath, "index.html");

  // Show window when ready to prevent white/black flash
  win.once("ready-to-show", () => {
    win.show();
  });

  win.loadFile(indexPath).catch((err) => {
    console.error(
      "CRITICAL ERROR: Failed to load index.html from",
      indexPath,
      err,
    );
  });

  // Handle SPA routing - only intercept file:// URLs that aren't assets
  win.webContents.on("will-navigate", (event, url) => {
    // Allow external URLs to open in default browser
    if (url.startsWith("http://") || url.startsWith("https://")) {
      event.preventDefault();
      shell.openExternal(url);
      return;
    }

    // Handle SPA routing for file:// protocol
    // If the URL is a file path that doesn't point to an actual file (no extension),
    // and it is within our app context, redirect to index.html
    if (
      url.startsWith("file://") &&
      !url.endsWith(".html") &&
      !url.includes(".")
    ) {
      event.preventDefault();
      win.loadFile(indexPath);
    }
  });

  // Handle new window requests
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  // Register keyboard shortcut for back navigation
  win.webContents.on("before-input-event", (event, input) => {
    // Alt+Left for back, Alt+Right for forward (like browsers)
    if (input.alt && input.key === "ArrowLeft") {
      if (win.webContents.canGoBack()) {
        win.webContents.goBack();
      }
    }
    if (input.alt && input.key === "ArrowRight") {
      if (win.webContents.canGoForward()) {
        win.webContents.goForward();
      }
    }
  });

  // Debug mode - uncomment to see console
  // win.webContents.openDevTools();
}

// Widget code removed

// Deep linking handling
// Deep linking handling
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("satracker", process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient("satracker");
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();

      // Protocol handler for Windows
      // commandLine looks like: [ 'path/to/exe', 'satracker://...' ]
      const url = commandLine.find((arg) => arg.startsWith("satracker://"));
      if (url) {
        win.webContents.send("deep-link", url);
      }
    }
  });

  app.whenReady().then(() => {
    createWindow();

    // Check if started with deep link (Windows)
    if (process.platform === "win32") {
      const url = process.argv.find((arg) => arg.startsWith("satracker://"));
      if (url) {
        // Wait a bit for window to load
        setTimeout(() => win && win.webContents.send("deep-link", url), 1500);
      }
    }
  });

  app.on("open-url", (event, url) => {
    event.preventDefault();
    // This is for macOS, but good to keep standard
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
      win.webContents.send("deep-link", url);
    }
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
