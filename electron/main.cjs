// electron/main.cjs
const { app, BrowserWindow, session } = require('electron');
const path = require('path');

// Detect if running in development
const isDev = !app.isPackaged;

if (isDev) {
  // Bypass permission prompts in development
  app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
}

// Optional: Disable hardware acceleration if media issues persist on some Windows machines
// app.disableHardwareAcceleration();

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'e-RCP — Réunion de Concertation Pluridisciplinaire',
    icon: path.join(__dirname, '../public/favicon.ico'), // adjust if you have one
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      // Allow media to play without user gesture
      autoplayPolicy: 'no-user-gesture-required',
    },
  });

  // Handle permission requests (Camera, Mic, etc.)
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log(`[Electron] Permission requested: ${permission} for ${webContents.getURL()}`);
    const allowedPermissions = ['media', 'audioCapture', 'videoCapture', 'notifications', 'display-capture'];
    
    if (allowedPermissions.includes(permission)) {
      console.log(`[Electron] Granting: ${permission}`);
      callback(true); // Approve
    } else {
      console.warn(`[Electron] Denying: ${permission}`);
      callback(false); // Deny others
    }
  });

  // Handle the getDisplayMedia request (Screen Sharing)
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    console.log(`[Electron] Display media requested by ${request.videoRequested ? 'Video' : 'None'} and ${request.audioRequested ? 'Audio' : 'None'}`);
    // This triggers the native OS picker on Windows/macOS
    // We allow both screen and window sources
    callback({ 
      video: { 
        types: ['screen', 'window'],
      },
      audio: 'loopback' // Allow system audio capture if needed
    });
  });

  // Also handle permission checks (for some newer Chromium versions)
  session.defaultSession.setPermissionCheckHandler((webContents, permission, origin, details) => {
    if (['audioCapture', 'videoCapture'].includes(permission)) {
      return true;
    }
    return false;
  });

  if (isDev) {
    // In dev, load from the Vite dev server
    win.loadURL('http://localhost:3000');
    win.webContents.openDevTools();
  } else {
    // In production, load the built files
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

// macOS: re-create window when dock icon is clicked
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Quit when all windows are closed (except macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
