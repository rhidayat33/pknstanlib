/* ============================================
   App.js — Shared Utilities & Navigation
   Dashboard E-Resources PKN STAN
   ============================================ */

// ============ Auth Guard ============
function checkAuth() {
  const token = sessionStorage.getItem('dashboard_auth_token');
  if (token !== 'session_pknstanlib_authenticated') {
    const isSubdir = window.location.pathname.includes('/tutorial/');
    const loginUrl = isSubdir ? '../login.html' : 'login.html';
    window.location.href = loginUrl;
  }
}
checkAuth();

function logout() {
  sessionStorage.removeItem('dashboard_auth_token');
  const isSubdir = window.location.pathname.includes('/tutorial/');
  const loginUrl = isSubdir ? '../login.html' : 'login.html';
  window.location.href = loginUrl;
}

// ============ Chart.js Global Config ============
const CHART_COLORS = {
  indigo: 'rgba(99, 102, 241, 1)',
  violet: 'rgba(139, 92, 246, 1)',
  cyan: 'rgba(6, 182, 212, 1)',
  emerald: 'rgba(16, 185, 129, 1)',
  amber: 'rgba(245, 158, 11, 1)',
  rose: 'rgba(244, 63, 94, 1)',
  blue: 'rgba(59, 130, 246, 1)',
  teal: 'rgba(20, 184, 166, 1)',
  orange: 'rgba(249, 115, 22, 1)',
  pink: 'rgba(236, 72, 153, 1)',
  lime: 'rgba(132, 204, 22, 1)',
  sky: 'rgba(14, 165, 233, 1)',
};

const CHART_COLORS_ALPHA = Object.fromEntries(
  Object.entries(CHART_COLORS).map(([k, v]) => [k, v.replace('1)', '0.7)')])
);

const CHART_COLORS_BG = Object.fromEntries(
  Object.entries(CHART_COLORS).map(([k, v]) => [k, v.replace('1)', '0.15)')])
);

const COLOR_PALETTE = Object.values(CHART_COLORS);
const COLOR_PALETTE_ALPHA = Object.values(CHART_COLORS_ALPHA);
const COLOR_PALETTE_BG = Object.values(CHART_COLORS_BG);

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

const MONTH_NAMES_FULL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// ============ Chart.js Default Settings ============
function initChartDefaults() {
  if (typeof Chart === 'undefined') return;

  Chart.defaults.color = '#64748b';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.pointStyle = 'circle';
  Chart.defaults.plugins.legend.labels.padding = 16;
  
  // Premium white tooltip for light mode
  Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(255, 255, 255, 0.98)';
  Chart.defaults.plugins.tooltip.titleColor = '#0f172a';
  Chart.defaults.plugins.tooltip.bodyColor = '#475569';
  Chart.defaults.plugins.tooltip.titleFont = { weight: '600' };
  Chart.defaults.plugins.tooltip.padding = 12;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
  Chart.defaults.plugins.tooltip.borderColor = 'rgba(15, 23, 42, 0.08)';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  
  Chart.defaults.elements.bar.borderRadius = 6;
  Chart.defaults.elements.bar.borderSkipped = false;
  
  // Safe defaults for scales in Chart.js v3/v4
  if (Chart.defaults.scales) {
    ['linear', 'category'].forEach(scaleType => {
      if (!Chart.defaults.scales[scaleType]) {
        Chart.defaults.scales[scaleType] = {};
      }
      if (!Chart.defaults.scales[scaleType].grid) {
        Chart.defaults.scales[scaleType].grid = {};
      }
      Chart.defaults.scales[scaleType].grid.color = 'rgba(15, 23, 42, 0.05)';
      Chart.defaults.scales[scaleType].grid.drawBorder = false;

      if (!Chart.defaults.scales[scaleType].ticks) {
        Chart.defaults.scales[scaleType].ticks = {};
      }
      Chart.defaults.scales[scaleType].ticks.padding = 8;
    });
  } else if (Chart.defaults.scale) {
    if (!Chart.defaults.scale.grid) Chart.defaults.scale.grid = {};
    Chart.defaults.scale.grid.color = 'rgba(15, 23, 42, 0.05)';
    Chart.defaults.scale.grid.drawBorder = false;

    if (!Chart.defaults.scale.ticks) Chart.defaults.scale.ticks = {};
    Chart.defaults.scale.ticks.padding = 8;
  }
}

// ============ Navigation ============
function initNavigation() {
  const mobileBtn = document.querySelector('.mobile-menu-btn');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.mobile-overlay');

  if (mobileBtn) {
    mobileBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('visible');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('visible');
    });
  }

  // Highlight active nav item
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-item').forEach(item => {
    const href = item.getAttribute('href');
    if (href) {
      const hrefPage = href.split('/').pop();
      if (hrefPage === currentPage || (currentPage === '' && hrefPage === 'index.html')) {
        item.classList.add('active');
      }
    }
  });
}

// ============ Number Formatting ============
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString('id-ID');
}

function formatNumberFull(num) {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('id-ID');
}

// ============ User Category Classification ============
function classifyUser(nipNim) {
  if (!nipNim) return 'Lainnya';
  const str = String(nipNim).trim();
  if (str.startsWith('19')) return 'Dosen';
  if (str.startsWith('4') || str.startsWith('3')) return 'Mahasiswa';
  return 'Lainnya';
}

// ============ Date Utilities ============
function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function getMonthYear(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return null;
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function getYear(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return null;
  return d.getFullYear();
}

function normalizeMonthLabel(label) {
  if (!label) return 'Tidak Diketahui';
  
  const cleanLabel = String(label).trim();
  
  // Format: "Jan 2023" or similar
  if (/^[A-Za-z]{3}\s\d{4}$/.test(cleanLabel)) {
    return cleanLabel;
  }
  
  // Format: "Jan-2023" or "Jan/2023"
  const dashMatch = cleanLabel.match(/^([A-Za-z]{3})[-/](\d{4})$/);
  if (dashMatch) {
    let m = dashMatch[1];
    if (m.toLowerCase() === 'may') m = 'Mei';
    if (m.toLowerCase() === 'aug') m = 'Agu';
    if (m.toLowerCase() === 'oct') m = 'Okt';
    if (m.toLowerCase() === 'dec') m = 'Des';
    m = m.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
    return `${m} ${dashMatch[2]}`;
  }

  // Parse raw date string e.g. "Sun Jan 01 2023..." or ISO format
  const parsedDate = new Date(cleanLabel);
  if (!isNaN(parsedDate.getTime())) {
    const monthIndex = parsedDate.getMonth();
    const year = parsedDate.getFullYear();
    return `${MONTH_NAMES[monthIndex]} ${year}`;
  }

  return cleanLabel;
}

// ============ Data Grouping ============
function groupBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const key = keyFn(item) || 'Tidak Diketahui';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

function countBy(arr, keyFn) {
  const grouped = groupBy(arr, keyFn);
  return Object.fromEntries(
    Object.entries(grouped).map(([k, v]) => [k, v.length])
  );
}

function sortObjectByValue(obj, desc = true) {
  return Object.fromEntries(
    Object.entries(obj).sort((a, b) => desc ? b[1] - a[1] : a[1] - b[1])
  );
}

function topN(obj, n = 10) {
  const sorted = sortObjectByValue(obj, true);
  return Object.fromEntries(Object.entries(sorted).slice(0, n));
}

// ============ API / Data Fetching ============
const API_CACHE_KEY_PREFIX = 'dashboard_cache_';
const API_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

async function fetchWithCache(url, cacheKey) {
  // Check cache
  const cached = localStorage.getItem(API_CACHE_KEY_PREFIX + cacheKey);
  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < API_CACHE_TTL) {
        return data;
      }
    } catch (e) { /* ignore */ }
  }

  // Append secret token to Apps Script URL if it doesn't already have it
  let fetchUrl = url;
  if (url && (url.includes('script.google.com') || url.includes('googleusercontent.com'))) {
    try {
      const urlObj = new URL(url);
      if (!urlObj.searchParams.has('secret')) {
        urlObj.searchParams.set('secret', 'pknstanlib_secret_key_2026');
        fetchUrl = urlObj.toString();
      }
    } catch (err) {
      console.error('[Auth] URL parse error:', err);
    }
  }

  // Fetch
  const response = await fetch(fetchUrl);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();

  // Store cache
  localStorage.setItem(API_CACHE_KEY_PREFIX + cacheKey, JSON.stringify({
    data,
    timestamp: Date.now()
  }));

  return data;
}

// ============ Default API URLs ============
const DEFAULT_API_URLS = {
  ejournal: 'https://script.google.com/macros/s/AKfycbziM_TSDKHuo-aTUMVw-oHvGR7pOR3r61sSlHdhVsPXP5rOd5dpMUm1hxwuisulgBAL/exec',
  lseg: 'https://script.google.com/macros/s/AKfycbx65Th0U5mwzaqTeJnY26_2u3iLuqZq4BUKvQIZb-q-B1XmdMEJyRsGmAn_eYSPLa6S/exec',
  stata: 'https://script.google.com/macros/s/AKfycbx0PHzUqIW_auR8qWtvkou56Pb49LvAJSh76WrqVui2rw3VrNOvj54KcxeUd1SsrZtL/exec'
};

function getStoredApiUrl(key) {
  return localStorage.getItem('api_url_' + key) || DEFAULT_API_URLS[key] || '';
}

function setStoredApiUrl(key, url) {
  localStorage.setItem('api_url_' + key, url);
}

// ============ Animated Counter ============
function animateCounter(el, target, duration = 1000) {
  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    const current = Math.round(start + (target - start) * eased);
    el.textContent = formatNumber(current);

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      el.textContent = formatNumber(target);
    }
  }

  requestAnimationFrame(update);
}

// ============ Toast Notifications ============
function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 1000;
    padding: 12px 20px; border-radius: 8px; font-size: 13px; font-weight: 500;
    font-family: 'Inter', sans-serif;
    animation: fadeInUp 0.3s ease;
    background: ${type === 'error' ? 'rgba(244,63,94,0.9)' : type === 'success' ? 'rgba(16,185,129,0.9)' : 'rgba(99,102,241,0.9)'};
    color: white; backdrop-filter: blur(10px);
    box-shadow: 0 8px 30px rgba(0,0,0,0.3);
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ============ SVG Icons ============
const ICONS = {
  home: `<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  journal: `<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  chart: `<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  database: `<svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
  help: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  upload: `<svg viewBox="0 0 24 24"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>`,
  search: `<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  users: `<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  trending: `<svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  settings: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  menu: `<svg viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  check: `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
  logout: `<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
};

// ============ Sidebar Template ============
function getSidebarHTML(activePage) {
  return `
    <div class="sidebar-header">
      <div class="sidebar-brand">
        <div class="brand-icon">📊</div>
        <div class="brand-text">
          <span class="brand-title">E-Resources</span>
          <span class="brand-subtitle">Perpustakaan PKN STAN</span>
        </div>
      </div>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-section-label">Dashboard</div>
      <a href="index.html" class="nav-item ${activePage === 'home' ? 'active' : ''}">
        <span class="nav-icon">${ICONS.home}</span>
        <span>Home</span>
      </a>
      <div class="nav-section-label">E-Resources</div>
      <a href="ejournal.html" class="nav-item ${activePage === 'ejournal' ? 'active' : ''}">
        <span class="nav-icon">${ICONS.journal}</span>
        <span>E-Journal</span>
      </a>
      <a href="lseg.html" class="nav-item ${activePage === 'lseg' ? 'active' : ''}">
        <span class="nav-icon">${ICONS.chart}</span>
        <span>LSEG</span>
      </a>
      <a href="stata.html" class="nav-item ${activePage === 'stata' ? 'active' : ''}">
        <span class="nav-icon">${ICONS.database}</span>
        <span>STATA</span>
      </a>
      <div class="nav-section-label">Lainnya</div>
      <a href="tutorial/tutorial.html" class="nav-item ${activePage === 'tutorial' ? 'active' : ''}">
        <span class="nav-icon">${ICONS.help}</span>
        <span>Tutorial</span>
      </a>
      <div class="nav-section-label">Akun</div>
      <a onclick="logout()" class="nav-item" style="color: var(--accent-rose);">
        <span class="nav-icon">${ICONS.logout}</span>
        <span>Keluar</span>
      </a>
    </nav>
    <div class="sidebar-footer">
      <div class="sidebar-footer-text">
        © 2025 Perpustakaan PKN STAN<br>Dashboard E-Resources v1.0
      </div>
    </div>
  `;
}

// ============ Create Chart Helper ============
function createBarChart(ctx, labels, datasets, options = {}) {
  return new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: datasets.length > 1,
          position: 'top',
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (val) => formatNumber(val),
          },
        },
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 0,
          },
        },
      },
      ...options,
    },
  });
}

function createHorizontalBarChart(ctx, labels, data, color) {
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: color || CHART_COLORS.indigo,
        borderRadius: 6,
        borderSkipped: false,
        barThickness: 20,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            callback: (val) => formatNumber(val),
          },
        },
        y: {
          ticks: {
            font: { size: 11 },
            callback: function(val) {
              const label = this.getLabelForValue(val);
              return label.length > 30 ? label.substr(0, 27) + '...' : label;
            },
          },
        },
      },
    },
  });
}

function createLineChart(ctx, labels, datasets, options = {}) {
  return new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: datasets.length > 1,
          position: 'top',
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (val) => formatNumber(val),
          },
        },
      },
      elements: {
        line: {
          tension: 0.4,
          borderWidth: 2,
        },
        point: {
          radius: 3,
          hoverRadius: 6,
        },
      },
      ...options,
    },
  });
}

function createDoughnutChart(ctx, labels, data, colors) {
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors || COLOR_PALETTE.slice(0, data.length),
        borderWidth: 0,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            font: { size: 12 },
          },
        },
      },
    },
  });
}

// ============ Initialize on Load ============
document.addEventListener('DOMContentLoaded', () => {
  initChartDefaults();
  initNavigation();
});
