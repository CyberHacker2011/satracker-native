const { app, BrowserWindow, shell, globalShortcut, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

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
    title: 'SAT Tracker',
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../assets/favicon.png'),
  });

  const distPath = path.join(__dirname, 'dist');
  const indexPath = path.join(distPath, 'index.html');
  
  win.loadFile(indexPath).catch(err => {
    console.error("CRITICAL ERROR: Failed to load index.html from", indexPath, err);
  });

  // Handle SPA routing - only intercept file:// URLs that aren't assets
  win.webContents.on('will-navigate', (event, url) => {
    // Allow external URLs to open in default browser
    if (url.startsWith('http://') || url.startsWith('https://')) {
      event.preventDefault();
      shell.openExternal(url);
      return;
    }
    
    // Handle SPA routing for file:// protocol
    // If the URL is a file path that doesn't point to an actual file (no extension),
    // and it is within our app context, redirect to index.html
    if (url.startsWith('file://') && !url.endsWith('.html') && !url.includes('.')) {
        event.preventDefault();
        win.loadFile(indexPath);
    }
  });

  // Handle new window requests
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Register keyboard shortcut for back navigation
  win.webContents.on('before-input-event', (event, input) => {
    // Alt+Left for back, Alt+Right for forward (like browsers)
    if (input.alt && input.key === 'ArrowLeft') {
      if (win.webContents.canGoBack()) {
        win.webContents.goBack();
      }
    }
    if (input.alt && input.key === 'ArrowRight') {
      if (win.webContents.canGoForward()) {
        win.webContents.goForward();
      }
    }
  });

  // Debug mode - uncomment to see console
  // win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
