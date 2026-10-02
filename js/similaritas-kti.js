/* Uji Similaritas KTI: report counts and numeric scores only. */
let ktiRawData = [];
let ktiProcessedCache = null;
let ktiCharts = {};
let ktiCurrentPage = 1;
let ktiSearchQuery = '';
const KTI_PAGE_SIZE = 20;
const KTI_SECTIONS = ['kti-hero', 'kti-stats', 'kti-filters', 'kti-charts', 'kti-period-card', 'kti-table-card'];

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('sidebar').innerHTML = getSidebarHTML('kti');
  const url = getStoredApiUrl('kti');
  if (url) { document.getElementById('api-url-input').value = url; fetchData(url); }
  else document.getElementById('kti-empty').style.display = 'flex';
  document.getElementById('kti-filter-year').addEventListener('change', onFilterChange);
  document.getElementById('kti-filter-month').addEventListener('change', onFilterChange);
  document.getElementById('kti-period-view').addEventListener('change', () => renderPeriodTable(getFilteredData()));
});

async function saveAndFetch() {
  const url = document.getElementById('api-url-input').value.trim();
  try { setStoredApiUrl('kti', url); } catch (error) { showToast(error.message, 'error'); return; }
  await fetchData(url, true);
}

async function fetchData(url, force = false) {
  document.getElementById('loading').style.display = 'flex';
  document.getElementById('kti-empty').style.display = 'none';
  KTI_SECTIONS.forEach(id => document.getElementById(id).style.display = 'none');
  try {
    const data = await fetchWithCache(url, 'kti', { force });
    ktiRawData = Array.isArray(data) ? data : (data.data || []);
    ktiProcessedCache = null;
    populateFilters();
    renderAll();
    if (sourceStates.kti?.state !== 'stale') showToast('Berhasil mengambil ' + ktiRawData.length + ' baris pemeriksaan', 'success');
  } catch (error) {
    document.getElementById('kti-empty').style.display = 'flex';
    document.getElementById('config-panel').style.display = 'block';
    showToast('Gagal mengambil data: ' + error.message, 'error');
    console.error(error);
  } finally { document.getElementById('loading').style.display = 'none'; }
}

function processRow(row) { return normalizeKTIRow(row); }
function getProcessedData() {
  if (!ktiProcessedCache) ktiProcessedCache = ktiRawData.map(processRow);
  return ktiProcessedCache;
}
function getFilteredData() {
  const year = document.getElementById('kti-filter-year').value;
  const month = document.getElementById('kti-filter-month').value;
  const query = ktiSearchQuery.trim().toLowerCase();
  return getProcessedData().filter(row => {
    const date = parseDate(row.timestamp);
    if (year !== 'all' && (!date || date.getFullYear() !== Number(year))) return false;
    if (month !== 'all' && (!date || date.getMonth() + 1 !== Number(month))) return false;
    return !query || row.nama.toLowerCase().includes(query);
  });
}
function populateFilters() {
  const yearSelect = document.getElementById('kti-filter-year');
  const monthSelect = document.getElementById('kti-filter-month');
  const year = yearSelect.value;
  const month = monthSelect.value;
  const years = summarizeKTIPeriods(getProcessedData(), 'year').map(group => group.key);
  yearSelect.innerHTML = '<option value="all">Semua Tahun</option>' + years.map(value => '<option value="' + value + '">' + value + '</option>').join('');
  yearSelect.value = years.includes(year) ? year : 'all';
  monthSelect.innerHTML = '<option value="all">Semua Bulan</option>' + MONTH_NAMES_FULL.map((label, index) => '<option value="' + (index + 1) + '">' + label + '</option>').join('');
  monthSelect.value = month || 'all';
}
function onFilterChange() { ktiCurrentPage = 1; renderAll(); }
function onKtiSearch() { ktiSearchQuery = document.getElementById('kti-search').value; ktiCurrentPage = 1; renderAll(); }

function renderAll() {
  const data = getFilteredData();
  KTI_SECTIONS.forEach(id => document.getElementById(id).style.display = '');
  const scored = data.filter(row => Number.isFinite(row.similarity)).length;
  const missingDates = data.filter(row => !parseDate(row.timestamp)).length;
  const average = averageSimilarity(data);
  const averageLabel = average === null ? '—' : average + '%';
  const note = document.getElementById('kti-source-note');
  note.hidden = false;
  note.textContent = 'Satu baris laporan dihitung sebagai satu pemeriksaan. Rata-rata memakai ' + scored + ' skor numerik yang tersedia. ' + missingDates + ' baris tanpa tanggal valid tidak masuk grafik dan rekap periode.';
  animateCounter(document.getElementById('kti-total'), data.length);
  animateCounter(document.getElementById('kti-scored'), scored);
  animateCounter(document.getElementById('kti-unscored'), data.length - scored);
  document.getElementById('kti-avg-similarity').textContent = averageLabel;
  document.getElementById('hero-total').textContent = formatNumberFull(data.length);
  document.getElementById('hero-avg').textContent = averageLabel;
  Object.values(ktiCharts).forEach(chart => chart.destroy());
  ktiCharts = {};
  renderPeriodChart(data, 'month', 'chart-kti-monthly');
  renderPeriodChart(data, 'year', 'chart-kti-yearly');
  const distribution = similarityDistribution(data);
  ktiCharts.distribution = createBarChart(document.getElementById('chart-kti-distribution').getContext('2d'), distribution.labels,
    [{ label: 'Jumlah Pemeriksaan', data: distribution.counts, backgroundColor: CHART_COLORS_ALPHA.indigo, borderRadius: 6 }],
    { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } });
  renderPeriodTable(data);
  ktiCurrentPage = 1;
  renderTable(data);
}
function renderPeriodChart(data, granularity, id) {
  const groups = summarizeKTIPeriods(data, granularity);
  ktiCharts[granularity] = createBarChart(document.getElementById(id).getContext('2d'), groups.map(group => group.label),
    [{ label: 'Jumlah Pemeriksaan', data: groups.map(group => group.total), backgroundColor: CHART_COLORS_ALPHA.indigo, borderRadius: 6 }],
    { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } });
}
function renderPeriodTable(data) {
  const groups = summarizeKTIPeriods(data, document.getElementById('kti-period-view').value);
  document.getElementById('kti-period-body').innerHTML = groups.map(group => '<tr><td>' + escapeHTML(group.label) + '</td><td>' + formatNumberFull(group.total) + '</td><td>' + formatNumberFull(group.scored) + '</td><td>' + formatNumberFull(group.total - group.scored) + '</td><td>' + (group.average === null ? '—' : group.average + '%') + '</td></tr>').join('') || '<tr><td colspan="5" class="table-empty">Tidak ada data bertanggal valid untuk periode ini.</td></tr>';
}
function renderTable(data) {
  const pages = Math.ceil(data.length / KTI_PAGE_SIZE);
  ktiCurrentPage = Math.min(ktiCurrentPage, pages || 1);
  const start = (ktiCurrentPage - 1) * KTI_PAGE_SIZE;
  const rows = data.slice(start, start + KTI_PAGE_SIZE);
  document.getElementById('kti-table-body').innerHTML = rows.map((row, index) => {
    const date = parseDate(row.timestamp);
    const label = date ? date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    return '<tr><td>' + (start + index + 1) + '</td><td>' + label + '</td><td>' + escapeHTML(row.nama || '—') + '</td><td><span class="similarity-badge"><span class="dot"></span>' + (row.similarity === null ? '—' : row.similarity + '%') + '</span></td></tr>';
  }).join('') || '<tr><td colspan="4" class="table-empty">Tidak ada data yang cocok. Coba ubah atau reset filter.</td></tr>';
  document.getElementById('kti-page-info').textContent = 'Menampilkan ' + (data.length ? start + 1 : 0) + '–' + Math.min(start + KTI_PAGE_SIZE, data.length) + ' dari ' + data.length;
  renderPagination('kti-page-buttons', ktiCurrentPage, pages, page => { ktiCurrentPage = page; renderTable(getFilteredData()); });
}
