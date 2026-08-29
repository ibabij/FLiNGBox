const fs = require('fs');
const path = require('path');

let app;
try {
  const electron = require('electron');
  app = electron.app;
} catch (e) {
  app = null;
}

class SimpleStore {
  constructor() {
    const userDataPath = app ? app.getPath('userData') : path.join(process.cwd(), '.data');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    this.userDataPath = userDataPath;
    this.configPath = path.join(userDataPath, 'config.json');
    this.libraryPath = path.join(userDataPath, 'library.json');
    this.downloadsPath = path.join(userDataPath, 'downloads.json');
    this.favoritesPath = path.join(userDataPath, 'favorites.json');

    this.defaultDownloadDir = path.join(app ? app.getPath('downloads') : process.cwd(), 'FLTrainers');
    if (!fs.existsSync(this.defaultDownloadDir)) {
      try {
        fs.mkdirSync(this.defaultDownloadDir, { recursive: true });
      } catch (e) {
        console.error('Failed to create default downloads directory:', e);
      }
    }

    this.config = this._load(this.configPath, {
      downloadDir: this.defaultDownloadDir,
      autoExtract: true,
      deleteFilesOnRemove: true,
      translateGameTitles: false,
      proxy: {
        mode: 'direct', // 'direct', 'system', 'custom'
        customUrl: '' // e.g. 'http://127.0.0.1:7897'
      },
      closeToTray: false,
      theme: 'dark'
    });

    this.library = this._load(this.libraryPath, []);
    this.downloads = this._load(this.downloadsPath, []);
    this.favorites = this._load(this.favoritesPath, []);
  }

  _load(filePath, defaultData) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error(`Error loading store from ${filePath}:`, e);
    }
    return defaultData;
  }

  _save(filePath, data) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error(`Error saving store to ${filePath}:`, e);
    }
  }

  getConfig() {
    return this.config;
  }

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this._save(this.configPath, this.config);
    return this.config;
  }

  setConfig(newConfig) {
    return this.saveConfig(newConfig);
  }

  getLibrary() {
    return this.library;
  }

  saveLibraryItem(item) {
    const idx = this.library.findIndex(x => x.id === item.id || (x.url && x.url === item.url));
    if (idx >= 0) {
      this.library[idx] = { ...this.library[idx], ...item, updatedAt: Date.now() };
    } else {
      this.library.unshift({ ...item, addedAt: Date.now(), updatedAt: Date.now() });
    }
    this._save(this.libraryPath, this.library);
    return this.library;
  }

  removeLibraryItem(id, deleteFiles = null) {
    const shouldDelete = deleteFiles !== null ? !!deleteFiles : (this.config.deleteFilesOnRemove !== false);
    const item = this.library.find(x => x.id === id);
    if (item && shouldDelete) {
      this._deleteTrainerFiles(item);
    }
    this.library = this.library.filter(x => x.id !== id);
    this._save(this.libraryPath, this.library);
    return this.library;
  }

  _deleteTrainerFiles(item) {
    const downloadDir = this.config && this.config.downloadDir ? path.resolve(this.config.downloadDir) : '';

    // 1. Delete extracted folder if present and not root directory
    if (item.folderPath) {
      try {
        const targetFolder = path.resolve(item.folderPath);
        const isNotRoot = targetFolder !== downloadDir && targetFolder !== path.parse(targetFolder).root;
        if (isNotRoot && fs.existsSync(targetFolder)) {
          const stat = fs.statSync(targetFolder);
          if (stat.isDirectory()) {
            fs.rmSync(targetFolder, { recursive: true, force: true });
          }
        }
      } catch (e) {
        console.error('Failed to delete trainer extracted folder:', e.message);
      }
    }

    // 2. Delete downloaded zip file if present
    if (item.zipPath) {
      try {
        const targetZip = path.resolve(item.zipPath);
        if (fs.existsSync(targetZip)) {
          const stat = fs.statSync(targetZip);
          if (stat.isFile()) {
            fs.unlinkSync(targetZip);
          }
        }
      } catch (e) {
        console.error('Failed to delete trainer zip file:', e.message);
      }
    }

    // 3. Delete standalone exe if separate and present
    if (item.exePath) {
      try {
        const targetExe = path.resolve(item.exePath);
        if (fs.existsSync(targetExe)) {
          const stat = fs.statSync(targetExe);
          if (stat.isFile()) {
            fs.unlinkSync(targetExe);
          }
        }
      } catch (e) {
        console.error('Failed to delete trainer exe file:', e.message);
      }
    }
  }

  getDownloads() {
    return this.downloads;
  }

  saveDownload(record) {
    const idx = this.downloads.findIndex(x => x.id === record.id);
    if (idx >= 0) {
      this.downloads[idx] = { ...this.downloads[idx], ...record };
    } else {
      this.downloads.unshift(record);
    }
    this._save(this.downloadsPath, this.downloads);
    return this.downloads;
  }

  removeDownload(id) {
    this.downloads = this.downloads.filter(x => x.id !== id);
    this._save(this.downloadsPath, this.downloads);
    return this.downloads;
  }

  clearCompletedDownloads() {
    this.downloads = this.downloads.filter(x => x.status === 'downloading' || x.status === 'paused');
    this._save(this.downloadsPath, this.downloads);
    return this.downloads;
  }

  getFavorites() {
    return this.favorites;
  }

  toggleFavorite(item) {
    const idx = this.favorites.findIndex(x => x.url === item.url || x.id === item.id);
    if (idx >= 0) {
      this.favorites.splice(idx, 1);
    } else {
      this.favorites.unshift({ ...item, favoritedAt: Date.now() });
    }
    this._save(this.favoritesPath, this.favorites);
    return this.favorites;
  }

  isFavorite(urlOrId) {
    return this.favorites.some(x => x.url === urlOrId || x.id === urlOrId);
  }
}

module.exports = SimpleStore;
