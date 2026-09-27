/* ============================================
   similaritas-kti.js — Uji Similaritas KTI Page Logic
   Dashboard E-Resources PKN STAN
   ============================================ */

let ktiRawData = [];
let ktiCharts = {};
let ktiCurrentPage = 1;
let ktiSearchQuery = '';
const KTI_PAGE_SIZE = 20;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('sidebar').innerHTML = getSidebarHTML('kti');

  const savedUrl = getStoredApiUrl('kti');
  if (savedUrl) {
    document.getElementById('api-url-input').value = savedUrl;
    fetchData(savedUrl);
  } else {
    document.getElementById('kti-empty').style.display = 'flex';
  }

  document.getElementById('kti-filter-year').addEventListener('change', onFilterChange);
  document.getElementById('kti-filter-status').addEventListener('change', onFilterChange);
});

async function saveAndFetch() {
  const url = document.getElementById('api-url-input').value.trim();
  if (!url) {
    showToast('Masukkan URL Apps Script terlebih dahulu', 'error');
    return;
  }
  try { setStoredApiUrl('kti', url); } catch (error) { showToast(error.message, 'error'); return; }

  await fetchData(url, true);
}

async function fetchData(url, force = false) {
  document.getElementById('loading').style.display = 'flex';
  document.getElementById('kti-empty').style.display = 'none';
  document.getElementById('kti-hero').style.display = 'none';
  document.getElementById('kti-stats').style.display = 'none';
  document.getElementById('kti-filters').style.display = 'none';
  document.getElementById('kti-charts').style.display = 'none';
  document.getElementById('kti-table-card').style.display = 'none';

  try {
    const data = await fetchWithCache(url, 'kti', { force });
    ktiRawData = Array.isArray(data) ? data : (data.data || []);
    ktiProcessedCache = null;



    document.getElementById('loading').style.display = 'none';
    if (sourceStates['kti']?.state !== 'stale') showToast(`Berhasil mengambil ${ktiRawData.length} data Uji Similaritas KTI`, 'success');

    populateFilters();
    renderAll();
  } catch (err) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('kti-empty').style.display = 'flex';
    document.getElementById('config-panel').style.display = 'block';
    showToast('Gagal mengambil data: ' + err.message, 'error');
    console.error(err);
  }
}

// ============ Data Processing ============
let ktiProcessedCache = null;

function processRow(row) { return normalizeKTIRow(row); }

function getProcessedData() {
  if (!ktiProcessedCache) {
    ktiProcessedCache = ktiRawData.map(processRow);
  }
  return ktiProcessedCache;
}

function getFilteredData() {
  let data = getProcessedData();
  const year   = document.getElementById('kti-filter-year').value;
  const status = document.getElementById('kti-filter-status').value;
  const q      = ktiSearchQuery.toLowerCase();

  if (year !== 'all') {
    data = data.filter(d => {
      const dt = parseDate(d.timestamp);
      return dt && getYear(dt) === parseInt(year);
    });
  }
  if (status !== 'all') data = data.filter(d => d.status === status);
  if (q) {
    data = data.filter(d =>
      d.nim.toLowerCase().includes(q) ||
      d.nama.toLowerCase().includes(q) ||
      d.judul.toLowerCase().includes(q)
    );
  }
  return data;
}

// ============ Filters ============
function populateFilters() {
  const data = getProcessedData();

  // Years
  const years = new Set();
  data.forEach(d => {
    const dt = parseDate(d.timestamp);
    if (dt) years.add(getYear(dt));
  });
  const yearOpts = ['<option value="all">Semua</option>'];
  Array.from(years).sort().forEach(y => {
    yearOpts.push(`<option value="${y}">${y}</option>`);
  });
  document.getElementById('kti-filter-year').innerHTML = yearOpts.join('');


}

function onFilterChange() { ktiCurrentPage = 1; renderAll(); }
function onKtiSearch() {
  ktiSearchQuery = document.getElementById('kti-search').value;
  ktiCurrentPage = 1;
  renderAll();
}

// ============ Render ============
function renderAll() {
  const data = getFilteredData();

  // Show elements
  document.getElementById('kti-hero').style.display = '';
  document.getElementById('kti-stats').style.display = '';
  document.getElementById('kti-filters').style.display = '';
  document.getElementById('kti-charts').style.display = '';
  document.getElementById('kti-table-card').style.display = '';
  const detailsReport = getProcessedData().some(row => row.sourceFormat === 'details-report');
  const note = document.getElementById('kti-source-note');
  note.hidden = !detailsReport;
  note.textContent = 'Sumber berupa Details Report: tanggal, nama pengguna, dan skor similaritas tersedia. NIM dan judul KTI tidak tersedia dalam laporan. Status diturunkan dari skor menurut batas dashboard.';

  // --- Stats ---
  const total    = data.length;
  const lolos    = data.filter(d => d.status === 'Lolos').length;
  const revisi   = data.filter(d => d.status === 'Revisi').length;
  const avgSim = averageSimilarity(data) ?? '—';

  animateCounter(document.getElementById('kti-total'), total);
  animateCounter(document.getElementById('kti-lolos'), lolos);
  animateCounter(document.getElementById('kti-revisi'), revisi);
  document.getElementById('kti-avg-similarity').textContent = avgSim + '%';

  // Hero badges
  document.getElementById('hero-total').textContent = total;
  document.getElementById('hero-lolos').textContent = lolos;
  document.getElementById('hero-avg').textContent   = avgSim + '%';

  // Donut label
  document.getElementById('donut-avg').textContent = avgSim + '%';

  // --- Charts ---
  Object.values(ktiCharts).forEach(c => c && c.destroy && c.destroy());
  ktiCharts = {};

  renderMonthlyChart(data);
  renderStatusChart(data);
  renderDistributionChart(data);

  // --- Table ---
  ktiCurrentPage = 1;
  renderTable(data);
}

// ===== Chart: Monthly Trend =====
function renderMonthlyChart(data) {
  const monthly = countBy(data, d => {
    const dt = parseDate(d.timestamp);
    return dt ? getMonthYear(dt) : null;
  });
  delete monthly['null'];
  delete monthly['Tidak Diketahui'];

  const sorted = sortMonthYearEntries(Object.entries(monthly));

  const labels = sorted.map(s => s[0]);
  const values = sorted.map(s => s[1]);

  const ctx = document.getElementById('chart-kti-monthly').getContext('2d');
  ktiCharts.monthly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Jumlah Pengajuan',
        data: values,
        backgroundColor: 'rgba(99, 102, 241, 0.75)',
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } },
        x: { ticks: { maxRotation: 45 } },
      },
    },
  });
}

// ===== Chart: Per Prodi =====


// ===== Chart: Status Doughnut =====
function renderStatusChart(data) {
  const lolos     = data.filter(d => d.status === 'Lolos').length;
  const revisi    = data.filter(d => d.status === 'Revisi').length;
  const tidakLolos = data.filter(d => d.status === 'Tidak Lolos').length;
  const labels = ['Lolos', 'Revisi', 'Tidak Lolos', 'Proses / lainnya'];
  const values = [lolos, revisi, tidakLolos, data.length - lolos - revisi - tidakLolos];
  const colors = ['rgba(16,185,129,0.85)', 'rgba(245,158,11,0.85)', 'rgba(244,63,94,0.85)', '#94a3b8'];

  const ctx = document.getElementById('chart-kti-status').getContext('2d');
  ktiCharts.status = createDoughnutChart(ctx, labels, values, colors);
}

// ===== Chart: Similarity Distribution =====
function renderDistributionChart(data) {
  // Bucket: 0-10, 11-20, 21-30, 31-40, 41-50, 51-60, 61-70, 71-80, 81-100
  const buckets = ['0–10%', '11–20%', '21–30%', '31–40%', '41–50%', '51–60%', '61–70%', '71–80%', '81–100%'];
  const counts  = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  const bgColors = [
    'rgba(16,185,129,0.7)', 'rgba(16,185,129,0.7)', 'rgba(16,185,129,0.7)', // Lolos (green)
    'rgba(245,158,11,0.7)', 'rgba(245,158,11,0.7)',                           // Revisi (amber)
    'rgba(244,63,94,0.7)',  'rgba(244,63,94,0.7)',  'rgba(244,63,94,0.7)',    // Tidak Lolos (red)
    'rgba(244,63,94,0.7)',
  ];

  data.forEach(d => {
    const s = d.similarity;
    if (!Number.isFinite(s)) return;
    if (s <= 10)       counts[0]++;
    else if (s <= 20)  counts[1]++;
    else if (s <= 30)  counts[2]++;
    else if (s <= 40)  counts[3]++;
    else if (s <= 50)  counts[4]++;
    else if (s <= 60)  counts[5]++;
    else if (s <= 70)  counts[6]++;
    else if (s <= 80)  counts[7]++;
    else               counts[8]++;
  });

  const ctx = document.getElementById('chart-kti-distribution').getContext('2d');
  ktiCharts.distribution = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: buckets,
      datasets: [{
        label: 'Jumlah KTI',
        data: counts,
        backgroundColor: bgColors,
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            afterLabel: (item) => {
              const total = counts.reduce((a, b) => a + b, 0);
              const pct = total ? ((item.raw / total) * 100).toFixed(1) : 0;
              return `(${pct}% dari total)`;
            },
          },
        },
      },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } },
        x: { ticks: { maxRotation: 0 } },
      },
    },
  });
}

// ===== Chart: Average Similarity per Prodi =====


// ============ Table ============
function renderTable(data) {
  const totalPages = Math.ceil(data.length / KTI_PAGE_SIZE);
  ktiCurrentPage = Math.min(ktiCurrentPage, totalPages || 1);

  const start    = (ktiCurrentPage - 1) * KTI_PAGE_SIZE;
  const pageData = data.slice(start, start + KTI_PAGE_SIZE);

  const tbody = document.getElementById('kti-table-body');
  tbody.innerHTML = pageData.map((d, i) => {
    const dt  = parseDate(d.timestamp);
    const dateStr = dt ? dt.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }) : (d.timestamp || '—');

    // Similarity badge
    const simClass = d.similarity <= 30 ? 'low' : d.similarity <= 50 ? 'medium' : 'high';
    const simBadge = `<span class="similarity-badge ${simClass}">
      <span class="dot"></span>${d.similarity !== null ? d.similarity + '%' : '—'}
    </span>`;

    // Status badge
    const stClass = d.status === 'Lolos' ? 'lolos' : d.status === 'Revisi' ? 'revisi' : d.status === 'Tidak Lolos' ? 'tidak-lolos' : 'proses';
    const stLabel = d.status || 'Proses';
    const stBadge = `<span class="status-badge ${stClass}">${escapeHTML(stLabel)}</span>`;

    const judulShort = d.judul.length > 55 ? d.judul.substring(0, 52) + '…' : d.judul || '—';

    return `<tr>
      <td>${start + i + 1}</td>
      <td style="white-space:nowrap;">${escapeHTML(dateStr)}</td>
      <td>${escapeHTML(d.nim || '—')}</td>
      <td>${escapeHTML(d.nama || '—')}</td>
      <td style="max-width:220px; white-space:normal;" title="${escapeHTML(d.judul)}">${escapeHTML(judulShort)}</td>
      <td>${simBadge}</td>
      <td>${stBadge}</td>
    </tr>`;
  }).join('');
  if (!pageData.length) tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Tidak ada data yang cocok. Coba ubah atau reset filter.</td></tr>';

  document.getElementById('kti-page-info').textContent =
    `Menampilkan ${data.length ? start + 1 : 0}–${Math.min(start + KTI_PAGE_SIZE, data.length)} dari ${data.length}`;

  renderPagination('kti-page-buttons', ktiCurrentPage, totalPages, page => {
    ktiCurrentPage = page;
    renderTable(getFilteredData());
  });
}
