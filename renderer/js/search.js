const searchModule = (() => {
  let currentQuery = '';
  let currentPage = 1;
  let totalPages = 1;
  const HISTORY_KEY = 'fl_search_history';

  function init() {
    const btnClearHistory = document.getElementById('btn-clear-history');
    const btnPrev = document.getElementById('btn-search-prev');
    const btnNext = document.getElementById('btn-search-next');
    const hotTags = document.querySelectorAll('#hot-search-tags .hot-tag');

    // Hot search tags click
    hotTags.forEach(tag => {
      tag.addEventListener('click', () => {
        const q = tag.textContent.trim();
        const globalInput = document.getElementById('global-search-input');
        if (globalInput) globalInput.value = q;
        performSearch(q, 1);
      });
    });

    if (btnClearHistory) {
      btnClearHistory.addEventListener('click', () => {
        localStorage.removeItem(HISTORY_KEY);
        renderHistory();
      });
    }

    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        if (currentPage > 1) {
          performSearch(currentQuery, currentPage - 1);
        }
      });
    }

    if (btnNext) {
      btnNext.addEventListener('click', () => {
        performSearch(currentQuery, currentPage + 1);
      });
    }

    renderHistory();
    loadPopularTrainers();
  }

  async function loadPopularTrainers() {
    const container = document.getElementById('hot-search-tags');
    if (!container) return;

    try {
      const list = await window.electronAPI.scraper.getPopular();
      if (list && list.length > 0) {
        container.innerHTML = '';
        list.forEach(item => {
          const tag = document.createElement('span');
          tag.className = 'history-tag hot-tag';
          tag.textContent = item.title;
          tag.addEventListener('click', () => {
            const globalInput = document.getElementById('global-search-input');
            if (globalInput) globalInput.value = item.title;
            performSearch(item.title, 1);
          });
          container.appendChild(tag);
        });
      }
    } catch (e) {
      console.log('Failed to load dynamic popular trainers:', e.message);
    }
  }

  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveHistory(query) {
    let list = getHistory().filter(x => x.toLowerCase() !== query.toLowerCase());
    list.unshift(query);
    if (list.length > 10) list = list.slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    renderHistory();
  }

  function renderHistory() {
    const container = document.getElementById('history-tags');
    if (!container) return;

    const list = getHistory();
    container.innerHTML = '';
    if (list.length === 0) {
      container.innerHTML = '<span style="color: var(--text-muted); font-size: 11px;">无搜索历史</span>';
      return;
    }

    list.forEach(q => {
      const tag = document.createElement('span');
      tag.className = 'history-tag';
      tag.textContent = q;
      tag.addEventListener('click', () => {
        const globalInput = document.getElementById('global-search-input');
        if (globalInput) globalInput.value = q;
        performSearch(q, 1);
      });
      container.appendChild(tag);
    });
  }

  async function performSearch(query, page = 1) {
    if (!query) return;
    currentQuery = query;
    currentPage = page;

    saveHistory(query);

    const grid = document.getElementById('search-results-grid');
    const resultCount = document.getElementById('search-result-count');
    const pagination = document.getElementById('search-pagination');
    const pageText = document.getElementById('search-page-text');
    const btnPrev = document.getElementById('btn-search-prev');
    const btnNext = document.getElementById('btn-search-next');

    if (resultCount) resultCount.textContent = `正在搜索 "${query}" ...`;
    if (grid) {
      grid.innerHTML = '';
      for (let i = 0; i < 4; i++) {
        const sk = document.createElement('div');
        sk.className = 'skeleton-card';
        grid.appendChild(sk);
      }
    }

    try {
      const res = await window.electronAPI.scraper.search({ query, page });
      currentPage = res.currentPage || page;
      totalPages = res.totalPages || 1;

      if (!res.items || res.items.length === 0) {
        if (res.isTranslated) {
          if (resultCount) resultCount.innerHTML = `未找到关于 "<b>${query}</b>" (自动识别英文: <b>${res.effectiveQuery}</b>) 的修改器`;
        } else {
          if (resultCount) resultCount.textContent = `未找到关于 "${query}" 的修改器`;
        }
        if (grid) grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">没有找到匹配的游戏修改器，请尝试使用常用英文名称或关键词搜索。</div>';
        if (pagination) pagination.classList.add('hidden');
        return;
      }

      if (res.isTranslated && res.effectiveQuery) {
        if (resultCount) {
          resultCount.innerHTML = `<span>找到 "<b>${query}</b>" <span style="color: var(--accent-cyan); font-size: 12px; margin-left: 6px;">(💡 已自动翻译为英文: <b>${res.effectiveQuery}</b>)</span> 相关修改器结果 (第 ${currentPage} 页)</span>`;
        }
      } else {
        if (resultCount) resultCount.textContent = `找到 "${query}" 相关修改器结果 (第 ${currentPage} 页)`;
      }
      
      if (grid) grid.innerHTML = '';
      res.items.forEach(item => {
        const card = window.exploreModule.createTrainerCard(item);
        grid.appendChild(card);
      });

      if (pagination) {
        pagination.classList.remove('hidden');
        if (pageText) pageText.textContent = `第 ${currentPage} 页`;
        if (btnPrev) btnPrev.disabled = currentPage <= 1;
        if (btnNext) btnNext.disabled = !res.hasNextPage;
      }
    } catch (e) {
      if (resultCount) resultCount.textContent = '搜索出错';
      if (grid) grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--color-danger); padding: 40px;">搜索失败: ${e.message}</div>`;
      showToast(e.message, 'error');
    }
  }

  return {
    init,
    performSearch,
    loadPopularTrainers
  };
})();

window.searchModule = searchModule;
