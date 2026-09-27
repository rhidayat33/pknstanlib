/* ============================================
   LSEG.js — LSEG Page Logic
   Dashboard E-Resources PKN STAN
   ============================================ */

let lsegRawData = [];
let lsegCharts = {};
let lsegCurrentPage = 1;
const LSEG_PAGE_SIZE = 20;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('sidebar').innerHTML = getSidebarHTML('lseg');

  // Load saved API URL
  const savedUrl = getStoredApiUrl('lseg');
  if (savedUrl) {
    document.getElementById('api-url-input').value = savedUrl;
    fetchData(savedUrl);
  } else {
    document.getElementById('lseg-empty').style.display = 'flex';
  }

  // Filter events
  document.getElementById('lseg-filter-year').addEventListener('change', onLsegFilterChange);
  document.getElementById('lseg-filter-prodi').addEventListener('change', onLsegFilterChange);
  document.getElementById('lseg-filter-category').addEventListener('change', onLsegFilterChange);
});

async function saveAndFetch() {
  const url = document.getElementById('api-url-input').value.trim();
  if (!url) {
    showToast('Masukkan URL Apps Script terlebih dahulu', 'error');
    return;
  }
  try { setStoredApiUrl('lseg', url); } catch (error) { showToast(error.message, 'error'); return; }
  
  // Clear old cache so fresh data is fetched

  
  await fetchData(url, true);
}

async function fetchData(url, force = false) {
  document.getElementById('loading').style.display = 'flex';
  document.getElementById('lseg-empty').style.display = 'none';
  document.getElementById('lseg-stats').style.display = 'none';
  document.getElementById('lseg-charts').style.display = 'none';
  document.getElementById('lseg-table-card').style.display = 'none';

  try {
    const data = await fetchWithCache(url, 'lseg', { force });
    lsegRawData = Array.isArray(data) ? data : (data.data || []);



    document.getElementById('loading').style.display = 'none';
    if (sourceStates['lseg']?.state !== 'stale') showToast(`Berhasil mengambil ${lsegRawData.length} data LSEG`, 'success');

    populateFilters();
    renderAll();
  } catch (err) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('lseg-empty').style.display = 'flex';
    document.getElementById('config-panel').style.display = 'block'; // Tampilkan panel jika gagal load
    showToast('Gagal mengambil data: ' + err.message, 'error');
    console.error(err);
  }
}

// ============ Data Processing ============
function processRow(row) {
  // Handle both array and object formats
  if (Array.isArray(row)) {
    return {
      nipnim: String(row[0] || ''),
      email: String(row[1] || ''),
      prodi: String(row[2] || 'Tidak Diketahui'),
      tanggal: row[3] || '',
      tujuan: String(row[4] || 'Tidak Disebutkan'),
    };
  }
  return {
    nipnim: String(row.nipnim || row.nip_nim || row.NIP_NIM || ''),
    email: String(row.email || row.Email || ''),
    prodi: String(row.prodi || row.program_studi || row.Program_Studi || 'Tidak Diketahui'),
    tanggal: row.tanggal || row.date || row.Tanggal || '',
    tujuan: String(row.tujuan || row.purpose || row.Tujuan_Penggunaan || 'Tidak Disebutkan'),
  };
}

function getProcessedData() {
  return lsegRawData.map(processRow);
}

function getFilteredData() {
  let data = getProcessedData();
  const year = document.getElementById('lseg-filter-year').value;
  const prodi = document.getElementById('lseg-filter-prodi').value;
  const category = document.getElementById('lseg-filter-category').value;

  if (year !== 'all') {
    data = data.filter(d => {
      const date = parseDate(d.tanggal);
      return date && getYear(date) === parseInt(year);
    });
  }

  if (prodi !== 'all') {
    data = data.filter(d => d.prodi === prodi);
  }

  if (category !== 'all') {
    data = data.filter(d => classifyUser(d.nipnim) === category);
  }

  return data;
}

// ============ Filters ============
function populateFilters() {
  const data = getProcessedData();

  // Years
  const years = new Set();
  data.forEach(d => {
    const date = parseDate(d.tanggal);
    if (date) years.add(getYear(date));
  });

  const yearSelect = document.getElementById('lseg-filter-year');
  yearSelect.innerHTML = '<option value="all">Semua</option>';
  Array.from(years).sort().forEach(y => {
    yearSelect.innerHTML += `<option value="${y}">${y}</option>`;
  });

  // Prodi
  const prodis = new Set();
  data.forEach(d => { if (d.prodi) prodis.add(d.prodi); });

  const prodiSelect = document.getElementById('lseg-filter-prodi');
  prodiSelect.innerHTML = '<option value="all">Semua Prodi</option>';
  Array.from(prodis).sort().forEach(p => {
    prodiSelect.innerHTML += `<option value="${escapeHTML(p)}">${escapeHTML(p)}</option>`;
  });
}

function onLsegFilterChange() {
  renderAll();
}

// ============ Render ============
function renderAll() {
  const data = getFilteredData();

  document.getElementById('lseg-stats').style.display = '';
  document.getElementById('lseg-filters').style.display = '';
  document.getElementById('lseg-charts').style.display = '';
  document.getElementById('lseg-table-card').style.display = '';

  // Stats
  const totalUsers = data.length;
  document.getElementById('lseg-unique-note').textContent = uniqueUserCount(data) + ' pengguna unik dengan NIP/NIM terisi';
  const prodis = new Set(data.map(d => d.prodi));
  const categories = countBy(data, d => classifyUser(d.nipnim));

  animateCounter(document.getElementById('lseg-total-users'), totalUsers);
  animateCounter(document.getElementById('lseg-total-prodi'), prodis.size);
  animateCounter(document.getElementById('lseg-dosen-count'), categories['Dosen'] || 0);
  animateCounter(document.getElementById('lseg-mhs-count'), categories['Mahasiswa'] || 0);

  // Charts
  Object.values(lsegCharts).forEach(c => c.destroy());
  lsegCharts = {};

  renderMonthlyChart(data);
  renderProdiChart(data);
  renderCategoryChart(data);
  renderPurposeChart(data);

  // Table
  lsegCurrentPage = 1;
  renderTable(data);
}

function renderMonthlyChart(data) {
  const monthly = countBy(data, d => {
    const date = parseDate(d.tanggal);
    return date ? getMonthYear(date) : null;
  });
  delete monthly['null'];
  delete monthly['Tidak Diketahui'];

  const sorted = sortMonthYearEntries(Object.entries(monthly));

  const labels = sorted.map(s => s[0]);
  const values = sorted.map(s => s[1]);

  const ctx = document.getElementById('chart-lseg-monthly').getContext('2d');
  lsegCharts.monthly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Jumlah Penggunaan',
        data: values,
        backgroundColor: 'rgba(6, 182, 212, 0.7)',
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true },
        x: { ticks: { maxRotation: 45 } },
      },
    },
  });
}

function renderProdiChart(data) {
  const prodiCounts = sortObjectByValue(countBy(data, d => d.prodi), true);
  const labels = Object.keys(prodiCounts).slice(0, 10);
  const values = Object.values(prodiCounts).slice(0, 10);

  const ctx = document.getElementById('chart-lseg-prodi').getContext('2d');
  lsegCharts.prodi = createHorizontalBarChart(ctx, labels, values, CHART_COLORS.indigo);
}

function renderCategoryChart(data) {
  const cats = countBy(data, d => classifyUser(d.nipnim));
  const labels = Object.keys(cats);
  const values = Object.values(cats);

  const ctx = document.getElementById('chart-lseg-category').getContext('2d');
  lsegCharts.category = createDoughnutChart(ctx, labels, values, [CHART_COLORS.indigo, CHART_COLORS.cyan, CHART_COLORS.amber]);
}

function renderPurposeChart(data) {
  const purposes = sortObjectByValue(countBy(data, d => {
    const t = d.tujuan.trim();
    return t.length > 50 ? t.substring(0, 47) + '...' : t;
  }), true);
  const top10 = Object.fromEntries(Object.entries(purposes).slice(0, 10));
  const labels = Object.keys(top10);
  const values = Object.values(top10);

  const ctx = document.getElementById('chart-lseg-purpose').getContext('2d');
  lsegCharts.purpose = createHorizontalBarChart(ctx, labels, values, CHART_COLORS.emerald);
}

function renderTable(data) {
  const totalPages = Math.ceil(data.length / LSEG_PAGE_SIZE);
  lsegCurrentPage = Math.min(lsegCurrentPage, totalPages || 1);

  const start = (lsegCurrentPage - 1) * LSEG_PAGE_SIZE;
  const pageData = data.slice(start, start + LSEG_PAGE_SIZE);

  const tbody = document.getElementById('lseg-table-body');
  tbody.innerHTML = pageData.map((d, i) => {
    const date = parseDate(d.tanggal);
    const dateStr = date ? date.toLocaleDateString('id-ID') : d.tanggal || '—';
    return `<tr>
      <td>${start + i + 1}</td>
      <td>${escapeHTML(d.nipnim || '—')}</td>
      <td>${escapeHTML(d.prodi || '—')}</td>
      <td>${escapeHTML(dateStr)}</td>
      <td style="white-space:normal; max-width:200px;">${escapeHTML(d.tujuan || '—')}</td>
      <td><span style="padding:2px 8px; border-radius:12px; font-size:11px; font-weight:600;
        background:${classifyUser(d.nipnim) === 'Dosen' ? 'rgba(99,102,241,0.15)' : classifyUser(d.nipnim) === 'Mahasiswa' ? 'rgba(6,182,212,0.15)' : 'rgba(245,158,11,0.15)'};
        color:${classifyUser(d.nipnim) === 'Dosen' ? 'var(--accent-indigo)' : classifyUser(d.nipnim) === 'Mahasiswa' ? 'var(--accent-cyan)' : 'var(--accent-amber)'};
      ">${classifyUser(d.nipnim)}</span></td>
    </tr>`;
  }).join('');
  if (!pageData.length) tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Tidak ada data yang cocok. Coba ubah atau reset filter.</td></tr>';

  document.getElementById('lseg-page-info').textContent =
    `Menampilkan ${data.length ? start + 1 : 0}–${Math.min(start + LSEG_PAGE_SIZE, data.length)} dari ${data.length}`;

  renderPagination('lseg-page-buttons', lsegCurrentPage, totalPages, page => {
    lsegCurrentPage = page;
    renderTable(getFilteredData());
  });
}
