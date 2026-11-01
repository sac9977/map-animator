const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    title: 'MapAnimator',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
    },
  });
  // The built web app (dist/ is bundled inside the asar). Network features
  // (OSRM, Nominatim, Esri tiles) work as in a browser; the service worker
  // simply won't register under file:// and the app runs fully online.
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
