const downloadsModule = (() => {
  let downloadsList = [];

  function init() {
    const btnClear = document.getElementById('btn-clear-completed-downloads');
    const btnOpenDir = document.getElementById('btn-open-download-dir');

    if (btnClear) {
      btnClear.addEventListener('click', async () => {
        downloadsList = await window.electronAPI.download.clearCompleted();
        renderDownloadsList();
        updateBadge();
        showToast('已清空已完成的下载记录', 'info');
      });
    }

    if (btnOpenDir) {
      btnOpenDir.addEventListener('click', async () => {
        const config = await window.electronAPI.settings.get();
        if (config.downloadDir) {
          window.electronAPI.download.openFolder({ targetPath: config.downloadDir });
        }
      });
    }

    // Register IPC Download Event Listeners
    window.electronAPI.download.onStart((record) => {
      handleDownloadUpdate(record);
      updateBadge();
      startPollingIfNeeded();
    });

    window.electronAPI.download.onProgress((record) => {
      handleDownloadUpdate(record);
      updateBadge();
      startPollingIfNeeded();
    });

    window.electronAPI.download.onCompleted((record) => {
      handleDownloadUpdate(record);
      updateBadge();
      showToast(`下载完成: ${record.filename}`, 'success');
      window.libraryModule?.loadLibrary();
      loadDownloads();
    });

    window.electronAPI.download.onFailed((record) => {
      handleDownloadUpdate(record);
      updateBadge();
      showToast(`下载失败: ${record.filename} (${record.error || '网络错误'})`, 'error');
      loadDownloads();
    });

    loadDownloads();
  }

  let pollTimer = null;
  function startPollingIfNeeded() {
    const hasActive = downloadsList.some(x => x.status === 'downloading');
    if (hasActive && !pollTimer) {
      pollTimer = setInterval(async () => {
        try {
          downloadsList = await window.electronAPI.download.getList();
          renderDownloadsList();
          updateBadge();
          const stillActive = downloadsList.some(x => x.status === 'downloading');
          if (!stillActive) {
            clearInterval(pollTimer);
            pollTimer = null;
          }
        } catch (e) {
          // ignore
        }
      }, 1000);
    } else if (!hasActive && pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function formatBytes(bytes, decimals = 1) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  function formatSpeed(bytesPerSec) {
    if (!bytesPerSec || bytesPerSec === 0) return '0 KB/s';
    return formatBytes(bytesPerSec) + '/s';
  }

  function formatETA(seconds) {
    if (!seconds || seconds <= 0 || !isFinite(seconds)) return '--';
    if (seconds < 60) return `${seconds} 秒`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m} 分 ${s} 秒`;
  }

  async function loadDownloads() {
    downloadsList = await window.electronAPI.download.getList();
    renderDownloadsList();
    updateBadge();
    startPollingIfNeeded();
  }

  function updateBadge() {
    const badge = document.getElementById('download-badge');
    if (!badge) return;
    const activeCount = downloadsList.filter(x => x.status === 'downloading').length;
    if (activeCount > 0) {
      badge.textContent = activeCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  function handleDownloadUpdate(record) {
    const idx = downloadsList.findIndex(x => x.id === record.id);
    if (idx >= 0) {
      downloadsList[idx] = { ...downloadsList[idx], ...record };
    } else {
      downloadsList.unshift(record);
    }
    renderDownloadsList();
  }

  function getThumb200Url(coverUrl) {
    const fallback = 'https://flingtrainer.com/wp-content/uploads/2019/05/cropped-free-icon-bw_icon-template-psd-3-3-200x200.png';
    if (!coverUrl) return fallback;
    if (coverUrl.includes('200x200')) return coverUrl;
    return coverUrl.replace(/(\.[a-zA-Z0-9]+(?:\?.*)?)$/i, '-200x200$1');
  }

  function renderDownloadsList() {
    const container = document.getElementById('downloads-list');
    if (!container) return;

    if (downloadsList.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 50px;">暂无下载任务</div>';
      return;
    }

    container.innerHTML = '';
    const fallbackCover = 'https://flingtrainer.com/wp-content/uploads/2019/05/cropped-free-icon-bw_icon-template-psd-3-3-200x200.png';

    downloadsList.forEach(item => {
      const card = document.createElement('div');
      card.className = 'download-item-card';

      let statusText = '下载中';
      let statusClass = 'downloading';
      if (item.status === 'completed') {
        statusText = '已完成';
        statusClass = 'completed';
      } else if (item.status === 'failed') {
        statusText = '下载失败';
        statusClass = 'failed';
      } else if (item.status === 'cancelled') {
        statusText = '已取消';
        statusClass = 'failed';
      }

      const rawThumb = getThumb200Url(item.thumbCover || item.cover);
      const thumb200 = window.formatImgUrl ? window.formatImgUrl(rawThumb) : rawThumb;
      const fallbackUrl = window.formatImgUrl ? window.formatImgUrl(item.cover || fallbackCover) : (item.cover || fallbackCover);

      const hasTotal = item.totalBytes && item.totalBytes > 0;
      const progressPercent = item.status === 'completed'
        ? 100
        : (item.percent || (hasTotal ? Math.min(99, Math.round((item.downloadedBytes / item.totalBytes) * 100)) : 0));

      let progressText = '';
      if (item.status === 'completed') {
        progressText = `大小: ${formatBytes(item.totalBytes || item.downloadedBytes || 0)}`;
      } else if (hasTotal) {
        progressText = `进度: ${progressPercent}% (${formatBytes(item.downloadedBytes || 0)} / ${formatBytes(item.totalBytes)})`;
      } else {
        progressText = `已下载: ${formatBytes(item.downloadedBytes || 0)}`;
      }

      let fillStyle = `width: ${progressPercent}%`;
      if (item.status === 'downloading' && !hasTotal) {
        fillStyle = `width: 100%; opacity: 0.8;`;
      }

      const isExe = (item.filename || '').toLowerCase().endsWith('.exe') || (item.extractedExePath && item.extractedExePath.endsWith('.exe'));
      const formatBadge = isExe
        ? '<span style="font-size: 11px; padding: 1px 5px; border-radius: 4px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-weight: 600; margin-left: 6px;">EXE</span>'
        : '<span style="font-size: 11px; padding: 1px 5px; border-radius: 4px; background: rgba(251, 146, 60, 0.15); color: #fb923c; font-weight: 600; margin-left: 6px;">ZIP</span>';

      card.innerHTML = `
        <div class="download-thumb-box">
          <img class="download-thumb-img" src="${thumb200}" alt="${item.gameTitle || ''}" onerror="this.src='${fallbackUrl}'">
        </div>
        <div class="download-details">
          <div class="download-title-row">
            <span class="download-filename">${item.filename}</span>
            ${formatBadge}
            <span class="download-status-badge ${statusClass}">${statusText}</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="${fillStyle}"></div>
          </div>
          <div class="download-meta-row">
            <span>${progressText}</span>
            ${item.status === 'downloading' ? `<span>速度: ${formatSpeed(item.speed)} | 剩余: ${formatETA(item.eta)}</span>` : ''}
            ${item.status === 'completed' ? `<span>所属游戏: ${item.gameTitle || '未知'}</span>` : ''}
            ${item.status === 'failed' ? `<span style="color: var(--color-danger);">❌ 失败原因: ${item.error || '网络连接超时'}</span>` : ''}
            ${item.status === 'cancelled' ? `<span>已取消下载</span>` : ''}
          </div>
        </div>
        <div class="download-actions">
          ${item.status === 'completed' ? `
            <button class="btn btn-primary btn-launch-dl" title="启动修改器">🚀 启动</button>
            <button class="btn btn-secondary btn-open-folder" title="打开所在文件夹">📁 打开</button>
          ` : ''}
          ${item.status === 'downloading' ? `
            <button class="btn btn-secondary btn-cancel-dl">取消</button>
          ` : ''}
          ${(item.status === 'failed' || item.status === 'cancelled') ? `
            <button class="btn btn-primary btn-retry-dl" title="重新下载">🔄 重试</button>
            <button class="btn btn-secondary btn-del-dl" title="删除记录">🗑️ 移除</button>
          ` : ''}
        </div>
      `;

      // Launch handler
      const btnLaunch = card.querySelector('.btn-launch-dl');
      if (btnLaunch) {
        btnLaunch.addEventListener('click', async () => {
          const targetExe = item.extractedExePath || item.targetFilePath;
          try {
            await window.electronAPI.download.launch({ exePath: targetExe });
            showToast(`正在启动修改器: ${item.gameTitle}`, 'success');
          } catch (err) {
            showToast(`启动失败: ${err.message}`, 'error');
          }
        });
      }

      // Open Folder handler
      const btnFolder = card.querySelector('.btn-open-folder');
      if (btnFolder) {
        btnFolder.addEventListener('click', () => {
          window.electronAPI.download.openFolder({ targetPath: item.extractedFolderPath || item.targetFilePath });
        });
      }

      // Cancel handler
      const btnCancel = card.querySelector('.btn-cancel-dl');
      if (btnCancel) {
        btnCancel.addEventListener('click', () => {
          window.electronAPI.download.cancel(item.id);
        });
      }

      // Retry handler
      const btnRetry = card.querySelector('.btn-retry-dl');
      if (btnRetry) {
        btnRetry.addEventListener('click', async () => {
          showToast(`正在重试下载: ${item.filename}`, 'info');
          await window.electronAPI.download.remove(item.id);
          await startNewDownload({
            downloadUrl: item.downloadUrl,
            referer: item.referer,
            filename: item.filename,
            gameTitle: item.gameTitle,
            cover: item.cover,
            thumbCover: item.thumbCover,
            version: item.version
          });
        });
      }

      // Delete failed item handler
      const btnDel = card.querySelector('.btn-del-dl');
      if (btnDel) {
        btnDel.addEventListener('click', async () => {
          downloadsList = await window.electronAPI.download.remove(item.id);
          renderDownloadsList();
          updateBadge();
          showToast('已移除下载记录', 'info');
        });
      }

      container.appendChild(card);
    });
  }

  async function startNewDownload(taskData) {
    const task = {
      id: Date.now().toString(),
      ...taskData
    };
    await window.electronAPI.download.start(task);
    await loadDownloads();
    startPollingIfNeeded();
  }

  return {
    init,
    loadDownloads,
    startNewDownload
  };
})();

window.downloadsModule = downloadsModule;
