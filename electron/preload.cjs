// electron/preload.cjs
const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe API to the renderer (your React app)
contextBridge.exposeInMainWorld('electronAPI', {
  // Example: you can add methods here later
  // e.g., openFile: () => ipcRenderer.invoke('dialog:openFile'),
  platform: process.platform,
});
