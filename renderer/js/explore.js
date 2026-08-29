const exploreModule = (() => {
  let currentPage = 1;
  let totalPages = 1;
  let azData = null;

  function init() {
    const btnRefresh = document.getElementById('btn-refresh-explore');
    const btnPrev = document.getElementById('btn-prev-page');
    const btnNext = document.getElementById('btn-next-page');
    const azFilterInput = document.getElementById('az-filter-input');

    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => loadRecent(1));
    }

    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        if (currentPage > 1) {
          loadRecent(currentPage - 1);
        }
      });
    }

    if (btnNext) {
      btnNext.addEventListener('click', () => {
        loadRecent(currentPage + 1);
      });
    }

    if (azFilterInput) {
      azFilterInput.addEventListener('input', (e) => {
        filterAZ(e.target.value.trim());
      });
    }

    // Initial load
    loadRecent(1);
  }

  function renderSkeletons(container, count = 8) {
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const sk = document.createElement('div');
      sk.className = 'skeleton-card';
      container.appendChild(sk);
    }
  }

  async function loadRecent(page = 1) {
    const container = document.getElementById('explore-content');
    const pageText = document.getElementById('explore-page-text');
    const btnPrev = document.getElementById('btn-prev-page');
    const btnNext = document.getElementById('btn-next-page');

    if (!container) return;
    renderSkeletons(container, 8);

    try {
      cachedConfig = await window.electronAPI.settings.get();
      const result = await window.electronAPI.scraper.getRecent({ page });
      currentPage = result.currentPage || page;
      totalPages = result.totalPages || 1;

      if (pageText) pageText.textContent = `第 ${currentPage} 页`;
      if (btnPrev) btnPrev.disabled = currentPage <= 1;
      if (btnNext) btnNext.disabled = !result.hasNextPage;

      container.innerHTML = '';
      if (!result.items || result.items.length === 0) {
        container.innerHTML = '<div class="empty-hint" style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">暂无修改器数据</div>';
        return;
      }

      result.items.forEach(item => {
        const card = createTrainerCard(item);
        container.appendChild(card);
      });
    } catch (e) {
      container.innerHTML = `<div class="error-hint" style="grid-column: 1/-1; text-align: center; color: var(--color-danger); padding: 40px;">加载失败: ${e.message}<br><button class="btn btn-secondary" style="margin-top: 12px;" onclick="window.exploreModule.loadRecent(${page})">点击重试</button></div>`;
      showToast(e.message, 'error');
    }
  }

  let cachedConfig = null;
  const titleTranslationCache = {};

  function createTrainerCard(item) {
    const card = document.createElement('div');
    card.className = 'trainer-card';

    const isTranslateOn = !!cachedConfig?.translateGameTitles;
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
          <span class="card-badge-options">${item.optionsCount || '修改器'}</span>
          <span class="card-badge-version">${item.gameVersion || '全版本'}</span>
        </div>
      </div>
    `;

    if (!isTranslateOn) {
      // Default: clean, original English title
      card.innerHTML = `
        ${thumbWrapHtml}
        <div class="card-body">
          <div class="card-title" title="${item.title}">${item.title}</div>
          <div class="card-meta-row">
            <span class="card-meta-date">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              ${item.date || '近期'}
            </span>
          </div>
        </div>
      `;
    } else {
      // Enabled in Settings: show Chinese translation
      let displayCn = item.cnTitle || titleTranslationCache[cleanEn] || cleanEn;
      const isCnMatch = /[\u4e00-\u9fa5]/.test(displayCn);

      card.innerHTML = `
        ${thumbWrapHtml}
        <div class="card-body">
          <div class="card-title-box" title="${item.title}">
            <div class="card-title-cn">${displayCn}</div>
            ${(isCnMatch && displayCn !== cleanEn) ? `<div class="card-title-en">${cleanEn}</div>` : ''}
          </div>
          <div class="card-meta-row">
            <span class="card-meta-date">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              ${item.date || '近期'}
            </span>
          </div>
        </div>
      `;

      if (!isCnMatch && window.electronAPI?.scraper?.translateGameTitle) {
        window.electronAPI.scraper.translateGameTitle({ title: cleanEn }).then(res => {
          if (res && res.cn && /[\u4e00-\u9fa5]/.test(res.cn) && res.cn !== cleanEn) {
            titleTranslationCache[cleanEn] = res.cn;
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

    // Click handler to open detail modal on whole card
    card.addEventListener('click', () => {
      window.detailsModule?.openDetails(item.url, item);
    });

    return card;
  }

  async function loadAZ() {
    const alphabetBar = document.getElementById('az-alphabet-bar');
    const container = document.getElementById('az-content-container');
    if (!container) return;

    if (azData) {
      renderAZContent(azData);
      return;
    }

    container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 40px;">正在加载 A-Z 全量修改器索引，请稍候...</div>';

    try {
      azData = await window.electronAPI.scraper.getAZ();
      renderAZBar(Object.keys(azData).sort());
      renderAZContent(azData);
    } catch (e) {
      container.innerHTML = `<div style="text-align: center; color: var(--color-danger); padding: 40px;">加载 A-Z 索引失败: ${e.message}</div>`;
      showToast(e.message, 'error');
    }
  }

  function renderAZBar(letters) {
    const alphabetBar = document.getElementById('az-alphabet-bar');
    if (!alphabetBar) return;

    alphabetBar.innerHTML = '';
    const allBtn = document.createElement('button');
    allBtn.className = 'az-letter-btn active';
    allBtn.textContent = '全部';
    allBtn.addEventListener('click', () => {
      document.querySelectorAll('.az-letter-btn').forEach(b => b.classList.remove('active'));
      allBtn.classList.add('active');
      renderAZContent(azData);
    });
    alphabetBar.appendChild(allBtn);

    letters.forEach(letter => {
      const btn = document.createElement('button');
      btn.className = 'az-letter-btn';
      btn.textContent = letter;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.az-letter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const targetBlock = document.getElementById(`az-group-${letter}`);
        if (targetBlock) {
          targetBlock.scrollIntoView({ behavior: 'smooth' });
        }
      });
      alphabetBar.appendChild(btn);
    });
  }

  function renderAZContent(data) {
    const container = document.getElementById('az-content-container');
    if (!container) return;

    container.innerHTML = '';
    const keys = Object.keys(data).sort();

    keys.forEach(letter => {
      const items = data[letter];
      if (!items || items.length === 0) return;

      const group = document.createElement('div');
      group.className = 'az-group-block';
      group.id = `az-group-${letter}`;

      group.innerHTML = `
        <div class="az-group-letter">${letter} <span style="font-size: 13px; color: var(--text-muted); font-weight: normal;">(${items.length} 款)</span></div>
        <div class="az-items-list">
          ${items.map(it => `<a class="az-item-link" data-url="${it.url}" title="${it.title}">${it.title}</a>`).join('')}
        </div>
      `;

      group.querySelectorAll('.az-item-link').forEach(link => {
        link.addEventListener('click', () => {
          const url = link.getAttribute('data-url');
          window.detailsModule?.openDetails(url, { title: link.textContent });
        });
      });

      container.appendChild(group);
    });
  }

  function filterAZ(query) {
    if (!azData) return;
    if (!query) {
      renderAZContent(azData);
      return;
    }

    const filtered = {};
    const lower = query.toLowerCase();
    for (const [letter, items] of Object.entries(azData)) {
      const matched = items.filter(it => it.title.toLowerCase().includes(lower));
      if (matched.length > 0) {
        filtered[letter] = matched;
      }
    }
    renderAZContent(filtered);
  }

  return {
    init,
    loadRecent,
    loadAZ,
    createTrainerCard
  };
})();

window.exploreModule = exploreModule;
