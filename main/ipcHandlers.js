const { ipcMain, dialog, shell } = require('electron');

function setupIpcHandlers({ mainWindow, scraper, downloader, store }) {
  // Window controls
  ipcMain.handle('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    if (!mainWindow) return false;
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
      return false;
    } else {
      mainWindow.maximize();
      return true;
    }
  });

  ipcMain.handle('window:close', () => {
    const config = store.getConfig();
    if (config.closeToTray) {
      mainWindow.hide();
    } else {
      mainWindow.close();
    }
  });

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false;
  });

  // Scraper endpoints
  ipcMain.handle('scraper:get-recent', async (_, { page = 1 } = {}) => {
    return await scraper.getRecentTrainers(page);
  });

  ipcMain.handle('scraper:search', async (_, { query, page = 1 }) => {
    return await scraper.searchTrainers(query, page);
  });

  ipcMain.handle('scraper:get-az', async () => {
    return await scraper.getAllTrainersAZ();
  });

  ipcMain.handle('scraper:get-details', async (_, { url }) => {
    return await scraper.getTrainerDetails(url);
  });

  ipcMain.handle('scraper:get-popular', async () => {
    return await scraper.getPopularTrainers();
  });

  ipcMain.handle('scraper:translate-text', async (_, { text, from = 'en', to = 'zh-CN' } = {}) => {
    return await scraper.translateText(text, from, to);
  });

  ipcMain.handle('scraper:translate-game-title', async (_, { title } = {}) => {
    return await scraper.translateGameTitle(title);
  });

  // Downloader endpoints
  ipcMain.handle('download:start', async (_, taskData) => {
    return await downloader.startDownload(taskData);
  });

  ipcMain.handle('download:cancel', async (_, id) => {
    downloader.cancelDownload(id);
    return { success: true };
  });

  ipcMain.handle('download:get-list', () => {
    return store.getDownloads();
  });

  ipcMain.handle('download:clear-completed', () => {
    return store.clearCompletedDownloads();
  });

  ipcMain.handle('download:remove', (_, id) => {
    return store.removeDownload(id);
  });

  ipcMain.handle('download:extract', async (_, { zipPath, gameTitle }) => {
    return await downloader.extractZipFile(zipPath, gameTitle);
  });

  ipcMain.handle('download:launch', async (_, { exePath }) => {
    return await downloader.launchTrainer(exePath);
  });

  ipcMain.handle('download:open-folder', async (_, { targetPath }) => {
    downloader.openInExplorer(targetPath);
    return { success: true };
  });

  // Library & Favorites
  ipcMain.handle('library:get-all', () => {
    return store.getLibrary();
  });

  ipcMain.handle('library:save-item', (_, item) => {
    return store.saveLibraryItem(item);
  });

  ipcMain.handle('library:remove-item', (_, payload) => {
    if (typeof payload === 'object' && payload !== null) {
      return store.removeLibraryItem(payload.id, payload.deleteFiles);
    }
    return store.removeLibraryItem(payload);
  });

  ipcMain.handle('library:get-favorites', () => {
    return store.getFavorites();
  });

  ipcMain.handle('library:toggle-favorite', (_, item) => {
    return store.toggleFavorite(item);
  });

  ipcMain.handle('library:is-favorite', (_, urlOrId) => {
    return store.isFavorite(urlOrId);
  });

  // Settings & Dialogs
  ipcMain.handle('settings:get', () => {
    return store.getConfig();
  });

  ipcMain.handle('settings:save', (_, newConfig) => {
    return store.saveConfig(newConfig);
  });

  ipcMain.handle('settings:test-proxy', async (_, { mode, customUrl }) => {
    const axios = require('axios');
    const axiosOptions = {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    };

    if (mode === 'custom') {
      if (!customUrl || !customUrl.trim()) {
        throw new Error('未填写自定义代理地址，请输入代理地址 (如: http://127.0.0.1:7890)');
      }
      let proxyStr = customUrl.trim();
      if (!/^https?:\/\//i.test(proxyStr)) {
        proxyStr = 'http://' + proxyStr;
      }
      try {
        const proxyUrl = new URL(proxyStr);
        if (!proxyUrl.hostname || !proxyUrl.port) {
          throw new Error('缺少主机名或端口');
        }
        axiosOptions.proxy = {
          protocol: proxyUrl.protocol.replace(':', ''),
          host: proxyUrl.hostname,
          port: parseInt(proxyUrl.port, 10),
          auth: proxyUrl.username ? { username: proxyUrl.username, password: proxyUrl.password } : undefined
        };
      } catch (err) {
        throw new Error(`代理地址格式错误: ${err.message} (格式示例: http://127.0.0.1:7890)`);
      }
    } else {
      axiosOptions.proxy = false;
    }

    try {
      const res = await axios.get('https://flingtrainer.com', axiosOptions);
      return { success: true, status: res.status };
    } catch (err) {
      throw new Error(`连接失败: ${err.message}`);
    }
  });

  ipcMain.handle('dialog:select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory']
    });
    if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  // External link
  ipcMain.handle('shell:open-external', (_, url) => {
    shell.openExternal(url);
    return { success: true };
  });
}

module.exports = { setupIpcHandlers };
