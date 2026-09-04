/**
 * Tauri Adapter for FLiNG Box
 * Bridges window.electronAPI to Tauri v2 IPC commands and events
 */
(function() {
  // If already running in Electron, keep the native preload electronAPI
  if (window.electronAPI && !window.__TAURI__) {
    console.log('[Adapter] Native Electron detected, skipping Tauri adapter.');
    return;
  }

  console.log('[Adapter] Initializing Tauri v2 adapter...');

  // Helper to invoke Tauri commands safely
  async function invokeTauri(cmd, args = {}) {
    if (window.__TAURI__ && window.__TAURI__.core && typeof window.__TAURI__.core.invoke === 'function') {
      return await window.__TAURI__.core.invoke(cmd, args);
    } else if (window.__TAURI_INTERNALS__ && typeof window.__TAURI_INTERNALS__.invoke === 'function') {
      return await window.__TAURI_INTERNALS__.invoke(cmd, args);
    } else {
      console.warn(`[Adapter] Tauri invoke not ready yet for ${cmd}`);
      return null;
    }
  }

  // Helper to listen for Tauri events safely
  function listenTauri(eventName, callback) {
    let unlistenFn = null;
    let isCleanedUp = false;

    const tryListen = () => {
      if (isCleanedUp) return true;
      const tauriEvent = window.__TAURI__?.event;
      if (tauriEvent && typeof tauriEvent.listen === 'function') {
        tauriEvent.listen(eventName, (event) => {
          callback(event.payload);
        }).then(unlisten => {
          if (isCleanedUp) {
            unlisten();
          } else {
            unlistenFn = unlisten;
          }
        }).catch(err => {
          console.error(`[Adapter] Failed to listen to ${eventName}:`, err);
        });
        return true;
      }
      return false;
    };

    if (!tryListen()) {
      let attempts = 0;
      const timer = setInterval(() => {
        attempts++;
        if (tryListen() || attempts >= 30) {
          clearInterval(timer);
        }
      }, 100);
    }

    return () => {
      isCleanedUp = true;
      if (unlistenFn) unlistenFn();
    };
  }

  window.electronAPI = {
    // Window Controls
    windowControl: {
      minimize: () => invokeTauri('window_minimize'),
      maximize: () => invokeTauri('window_maximize'),
      close: () => invokeTauri('window_close'),
      isMaximized: () => invokeTauri('window_is_maximized')
    },

    // Scraper APIs
    scraper: {
      getRecent: (params = {}) => invokeTauri('scraper_get_recent', { page: params.page || 1 }),
      search: (params = {}) => invokeTauri('scraper_search', { query: params.query || '', page: params.page || 1 }),
      getAZ: () => invokeTauri('scraper_get_az'),
      getPopular: () => invokeTauri('scraper_get_popular'),
      getDetails: (params = {}) => invokeTauri('scraper_get_details', { url: params.url || '' }),
      translateText: (params = {}) => invokeTauri('scraper_translate_text', {
        text: params.text || '',
        from: params.from || 'en',
        to: params.to || 'zh-CN'
      }),
      translateGameTitle: (params = {}) => invokeTauri('scraper_translate_game_title', { title: params.title || '' })
    },

    // Download APIs
    download: {
      start: (taskData) => invokeTauri('download_start', { taskData, task_data: taskData }),
      cancel: (id) => invokeTauri('download_cancel', { id }),
      getList: () => invokeTauri('download_get_list'),
      clearCompleted: () => invokeTauri('download_clear_completed'),
      remove: (id) => invokeTauri('download_remove', { id }),
      extract: (params = {}) => invokeTauri('download_extract', {
        zipPath: params.zipPath || '',
        gameTitle: params.gameTitle || ''
      }),
      launch: (params = {}) => invokeTauri('download_launch', { exePath: params.exePath || '' }),
      openFolder: (params = {}) => invokeTauri('download_open_folder', { targetPath: params.targetPath || '' }),

      // Event Listeners
      onStart: (callback) => listenTauri('download-start', callback),
      onProgress: (callback) => listenTauri('download-progress', callback),
      onCompleted: (callback) => listenTauri('download-completed', callback),
      onFailed: (callback) => listenTauri('download-failed', callback)
    },

    // Library & Favorites APIs
    library: {
      getAll: () => invokeTauri('library_get_all'),
      getList: () => invokeTauri('library_get_all'),
      saveItem: (item) => invokeTauri('library_save_item', { item }),
      removeItem: (id, options = {}) => {
        const payload = typeof id === 'object' ? id : { id, ...options };
        return invokeTauri('library_remove_item', {
          id: payload.id,
          deleteFiles: payload.deleteFiles
        });
      },
      getFavorites: () => invokeTauri('library_get_favorites'),
      toggleFavorite: (item) => invokeTauri('library_toggle_favorite', { item }),
      isFavorite: (urlOrId) => invokeTauri('library_is_favorite', { urlOrId })
    },

    // Settings & Dialogs
    settings: {
      get: () => invokeTauri('settings_get'),
      save: (newConfig) => invokeTauri('settings_save', { newConfig }),
      testProxy: (params = {}) => invokeTauri('settings_test_proxy', {
        mode: params.mode || 'direct',
        customUrl: params.customUrl || ''
      }),
      selectFolder: () => invokeTauri('dialog_select_folder')
    },

    // Image Cache
    imageCache: {
      getStats: () => invokeTauri('image_cache_get_stats'),
      clear: () => invokeTauri('image_cache_clear'),
      preload: (urls) => invokeTauri('image_cache_preload', { urls })
    },

    // Shell
    shell: {
      openExternal: (url) => invokeTauri('shell_open_external', { url })
    }
  };

  console.log('[Adapter] window.electronAPI successfully bridged to Tauri v2!');
})();
