const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window Controls
  windowControl: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized')
  },

  // Scraper APIs
  scraper: {
    getRecent: (params) => ipcRenderer.invoke('scraper:get-recent', params),
    search: (params) => ipcRenderer.invoke('scraper:search', params),
    getAZ: () => ipcRenderer.invoke('scraper:get-az'),
    getPopular: () => ipcRenderer.invoke('scraper:get-popular'),
    getDetails: (params) => ipcRenderer.invoke('scraper:get-details', params),
    translateText: (params) => ipcRenderer.invoke('scraper:translate-text', params),
    translateGameTitle: (params) => ipcRenderer.invoke('scraper:translate-game-title', params)
  },

  // Download APIs
  download: {
    start: (taskData) => ipcRenderer.invoke('download:start', taskData),
    cancel: (id) => ipcRenderer.invoke('download:cancel', id),
    getList: () => ipcRenderer.invoke('download:get-list'),
    clearCompleted: () => ipcRenderer.invoke('download:clear-completed'),
    remove: (id) => ipcRenderer.invoke('download:remove', id),
    extract: (params) => ipcRenderer.invoke('download:extract', params),
    launch: (params) => ipcRenderer.invoke('download:launch', params),
    openFolder: (params) => ipcRenderer.invoke('download:open-folder', params),
    
    // Event Listeners
    onStart: (callback) => {
      const sub = (_, data) => callback(data);
      ipcRenderer.on('download-start', sub);
      return () => ipcRenderer.removeListener('download-start', sub);
    },
    onProgress: (callback) => {
      const sub = (_, data) => callback(data);
      ipcRenderer.on('download-progress', sub);
      return () => ipcRenderer.removeListener('download-progress', sub);
    },
    onCompleted: (callback) => {
      const sub = (_, data) => callback(data);
      ipcRenderer.on('download-completed', sub);
      return () => ipcRenderer.removeListener('download-completed', sub);
    },
    onFailed: (callback) => {
      const sub = (_, data) => callback(data);
      ipcRenderer.on('download-failed', sub);
      return () => ipcRenderer.removeListener('download-failed', sub);
    }
  },

  // Library & Favorites APIs
  library: {
    getAll: () => ipcRenderer.invoke('library:get-all'),
    getList: () => ipcRenderer.invoke('library:get-all'),
    saveItem: (item) => ipcRenderer.invoke('library:save-item', item),
    removeItem: (id, options = {}) => ipcRenderer.invoke('library:remove-item', typeof id === 'object' ? id : { id, ...options }),
    getFavorites: () => ipcRenderer.invoke('library:get-favorites'),
    toggleFavorite: (item) => ipcRenderer.invoke('library:toggle-favorite', item),
    isFavorite: (urlOrId) => ipcRenderer.invoke('library:is-favorite', urlOrId)
  },

  // Settings & Dialogs
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (newConfig) => ipcRenderer.invoke('settings:save', newConfig),
    testProxy: (params) => ipcRenderer.invoke('settings:test-proxy', params),
    selectFolder: () => ipcRenderer.invoke('dialog:select-folder')
  },

  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:open-external', url)
  }
});
