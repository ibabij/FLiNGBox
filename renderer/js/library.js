const libraryModule = (() => {
  let libraryItems = [];
  let favoritesList = [];
  let cachedConfig = null;

  function init() {
    const searchInput = document.getElementById('library-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        filterLibrary(e.target.value.trim());
      });
    }

    loadLibrary();
  }

  async function loadLibrary() {
    try {
      cachedConfig = await window.electronAPI.settings.get();
      libraryItems = await window.electronAPI.library.getAll();
      renderLibrary(libraryItems);
      updateLibraryBadge();
    } catch (e) {
      console.error('Failed to load library:', e);
      showToast('加载修改器库失败: ' + e.message, 'error');
    }
  }

  function updateLibraryBadge() {
    const badge = document.getElementById('library-badge');
    if (!badge) return;
    if (libraryItems.length > 0) {
      badge.textContent = libraryItems.length;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  function filterLibrary(query) {
    if (!query) {
      renderLibrary(libraryItems);
      return;
    }
    const lower = query.toLowerCase();
    const filtered = libraryItems.filter(x => x.title && x.title.toLowerCase().includes(lower));
    renderLibrary(filtered);
  }

  function renderLibrary(items) {
    const container = document.getElementById('library-grid');
    if (!container) return;

    if (!items || items.length === 0) {
      container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 60px;">本地修改器库为空，前往“最新更新”或“搜索”下载修改器吧！</div>';
      return;
    }

    const isTranslateOn = !!cachedConfig?.translateGameTitles;
    container.innerHTML = '';
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'trainer-card library-card-hd';

      const formattedDate = item.addedAt ? new Date(item.addedAt).toLocaleDateString() : '';

      const rawTitle = item.title || '修改器';
      const cleanEn = item.cleanTitle || rawTitle.replace(/\s+Trainer$/i, '').trim();

      const fallbackBadgeHtml = `
        <div class="card-fallback-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="2" y="6" width="20" height="12" rx="4" ry="4"></rect>
            <line x1="6" y1="12" x2="10" y2="12"></line>
            <line x1="8" y1="10" x2="8" y2="14"></line>
            <circle cx="15" cy="11" r="1" fill="currentColor"></circle>
            <circle cx="17" cy="13" r="1" fill="currentColor"></circle>
          </svg>
          <div class="fallback-title">${cleanEn}</div>
        </div>
      `;

      const imgTagHtml = item.cover ? `
        <img src="${item.cover}" alt="${item.title}" loading="lazy" onerror="this.style.display='none'; this.parentElement.classList.add('no-cover');">
      ` : '';

      const thumbWrapHtml = `
        <div class="card-thumb-wrap ${!item.cover ? 'no-cover' : ''}">
          ${fallbackBadgeHtml}
          ${imgTagHtml}
          <div class="card-badges">
            <span class="card-badge-version">${item.version || '全版本'}</span>
          </div>
        </div>
      `;

      let titleHtml = `<div class="card-title" title="${item.title}">${item.title}</div>`;
      if (isTranslateOn) {
        let displayCn = item.cnTitle || cleanEn;
        const isCnMatch = /[\u4e00-\u9fa5]/.test(displayCn);
        titleHtml = `
          <div class="card-title-box" title="${item.title}">
            <div class="card-title-cn">${displayCn}</div>
            ${(isCnMatch && displayCn !== cleanEn) ? `<div class="card-title-en">${cleanEn}</div>` : ''}
          </div>
        `;
      }

      card.innerHTML = `
        ${thumbWrapHtml}
        <div class="card-body">
          ${titleHtml}
          <div class="card-meta-row">
            <span class="card-meta-date">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              ${formattedDate}
            </span>
            <span class="pill-tag pill-local">本地程序</span>
          </div>
          <div class="card-actions library-card-actions">
            <button class="btn btn-primary btn-launch" style="flex: 2;" title="直接启动修改器">
              <svg viewBox="0 0 24 24" fill="currentColor" style="width: 14px; height: 14px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              <span>一键启动</span>
            </button>
            <button class="btn btn-secondary btn-icon-only btn-folder" title="打开所在文件夹">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
            </button>
            <button class="btn btn-secondary btn-icon-only btn-del" title="从库中移除" style="color: var(--color-danger);">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      `;

      if (isTranslateOn && window.electronAPI?.scraper?.translateGameTitle) {
        let displayCn = item.cnTitle || cleanEn;
        if (!/[\u4e00-\u9fa5]/.test(displayCn)) {
          window.electronAPI.scraper.translateGameTitle({ title: cleanEn }).then(res => {
            if (res && res.cn && /[\u4e00-\u9fa5]/.test(res.cn) && res.cn !== cleanEn) {
              const cnEl = card.querySelector('.card-title-cn');
              const boxEl = card.querySelector('.card-title-box');
              if (cnEl && boxEl) {
                cnEl.textContent = res.cn;
                if (!card.querySelector('.card-title-en')) {
                  const enDiv = document.createElement('div');
                  enDiv.className = 'card-title-en';
                  enDiv.textContent = cleanEn;
                  boxEl.appendChild(enDiv);
                }
              }
            }
          }).catch(() => {});
        }
      }

      const launchHandler = async () => {
        const exe = item.exePath || item.zipPath;
        try {
          await window.electronAPI.download.launch({ exePath: exe });
          showToast(`已启动修改器: ${item.title}`, 'success');
        } catch (e) {
          showToast(`启动失败: ${e.message}`, 'error');
        }
      };

      // Launch Trainer
      card.querySelector('.btn-launch').addEventListener('click', (e) => {
        e.stopPropagation();
        launchHandler();
      });

      // Open Folder
      card.querySelector('.btn-folder').addEventListener('click', (e) => {
        e.stopPropagation();
        window.electronAPI.download.openFolder({ targetPath: item.folderPath || item.zipPath });
      });

      // Delete item
      card.querySelector('.btn-del').addEventListener('click', async (e) => {
        e.stopPropagation();
        const config = await window.electronAPI.settings.get();
        const willDeleteFiles = config.deleteFilesOnRemove !== false;
        const confirmMsg = willDeleteFiles
          ? `确定要从本地库中删除 "${item.title}" 及其下载的本地文件吗？`
          : `确定要从本地库中移除 "${item.title}" 吗？（保留磁盘文件）`;

        if (confirm(confirmMsg)) {
          libraryItems = await window.electronAPI.library.removeItem(item.id, { deleteFiles: willDeleteFiles });
          renderLibrary(libraryItems);
          updateLibraryBadge();
          showToast(willDeleteFiles ? '已从本地库移除并删除本地文件' : '已从本地库移除', 'info');
        }
      });

      // Clicking card opens details
      card.addEventListener('click', () => {
        if (item.referer || item.url) {
          window.detailsModule?.openDetails(item.referer || item.url, item);
        } else {
          showToast('无法获取原网页链接', 'info');
        }
      });

      container.appendChild(card);
    });
  }

  async function loadFavorites() {
    favoritesList = await window.electronAPI.library.getFavorites();
    const container = document.getElementById('favorites-grid');
    if (!container) return;

    if (!favoritesList || favoritesList.length === 0) {
      container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 50px;">暂无收藏的修改器。在修改器详情中点击右上角“★”即可添加收藏！</div>';
      return;
    }

    container.innerHTML = '';
    favoritesList.forEach(item => {
      const card = window.exploreModule.createTrainerCard(item);
      container.appendChild(card);
    });
  }

  return {
    init,
    loadLibrary,
    loadFavorites
  };
})();

window.libraryModule = libraryModule;
