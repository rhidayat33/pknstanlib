/* ============================================
   Home.js — Home Page Logic
   Dashboard E-Resources PKN STAN
   ============================================ */

let homeCharts = {};

// ============ Trivia / Tips Carousel ============
const TRIVIA_LIST = [
  "E-Resources PKN STAN menyediakan akses ribuan jurnal bereputasi Scopus & WoS via Emerald Insight.",
  "LSEG Workspace menyediakan data pasar finansial global, saham, dan ESG score terlengkap untuk riset Anda.",
  "Software STATA berlisensi resmi tersedia di laboratorium komputer perpustakaan untuk analisis ekonometrika.",
  "Ringkasan similaritas menggunakan skor yang tercatat dalam laporan sumber.",
  "Akses e-resources dapat digunakan oleh seluruh dosen dan mahasiswa aktif secara gratis.",
  "Pemberitahuan hasil uji similaritas KTI diproses secara transparan dan terdata di sistem perpustakaan.",
  "Tips: Anda dapat melihat rincian setiap layanan melalui menu navigasi di sebelah kiri."
];

let triviaInterval = null;
function startTriviaCarousel() {
  const triviaEl = document.getElementById('loading-trivia');
  if (!triviaEl) return;
  let idx = 0;
  triviaInterval = setInterval(() => {
    idx = (idx + 1) % TRIVIA_LIST.length;
    triviaEl.style.opacity = '0';
    setTimeout(() => {
      triviaEl.textContent = TRIVIA_LIST[idx];
      triviaEl.style.opacity = '1';
    }, 300);
  }, 3200);
}

function stopTriviaCarousel() {
  if (triviaInterval) {
    clearInterval(triviaInterval);
    triviaInterval = null;
  }
}

// ============ Loading Screen & Pipeline Helpers ============
function updatePipelineItem(id, statusText, isDone) {
  const item = document.getElementById('pipe-' + id);
  const statusEl = document.getElementById('status-' + id);
  const indEl = document.getElementById('ind-' + id);
  if (statusEl) statusEl.textContent = statusText;
  if (isDone && item) {
    item.classList.add('loaded');
    if (indEl) indEl.innerHTML = '<span style="color:#10b981;font-weight:800;font-size:14px;">✓</span>';
  }
}

function updateLoadingProgress(pct, statusText, orbIcon) {
  const bar = document.getElementById('loading-progress');
  const pctEl = document.getElementById('loading-pct');
  const statusEl = document.getElementById('loading-status');
  const iconEl = document.getElementById('loading-orb-icon');

  if (bar) bar.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';
  if (statusEl && statusText) statusEl.textContent = statusText;
  if (iconEl && orbIcon) iconEl.textContent = orbIcon;
}

let isOverlayDismissed = false;
function hideLoadingOverlay() {
  if (isOverlayDismissed) return;
  isOverlayDismissed = true;
  stopTriviaCarousel();
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.add('fade-out');
    setTimeout(() => overlay.remove(), 600);
  }
}

function forceEnterDashboard() {
  hideLoadingOverlay();
}

function setSyncStatus(state, text) {
  const badge = document.getElementById('sync-badge');
  const txt = document.getElementById('sync-text');
  if (!badge || !txt) return;
  if (state === 'syncing') {
    badge.className = 'sync-badge syncing';
    txt.textContent = text || 'Menyinkronkan data...';
  } else {
    badge.className = 'sync-badge ' + (state === 'warning' ? 'sync-warning' : '');
    txt.textContent = text || 'Data Terkini ✓';
  }
}

function checkExistingCache() {
  return !!(
    localStorage.getItem(API_CACHE_KEY_PREFIX + 'ejournal') ||
    localStorage.getItem(API_CACHE_KEY_PREFIX + 'lseg') ||
    localStorage.getItem(API_CACHE_KEY_PREFIX + 'stata') ||
    localStorage.getItem(API_CACHE_KEY_PREFIX + 'kti')
  );
}

// ============ Main Entry Point (Stale-While-Revalidate) ============
document.addEventListener('DOMContentLoaded', () => {
  // Render sidebar
  document.getElementById('sidebar').innerHTML = getSidebarHTML('home');

  const hasCache = checkExistingCache();

  if (hasCache) {
    // FAST PATH: Hydrate immediately from cache in <30ms!
    hydrateFromCachedData();
    // Dismiss loading overlay immediately
    hideLoadingOverlay();
    setSyncStatus('syncing', 'Menyinkronkan data terbaru...');
    // Revalidate in background
    loadHomeData(true /* isBackground */);
  } else {
    // FIRST TIME: Show attractive interactive pipeline loading screen
    startTriviaCarousel();
    document.querySelectorAll('.stat-card').forEach(card => card.classList.add('skeleton-loading'));
    setSyncStatus('syncing', 'Mengambil data awal...');
    loadHomeData(false /* isForeground */);
  }
});

function hydrateFromCachedData() {
  const ej = loadEjournalFromCache();
  const lseg = loadLSEGFromCache();
  const stata = loadSTATAFromCache();
  const kti = loadKTIFromCache();
  updateDashboardUI(ej, lseg, stata, kti, false /* do not animate counter on instant hydration */);
}

function updateDashboardUI(ejData, lsegData, stataData, ktiData, animate = true) {
  // Remove skeleton state
  document.querySelectorAll('.stat-card').forEach(card => card.classList.remove('skeleton-loading'));

  const ejTotal = ejData ? ejData.totalAccess : null;
  const lsegTotal = lsegData ? lsegData.totalUsers : null;
  const stataTotal = stataData ? stataData.totalUsers : null;
  const ktiTotal = ktiData ? ktiData.totalPengajuan : null;

  const updateVal = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (val !== null && val !== undefined) {
      if (animate) animateCounter(el, val);
      else el.textContent = formatNumberFull(val);
    } else {
      el.textContent = '—';
    }
  };

  updateVal('stat-ejournal-val', ejTotal);
  updateVal('stat-lseg-val', lsegTotal);
  updateVal('stat-stata-val', stataTotal);
  updateVal('stat-kti-val', ktiTotal);

  const subBadge = document.getElementById('stat-kti-subbadge');
  if (subBadge && ktiData && ktiData.avgSim) {
    subBadge.textContent = `Rerata ${ktiData.avgSim}%`;
    subBadge.style.display = 'inline-block';
  } else if (subBadge) {
    subBadge.style.display = 'none';
  }

  const availableSources = [ejData, lsegData, stataData, ktiData].filter(Boolean).length;
  const grandTotal = ejTotal + lsegTotal + stataTotal + ktiTotal;
  updateVal('stat-total-val', availableSources ? grandTotal : null);
  const totalLabel = document.querySelector('#stat-total .stat-label');
  if (totalLabel) totalLabel.textContent = availableSources === 4 ? 'Total Aktivitas Layanan' : 'Aktivitas dari ' + availableSources + '/4 Sumber';

  // Update timestamp
  const timestamps = Object.values(sourceStates).map(source => source.timestamp).filter(Number.isFinite);
  const now = timestamps.length ? new Date(Math.min(...timestamps)) : null;
  const lastUpdatedEl = document.getElementById('last-updated');
  if (lastUpdatedEl && !now) lastUpdatedEl.textContent = 'Belum ada data tersimpan';
  if (lastUpdatedEl && now) {
    lastUpdatedEl.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
      Data terupdate: ${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
    `;
  }

  // Render Charts
  requestAnimationFrame(() => {
    renderOverviewChart(ejData, lsegData, stataData, ktiData);
    renderHomeKTISummary(ktiData);
    renderTopJournalsChart(ejData);
    renderUserDistChart(lsegData, stataData);
  });
}

// ============ Data Fetching Orchestrator ============
async function loadHomeData(isBackground = false, force = false) {
  if (!isBackground) {
    updateLoadingProgress(10, 'Menghubungkan ke server...');
  }

  let completed = 0;
  const total = 4;
  let currentEJ = loadEjournalFromCache();
  let currentLSEG = loadLSEGFromCache();
  let currentSTATA = loadSTATAFromCache();
  let currentKTI = loadKTIFromCache();

  function onSourceDone(sourceKey, data) {
    completed++;
    const pct = Math.min(100, Math.round((completed / total) * 100));

    if (!isBackground) {
      updateLoadingProgress(pct, `Sinkronisasi data (${completed}/${total})...`);
    }

    if (sourceKey === 'ejournal') {
      currentEJ = data;
      const count = data ? data.totalAccess : 0;
      updatePipelineItem('ejournal', count > 0 ? `✓ ${formatNumber(count)} Akses` : '✓ Selesai', true);
      const cardVal = document.getElementById('stat-ejournal-val');
      if (cardVal && count > 0) animateCounter(cardVal, count);
      document.getElementById('stat-ejournal')?.classList.remove('skeleton-loading');
      if (data) renderTopJournalsChart(data);
    } else if (sourceKey === 'lseg') {
      currentLSEG = data;
      const count = data ? data.totalUsers : 0;
      updatePipelineItem('lseg', count > 0 ? `✓ ${count} Penggunaan` : '✓ Selesai', true);
      const cardVal = document.getElementById('stat-lseg-val');
      if (cardVal && count > 0) animateCounter(cardVal, count);
      document.getElementById('stat-lseg')?.classList.remove('skeleton-loading');
      if (currentLSEG && currentSTATA) renderUserDistChart(currentLSEG, currentSTATA);
    } else if (sourceKey === 'stata') {
      currentSTATA = data;
      const count = data ? data.totalUsers : 0;
      updatePipelineItem('stata', count > 0 ? `✓ ${count} Penggunaan` : '✓ Selesai', true);
      const cardVal = document.getElementById('stat-stata-val');
      if (cardVal && count > 0) animateCounter(cardVal, count);
      document.getElementById('stat-stata')?.classList.remove('skeleton-loading');
      if (currentLSEG && currentSTATA) renderUserDistChart(currentLSEG, currentSTATA);
    } else if (sourceKey === 'kti') {
      currentKTI = data;
      const count = data ? data.totalPengajuan : 0;
      updatePipelineItem('kti', count > 0 ? `✓ ${count} Dokumen` : '✓ Selesai', true);
      const cardVal = document.getElementById('stat-kti-val');
      if (cardVal && count > 0) animateCounter(cardVal, count);
      document.getElementById('stat-kti')?.classList.remove('skeleton-loading');
      if (data) renderHomeKTISummary(data);
    }

    // Dynamic grand total update
    const grandTotal = (currentEJ?.totalAccess || 0) + (currentLSEG?.totalUsers || 0) + (currentSTATA?.totalUsers || 0) + (currentKTI?.totalPengajuan || 0);
    const totalEl = document.getElementById('stat-total-val');
    if (totalEl && grandTotal > 0) animateCounter(totalEl, grandTotal);
    document.getElementById('stat-total')?.classList.remove('skeleton-loading');

    // Early dismiss: if 3 or 4 are completed and in foreground, dismiss smoothly!
    if (!isBackground && completed >= 3) {
      setTimeout(() => hideLoadingOverlay(), 400);
    }
  }

  // Safety timer: maximum wait 5.5s before revealing dashboard
  if (!isBackground) {
    setTimeout(() => {
      if (!isOverlayDismissed) {
        updateLoadingProgress(100, 'Membuka dashboard...');
        hideLoadingOverlay();
      }
    }, 5500);
  }

  // Parallel fetch all 4 endpoints
  const ejPromise = loadEjournalSummary(force).then(res => { onSourceDone('ejournal', res); return res; });
  const lsegPromise = loadLSEGSummary(force).then(res => { onSourceDone('lseg', res); return res; });
  const stataPromise = loadSTATASummary(force).then(res => { onSourceDone('stata', res); return res; });
  const ktiPromise = loadKTISummary(force).then(res => { onSourceDone('kti', res); return res; });

  const [ejRes, lsegRes, stataRes, ktiRes] = await Promise.allSettled([
    ejPromise, lsegPromise, stataPromise, ktiPromise
  ]);

  const finalEJ = ejRes.status === 'fulfilled' ? ejRes.value : currentEJ;
  const finalLSEG = lsegRes.status === 'fulfilled' ? lsegRes.value : currentLSEG;
  const finalSTATA = stataRes.status === 'fulfilled' ? stataRes.value : currentSTATA;
  const finalKTI = ktiRes.status === 'fulfilled' ? ktiRes.value : currentKTI;

  // Final UI sync and chart refresh
  updateDashboardUI(finalEJ, finalLSEG, finalSTATA, finalKTI, true);
  const states = Object.values(sourceStates);
  const failed = states.filter(source => ['stale', 'error'].includes(source.state)).length;
  const cached = states.some(source => source.state === 'cache');
  setSyncStatus(failed ? 'warning' : 'done', failed ? failed + ' sumber belum diperbarui' : cached ? 'Menampilkan data tersimpan' : 'Semua sumber berhasil diperbarui');
  hideLoadingOverlay();
}

// ============ Load E-Journal Summary ============
async function loadEjournalSummary(force = false) {
  const apiUrl = getStoredApiUrl('ejournal');
  if (!apiUrl) return loadEjournalFromCache();

  try {
    const data = await fetchWithCache(apiUrl, 'ejournal', { force });
    return processEjournalData(data);
  } catch (e) {
    return loadEjournalFromCache();
  }
}

function loadEjournalFromCache() {
  const cached = getCachedData('ejournal');
  if (!cached) return null;
  try {
    const { data, timestamp, isExpired } = cached;
    if (!sourceStates['ejournal']) setSourceState('ejournal', isExpired ? 'stale' : 'cache', timestamp);
    return processEjournalData(data);
  } catch (e) {
    return null;
  }
}

function processEjournalData(data) {
  if (!data || !data.journals || !Array.isArray(data.journals)) return null;
  const journals = data.journals;

  // Calculate total access (Total_Item_Requests only)
  let totalAccess = 0;
  const monthlyTotals = {};

  journals.forEach(j => {
    if (j.metricType === 'Total_Item_Requests') {
      totalAccess += Number(j.total) || 0;
      if (j.monthly) {
        Object.entries(j.monthly).forEach(([month, val]) => {
          const normMonth = normalizeMonthLabel(month);
          monthlyTotals[normMonth] = (monthlyTotals[normMonth] || 0) + (Number(val) || 0);
        });
      }
    }
  });

  // Top journals
  const topJournals = journals
    .filter(j => j.metricType === 'Total_Item_Requests')
    .sort((a, b) => (b.total || 0) - (a.total || 0))
    .slice(0, 10);

  return {
    totalAccess,
    monthlyTotals,
    topJournals,
    totalJournals: journals.filter(j => j.metricType === 'Total_Item_Requests').length
  };
}

// ============ Load LSEG Summary ============
async function loadLSEGSummary(force = false) {
  const apiUrl = getStoredApiUrl('lseg');
  if (!apiUrl) return loadLSEGFromCache();

  try {
    const data = await fetchWithCache(apiUrl, 'lseg', { force });
    return processLSEGData(data);
  } catch (e) {
    return loadLSEGFromCache();
  }
}

function loadLSEGFromCache() {
  const cached = getCachedData('lseg');
  if (!cached) return null;
  try {
    const { data, timestamp, isExpired } = cached;
    if (!sourceStates['lseg']) setSourceState('lseg', isExpired ? 'stale' : 'cache', timestamp);
    return processLSEGData(data);
  } catch (e) {
    return null;
  }
}

function processLSEGData(data) {
  data = Array.isArray(data) ? data : data?.data;
  if (!Array.isArray(data)) return null;
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
async function loadSTATASummary(force = false) {
  const apiUrl = getStoredApiUrl('stata');
  if (!apiUrl) return loadSTATAFromCache();

  try {
    const data = await fetchWithCache(apiUrl, 'stata', { force });
    return processSTATAData(data);
  } catch (e) {
    return loadSTATAFromCache();
  }
}

function loadSTATAFromCache() {
  const cached = getCachedData('stata');
  if (!cached) return null;
  try {
    const { data, timestamp, isExpired } = cached;
    if (!sourceStates['stata']) setSourceState('stata', isExpired ? 'stale' : 'cache', timestamp);
    return processSTATAData(data);
  } catch (e) {
    return null;
  }
}

function processSTATAData(data) {
  data = Array.isArray(data) ? data : data?.data;
  if (!Array.isArray(data)) return null;
  const totalUsers = data.length;

  const monthlyTotals = {};
  data.forEach(row => {
    const date = parseDate(row.timestamp || row.date || row[5]);
    if (date) {
      const key = getMonthYear(date);
      if (key) monthlyTotals[key] = (monthlyTotals[key] || 0) + 1;
    }
  });

  const userCategories = countBy(data, row => classifyUser(row.nipnim || row.nip_nim_nik || row[1]));

  return { totalUsers, monthlyTotals, userCategories };
}

// ============ Load KTI Summary ============
async function loadKTISummary(force = false) {
  const apiUrl = getStoredApiUrl('kti');
  if (!apiUrl) return loadKTIFromCache();

  try {
    const data = await fetchWithCache(apiUrl, 'kti', { force });
    return processKTIData(data);
  } catch (e) {
    return loadKTIFromCache();
  }
}

function loadKTIFromCache() {
  const cached = getCachedData('kti');
  if (!cached) return null;
  try {
    const { data, timestamp, isExpired } = cached;
    if (!sourceStates['kti']) setSourceState('kti', isExpired ? 'stale' : 'cache', timestamp);
    return processKTIData(data);
  } catch (e) {
    return null;
  }
}

function processKTIRow(row) { return normalizeKTIRow(row); }

function processKTIData(data) {
  const raw = Array.isArray(data) ? data : (data?.data || []);
  if (!Array.isArray(raw)) return null;

  const processed = raw.map(processKTIRow);
  const totalPengajuan = processed.length;
  const scored = processed.filter(row => Number.isFinite(row.similarity)).length;
  const unscored = processed.length - scored;

  const avgSim = averageSimilarity(processed) ?? '—';

  const monthlyTotals = {};
  processed.forEach(row => {
    const date = parseDate(row.timestamp);
    if (date) {
      const key = getMonthYear(date);
      if (key) monthlyTotals[key] = (monthlyTotals[key] || 0) + 1;
    }
  });

  return { totalPengajuan, scored, unscored, avgSim, monthlyTotals, processed };
}

// ============ Render Charts ============
function renderOverviewChart(ejData, lsegData, stataData, ktiData) {
  const canvas = document.getElementById('chart-monthly-overview');
  const emptyState = document.getElementById('overview-empty');

  const hasAnyData = ejData || lsegData || stataData || ktiData;
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
  if (ktiData && ktiData.monthlyTotals) {
    Object.keys(ktiData.monthlyTotals).forEach(m => allMonths.add(m));
  }

  const sortedMonths = Array.from(allMonths).sort((a, b) => {
    const parseMonthLabel = (label) => {
      const parts = String(label || '').split(' ');
      const monthIdx = Math.max(0, MONTH_NAMES.indexOf(parts[0]));
      const year = parseInt(parts[1], 10) || 0;
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
  if (ktiData && ktiData.monthlyTotals) {
    datasets.push({
      label: 'Uji Similaritas KTI',
      data: sortedMonths.map(m => ktiData.monthlyTotals[m] || 0),
      borderColor: CHART_COLORS.violet,
      borderWidth: 2,
      tension: 0.4,
      fill: true,
      backgroundColor: CHART_COLORS_BG.violet,
    });
  }

  canvas.style.display = 'block';
  emptyState.style.display = 'none';

  if (homeCharts.overview) homeCharts.overview.destroy();
  homeCharts.overview = createLineChart(canvas.getContext('2d'), sortedMonths, datasets);
}

function renderHomeKTISummary(ktiData) {
  const container = document.getElementById('home-kti-charts-container');
  const empty = document.getElementById('home-kti-empty');
  for (const [id, value] of [['home-kti-total', ktiData?.totalPengajuan], ['home-kti-scored', ktiData?.scored], ['home-kti-unscored', ktiData?.unscored]]) {
    const el = document.getElementById(id);
    if (el) { if (value === undefined) el.textContent = '—'; else animateCounter(el, value); }
  }
  document.getElementById('home-kti-avg').textContent = ktiData && ktiData.avgSim !== '—' ? ktiData.avgSim + '%' : '—';
  for (const key of ['scored', 'unscored']) {
    document.getElementById('home-kti-' + key + '-pct').textContent = ktiData?.totalPengajuan ? ((ktiData[key] / ktiData.totalPengajuan) * 100).toFixed(1) + '% dari total' : '—';
  }
  container.style.display = ktiData?.totalPengajuan ? 'block' : 'none';
  empty.style.display = ktiData?.totalPengajuan ? 'none' : 'flex';
  if (homeCharts.ktiDist) homeCharts.ktiDist.destroy();
  if (!ktiData?.totalPengajuan) return;
  const distribution = similarityDistribution(ktiData.processed);
  homeCharts.ktiDist = new Chart(document.getElementById('chart-home-kti-dist').getContext('2d'), {
    type: 'bar', data: { labels: distribution.labels, datasets: [{ label: 'Jumlah Pemeriksaan', data: distribution.counts, backgroundColor: CHART_COLORS_ALPHA.indigo, borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
  });
}

function renderTopJournalsChart(ejData) {
  const canvas = document.getElementById('chart-top-journals');
  const emptyState = document.getElementById('journals-empty');

  if (!ejData || !ejData.topJournals || ejData.topJournals.length === 0) {
    canvas.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }

  canvas.style.display = 'block';
  emptyState.style.display = 'none';

  const labels = ejData.topJournals.map(j => j.title);
  const data = ejData.topJournals.map(j => j.total);

  if (homeCharts.topJournals) homeCharts.topJournals.destroy();
  homeCharts.topJournals = createHorizontalBarChart(
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

  canvas.style.display = 'block';
  emptyState.style.display = 'none';

  const labels = Object.keys(combined);
  const data = Object.values(combined);
  const colors = [CHART_COLORS.indigo, CHART_COLORS.cyan, CHART_COLORS.amber];

  if (homeCharts.userDist) homeCharts.userDist.destroy();
  homeCharts.userDist = createDoughnutChart(canvas.getContext('2d'), labels, data, colors);
}

