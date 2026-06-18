/* ============================================
   Home.js — Home Page Logic
   Dashboard E-Resources PKN STAN
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Render sidebar
  document.getElementById('sidebar').innerHTML = getSidebarHTML('home');

  // Load data
  loadHomeData();
});

async function loadHomeData() {
  const ejournalData = loadEjournalSummary();
  const lsegData = await loadLSEGSummary();
  const stataData = await loadSTATASummary();

  // Update stats
  const ejTotal = ejournalData ? ejournalData.totalAccess : 0;
  const lsegTotal = lsegData ? lsegData.totalUsers : 0;
  const stataTotal = stataData ? stataData.totalUsers : 0;

  if (ejTotal > 0) animateCounter(document.getElementById('stat-ejournal-val'), ejTotal);
  else document.getElementById('stat-ejournal-val').textContent = '—';

  if (lsegTotal > 0) animateCounter(document.getElementById('stat-lseg-val'), lsegTotal);
  else document.getElementById('stat-lseg-val').textContent = '—';

  if (stataTotal > 0) animateCounter(document.getElementById('stat-stata-val'), stataTotal);
  else document.getElementById('stat-stata-val').textContent = '—';

  const grandTotal = ejTotal + lsegTotal + stataTotal;
  if (grandTotal > 0) animateCounter(document.getElementById('stat-total-val'), grandTotal);
  else document.getElementById('stat-total-val').textContent = '—';

  // Update last updated
  const now = new Date();
  document.getElementById('last-updated').innerHTML = `
    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
    Terakhir diperbarui: ${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
  `;

  // Render charts
  renderOverviewChart(ejournalData, lsegData, stataData);
  renderTopJournalsChart(ejournalData);
  renderUserDistChart(lsegData, stataData);
}

// ============ Load E-Journal Summary from localStorage ============
function loadEjournalSummary() {
  const stored = localStorage.getItem('ejournal_data');
  if (!stored) return null;

  try {
    const data = JSON.parse(stored);
    const journals = data.journals || [];

    // Calculate total access (Total_Item_Requests only)
    let totalAccess = 0;
    const monthlyTotals = {};

    journals.forEach(j => {
      if (j.metricType === 'Total_Item_Requests') {
        totalAccess += j.total || 0;
        if (j.monthly) {
          Object.entries(j.monthly).forEach(([month, val]) => {
            monthlyTotals[month] = (monthlyTotals[month] || 0) + val;
          });
        }
      }
    });

    // Top journals
    const topJournals = journals
      .filter(j => j.metricType === 'Total_Item_Requests')
      .sort((a, b) => (b.total || 0) - (a.total || 0))
      .slice(0, 10);

    return { totalAccess, monthlyTotals, topJournals, totalJournals: journals.filter(j => j.metricType === 'Total_Item_Requests').length };
  } catch (e) {
    return null;
  }
}

// ============ Load LSEG Summary ============
async function loadLSEGSummary() {
  const apiUrl = getStoredApiUrl('lseg');
  if (!apiUrl) return loadLSEGFromCache();

  try {
    const data = await fetchWithCache(apiUrl, 'lseg');
    return processLSEGData(data);
  } catch (e) {
    return loadLSEGFromCache();
  }
}

function loadLSEGFromCache() {
  const cached = localStorage.getItem(API_CACHE_KEY_PREFIX + 'lseg');
  if (!cached) return null;
  try {
    const { data } = JSON.parse(cached);
    return processLSEGData(data);
  } catch (e) {
    return null;
  }
}

function processLSEGData(data) {
  if (!data || !Array.isArray(data)) return null;
  const totalUsers = data.length;

  // Monthly breakdown from date column
  const monthlyTotals = {};
  data.forEach(row => {
    const date = parseDate(row.tanggal || row.date || row[3]); // col H
    if (date) {
      const key = getMonthYear(date);
      if (key) monthlyTotals[key] = (monthlyTotals[key] || 0) + 1;
    }
  });

  // User categories
  const userCategories = countBy(data, row => classifyUser(row.nipnim || row.nip_nim || row[0]));

  return { totalUsers, monthlyTotals, userCategories };
}

// ============ Load STATA Summary ============
async function loadSTATASummary() {
  const apiUrl = getStoredApiUrl('stata');
  if (!apiUrl) return loadSTATAFromCache();

  try {
    const data = await fetchWithCache(apiUrl, 'stata');
    return processSTATAData(data);
  } catch (e) {
    return loadSTATAFromCache();
  }
}

function loadSTATAFromCache() {
  const cached = localStorage.getItem(API_CACHE_KEY_PREFIX + 'stata');
  if (!cached) return null;
  try {
    const { data } = JSON.parse(cached);
    return processSTATAData(data);
  } catch (e) {
    return null;
  }
}

function processSTATAData(data) {
  if (!data || !Array.isArray(data)) return null;
  const totalUsers = data.length;

  const monthlyTotals = {};
  data.forEach(row => {
    const date = parseDate(row.timestamp || row.date || row[0]);
    if (date) {
      const key = getMonthYear(date);
      if (key) monthlyTotals[key] = (monthlyTotals[key] || 0) + 1;
    }
  });

  const userCategories = countBy(data, row => classifyUser(row.nipnim || row.nip_nim_nik || row[1]));

  return { totalUsers, monthlyTotals, userCategories };
}

// ============ Render Charts ============
function renderOverviewChart(ejData, lsegData, stataData) {
  const canvas = document.getElementById('chart-monthly-overview');
  const emptyState = document.getElementById('overview-empty');

  const hasAnyData = ejData || lsegData || stataData;
  if (!hasAnyData) {
    canvas.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }

  // Collect all month labels from all sources
  const allMonths = new Set();

  if (ejData && ejData.monthlyTotals) {
    Object.keys(ejData.monthlyTotals).forEach(m => allMonths.add(m));
  }
  if (lsegData && lsegData.monthlyTotals) {
    Object.keys(lsegData.monthlyTotals).forEach(m => allMonths.add(m));
  }
  if (stataData && stataData.monthlyTotals) {
    Object.keys(stataData.monthlyTotals).forEach(m => allMonths.add(m));
  }

  // Sort months chronologically
  const sortedMonths = Array.from(allMonths).sort((a, b) => {
    const parseMonthLabel = (label) => {
      const parts = label.split(' ');
      const monthIdx = MONTH_NAMES.indexOf(parts[0]);
      const year = parseInt(parts[1]);
      return year * 12 + monthIdx;
    };
    return parseMonthLabel(a) - parseMonthLabel(b);
  });

  if (sortedMonths.length === 0) {
    canvas.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }

  const datasets = [];
  if (ejData && ejData.monthlyTotals) {
    datasets.push({
      label: 'E-Journal',
      data: sortedMonths.map(m => ejData.monthlyTotals[m] || 0),
      backgroundColor: CHART_COLORS.indigo,
      borderColor: CHART_COLORS.indigo,
      borderWidth: 2,
      tension: 0.4,
      fill: true,
      backgroundColor: CHART_COLORS_BG.indigo,
    });
  }
  if (lsegData && lsegData.monthlyTotals) {
    datasets.push({
      label: 'LSEG',
      data: sortedMonths.map(m => lsegData.monthlyTotals[m] || 0),
      borderColor: CHART_COLORS.cyan,
      borderWidth: 2,
      tension: 0.4,
      fill: true,
      backgroundColor: CHART_COLORS_BG.cyan,
    });
  }
  if (stataData && stataData.monthlyTotals) {
    datasets.push({
      label: 'STATA',
      data: sortedMonths.map(m => stataData.monthlyTotals[m] || 0),
      borderColor: CHART_COLORS.emerald,
      borderWidth: 2,
      tension: 0.4,
      fill: true,
      backgroundColor: CHART_COLORS_BG.emerald,
    });
  }

  createLineChart(canvas.getContext('2d'), sortedMonths, datasets);
}

function renderTopJournalsChart(ejData) {
  const canvas = document.getElementById('chart-top-journals');
  const emptyState = document.getElementById('journals-empty');

  if (!ejData || !ejData.topJournals || ejData.topJournals.length === 0) {
    canvas.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }

  const labels = ejData.topJournals.map(j => j.title);
  const data = ejData.topJournals.map(j => j.total);

  createHorizontalBarChart(
    canvas.getContext('2d'),
    labels,
    data,
    CHART_COLORS.indigo
  );
}

function renderUserDistChart(lsegData, stataData) {
  const canvas = document.getElementById('chart-user-dist');
  const emptyState = document.getElementById('user-dist-empty');

  const combined = {};
  if (lsegData && lsegData.userCategories) {
    Object.entries(lsegData.userCategories).forEach(([k, v]) => {
      combined[k] = (combined[k] || 0) + v;
    });
  }
  if (stataData && stataData.userCategories) {
    Object.entries(stataData.userCategories).forEach(([k, v]) => {
      combined[k] = (combined[k] || 0) + v;
    });
  }

  if (Object.keys(combined).length === 0) {
    canvas.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }

  const labels = Object.keys(combined);
  const data = Object.values(combined);
  const colors = [CHART_COLORS.indigo, CHART_COLORS.cyan, CHART_COLORS.amber];

  createDoughnutChart(canvas.getContext('2d'), labels, data, colors);
}
