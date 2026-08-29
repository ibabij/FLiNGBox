const settingsModule = (() => {
  let currentConfig = {};

  function init() {
    const btnSelectDir = document.getElementById('btn-select-dir');
    const btnSave = document.getElementById('btn-save-settings');
    const btnTestProxy = document.getElementById('btn-test-proxy');
    const proxyModeSelect = document.getElementById('setting-proxy-mode');
    const groupCustomProxy = document.getElementById('group-custom-proxy');

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

    async function saveCurrentSettings(showFeedback = true) {
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
        closeToTray
      };

      await window.electronAPI.settings.save(newConfig);
      currentConfig = newConfig;
      if (showFeedback) {
        showToast('设置已成功保存！', 'success');
      }
      // Refresh cards if needed
      window.exploreModule?.loadRecent();
      window.libraryModule?.loadLibrary();
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
  }

  return {
    init,
    loadSettings
  };
})();

window.settingsModule = settingsModule;
