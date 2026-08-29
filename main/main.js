const { app, BrowserWindow, Tray, Menu, nativeImage, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const SimpleStore = require('./store');
const FlingScraper = require('./scraper');
const Downloader = require('./downloader');
const ImageCacheManager = require('./imageCache');
const { setupIpcHandlers } = require('./ipcHandlers');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'fl-img',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      bypassCSP: true
    }
  }
]);

let mainWindow = null;
let tray = null;
let store = null;
let scraper = null;
let downloader = null;
let imageCache = null;

function createWindow() {
  const iconPath = path.join(__dirname, '../assets/icon.png');
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 980,
    minHeight: 660,
    backgroundColor: '#0c0e14',
    frame: false, // frameless for custom modern titlebar
    icon: iconPath,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  downloader.setMainWindow(mainWindow);
}

function createTray() {
  try {
    const iconPath = path.join(__dirname, '../assets/icon.png');
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    tray = new Tray(icon);
    tray.setToolTip('FLiNG Box (风灵盒子)');
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '打开 FLiNG Box',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (e) {
    console.error('Tray creation error:', e);
  }
}

app.whenReady().then(() => {
  store = new SimpleStore();
  imageCache = new ImageCacheManager(store);
  scraper = new FlingScraper(store);
  downloader = new Downloader(store, null);

  // Handle cached image requests via fl-img protocol
  protocol.handle('fl-img', async (request) => {
    try {
      const urlObj = new URL(request.url);
      const targetUrl = urlObj.searchParams.get('url');
      if (!targetUrl) {
        return new Response('Missing target url parameter', { status: 400 });
      }

      const result = await imageCache.getImage(targetUrl);
      if (!result || !result.filePath || !fs.existsSync(result.filePath)) {
        return new Response('Image not found', { status: 404 });
      }

      const buffer = fs.readFileSync(result.filePath);
      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': result.mimeType || 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });
    } catch (err) {
      console.error('Failed to load image from fl-img protocol:', err.message);
      return new Response('Image load error: ' + err.message, { status: 500 });
    }
  });

  createWindow();
  setupIpcHandlers({ mainWindow, scraper, downloader, store, imageCache });
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
