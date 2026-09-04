const settingsModule = (() => {
  let currentConfig = {};

  function init() {
    const btnSelectDir = document.getElementById('btn-select-dir');
    const btnSave = document.getElementById('btn-save-settings');
    const btnTestProxy = document.getElementById('btn-test-proxy');
    const proxyModeSelect = document.getElementById('setting-proxy-mode');
    const groupCustomProxy = document.getElementById('group-custom-proxy');
    const btnClearCache = document.getElementById('btn-clear-image-cache');

    if (btnSelectDir) {
      btnSelectDir.addEventListener('click', async () => {
        const selected = await window.electronAPI.settings.selectFolder();
        if (selected) {
          const input = document.getElementById('setting-download-dir');
          if (input) input.value = selected;
        }
      });
    }

    if (proxyModeSelect && groupCustomProxy) {
      proxyModeSelect.addEventListener('change', () => {
        if (proxyModeSelect.value === 'custom') {
          groupCustomProxy.style.display = 'flex';
        } else {
          groupCustomProxy.style.display = 'none';
        }
      });
    }

    if (btnTestProxy) {
      btnTestProxy.addEventListener('click', async () => {
        const proxyMode = document.getElementById('setting-proxy-mode')?.value || 'direct';
        const customUrl = document.getElementById('setting-custom-proxy')?.value?.trim() || '';

        if (proxyMode === 'custom' && !customUrl) {
          showToast('请先填写自定义代理地址 (例如: http://127.0.0.1:7890)', 'warning');
          return;
        }

        btnTestProxy.disabled = true;
        btnTestProxy.textContent = '测试中...';
        try {
          await window.electronAPI.settings.testProxy({ mode: proxyMode, customUrl });
          showToast('连接测试成功！代理配置有效且网络通畅。', 'success');
        } catch (e) {
          showToast(`连接测试失败: ${e.message}`, 'error');
        } finally {
          btnTestProxy.disabled = false;
          btnTestProxy.textContent = '测试连通性';
        }
      });
    }

    if (btnClearCache) {
      btnClearCache.addEventListener('click', async () => {
        btnClearCache.disabled = true;
        try {
          const res = await window.electronAPI.imageCache.clear();
          if (res && res.success) {
            showToast(`成功清除 ${res.count} 张缓存图片 (释放 ${res.freedFormatted || '0 B'})`, 'success');
          } else {
            showToast('缓存清理完成', 'info');
          }
          await updateCacheStats();
        } catch (e) {
          showToast(`清理缓存失败: ${e.message}`, 'error');
        } finally {
          btnClearCache.disabled = false;
        }
      });
    }

    async function saveCurrentSettings(showFeedback = true) {
      try {
        const downloadDir = document.getElementById('setting-download-dir')?.value || '';
        const autoExtract = document.getElementById('setting-auto-extract')?.checked ?? true;
        const deleteFilesOnRemove = document.getElementById('setting-delete-files-on-remove')?.checked ?? true;
        const translateGameTitles = document.getElementById('setting-translate-game-titles')?.checked ?? false;
        const proxyMode = document.getElementById('setting-proxy-mode')?.value || 'direct';
        const customUrl = document.getElementById('setting-custom-proxy')?.value || '';
        const closeToTray = document.getElementById('setting-close-to-tray')?.checked ?? false;

        const newConfig = {
          downloadDir,
          autoExtract,
          deleteFilesOnRemove,
          translateGameTitles,
          proxy: {
            mode: proxyMode,
            customUrl
          },
          closeToTray,
          theme: currentConfig.theme || 'dark'
        };

        const saved = await window.electronAPI.settings.save(newConfig);
        currentConfig = saved || newConfig;
        if (showFeedback) {
          showToast('设置已成功保存！', 'success');
        } else {
          showToast(translateGameTitles ? '已开启游戏名称中文翻译' : '已关闭游戏名称翻译', 'info');
        }

        // Refresh explore & library cards immediately
        const page = window.exploreModule?.getCurrentPage ? window.exploreModule.getCurrentPage() : 1;
        window.exploreModule?.loadRecent(page);
        window.libraryModule?.loadLibrary();
      } catch (err) {
        console.error('[Settings] Save settings failed:', err);
        showToast(`保存设置失败: ${err.message || err}`, 'error');
      }
    }

    if (btnSave) {
      btnSave.addEventListener('click', () => saveCurrentSettings(true));
    }

    // Auto-save on switch toggles for frictionless persistence
    ['setting-auto-extract', 'setting-delete-files-on-remove', 'setting-translate-game-titles', 'setting-close-to-tray'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => {
          saveCurrentSettings(false);
        });
      }
    });

    loadSettings();
  }

  async function updateCacheStats() {
    const statsEl = document.getElementById('cache-stats-text');
    if (!statsEl) return;
    try {
      const stats = await window.electronAPI.imageCache.getStats();
      statsEl.textContent = `${stats.count || 0} 张图片 (${stats.sizeFormatted || '0 B'})`;
    } catch {
      statsEl.textContent = '暂无统计';
    }
  }

  async function loadSettings() {
    currentConfig = await window.electronAPI.settings.get();

    const inputDir = document.getElementById('setting-download-dir');
    const chkAutoExtract = document.getElementById('setting-auto-extract');
    const chkDeleteFiles = document.getElementById('setting-delete-files-on-remove');
    const chkTranslateTitles = document.getElementById('setting-translate-game-titles');
    const selectProxyMode = document.getElementById('setting-proxy-mode');
    const inputCustomProxy = document.getElementById('setting-custom-proxy');
    const chkCloseToTray = document.getElementById('setting-close-to-tray');
    const groupCustomProxy = document.getElementById('group-custom-proxy');

    if (inputDir) inputDir.value = currentConfig.downloadDir || '';
    if (chkAutoExtract) chkAutoExtract.checked = currentConfig.autoExtract !== false;
    if (chkDeleteFiles) chkDeleteFiles.checked = currentConfig.deleteFilesOnRemove !== false;
    if (chkTranslateTitles) chkTranslateTitles.checked = !!currentConfig.translateGameTitles;
    if (chkCloseToTray) chkCloseToTray.checked = !!currentConfig.closeToTray;

    if (selectProxyMode) {
      selectProxyMode.value = currentConfig.proxy?.mode || 'direct';
    }
    if (inputCustomProxy) {
      inputCustomProxy.value = currentConfig.proxy?.customUrl || '';
    }
    if (groupCustomProxy) {
      groupCustomProxy.style.display = currentConfig.proxy?.mode === 'custom' ? 'flex' : 'none';
    }

    await updateCacheStats();
  }

  return {
    init,
    loadSettings,
    updateCacheStats
  };
})();

window.settingsModule = settingsModule;
