// Image Cache Protocol URL Formatter
window.formatImgUrl = function(url) {
  if (!url || typeof url !== 'string') return '';
  let trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('fl-img://')) {
    try {
      const match = trimmed.match(/url=([^&]+)/);
      if (match) {
        trimmed = decodeURIComponent(match[1]);
      }
    } catch (e) {}
  }
  if (trimmed.startsWith('data:') || trimmed.startsWith('file:') || trimmed.startsWith('../') || trimmed.startsWith('./') || trimmed.startsWith('/')) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) {
    return 'https:' + trimmed;
  }
  return trimmed;
};

// Global Toast Helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Window Navigation & Main Initialization
document.addEventListener('DOMContentLoaded', () => {
  // Setup Window Controls
  const btnMin = document.getElementById('btn-minimize');
  const btnMax = document.getElementById('btn-maximize');
  const btnClose = document.getElementById('btn-close');

  if (btnMin) btnMin.addEventListener('click', () => window.electronAPI.windowControl.minimize());
  if (btnMax) btnMax.addEventListener('click', () => window.electronAPI.windowControl.maximize());
  if (btnClose) btnClose.addEventListener('click', () => window.electronAPI.windowControl.close());

  // Setup Sidebar View Switching
  const navItems = document.querySelectorAll('.nav-item');
  const viewPanels = document.querySelectorAll('.view-panel');

  function switchView(viewName) {
    navItems.forEach(item => {
      if (item.getAttribute('data-view') === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    viewPanels.forEach(panel => {
      if (panel.id === `view-${viewName}`) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });

    // View specific hooks
    if (viewName === 'downloads') {
      window.downloadsModule?.loadDownloads();
    } else if (viewName === 'library') {
      window.libraryModule?.loadLibrary();
    } else if (viewName === 'favorites') {
      window.libraryModule?.loadFavorites();
    } else if (viewName === 'az') {
      window.exploreModule?.loadAZ();
    } else if (viewName === 'settings') {
      window.settingsModule?.loadSettings();
    } else if (viewName === 'search') {
      window.searchModule?.loadPopularTrainers();
      const globalInput = document.getElementById('global-search-input');
      if (globalInput) {
        setTimeout(() => {
          globalInput.focus();
          globalInput.select();
        }, 50);
      }
    }
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const view = item.getAttribute('data-view');
      switchView(view);
    });
  });

  window.switchView = switchView;

  // Global Quick Search Bar in Titlebar
  const globalSearchInput = document.getElementById('global-search-input');
  if (globalSearchInput) {
    globalSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = globalSearchInput.value.trim();
        if (query) {
          switchView('search');
          window.searchModule?.performSearch(query);
        }
      }
    });
  }

  const aboutLink = document.getElementById('link-about-fling');
  if (aboutLink) {
    aboutLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.electronAPI.shell.openExternal('https://flingtrainer.com/');
    });
  }

  // Initialize Modules
  window.exploreModule?.init();
  window.searchModule?.init();
  window.downloadsModule?.init();
  window.libraryModule?.init();
  window.settingsModule?.init();
  window.detailsModule?.init();
});
