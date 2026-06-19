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

function saveAndFetch() {
  const url = document.getElementById('api-url-input').value.trim();
  if (!url) {
    showToast('Masukkan URL Apps Script terlebih dahulu', 'error');
    return;
  }
  setStoredApiUrl('lseg', url);
  fetchData(url);
}

async function fetchData(url) {
  document.getElementById('loading').style.display = 'flex';
  document.getElementById('lseg-empty').style.display = 'none';
  document.getElementById('lseg-stats').style.display = 'none';
  document.getElementById('lseg-charts').style.display = 'none';
  document.getElementById('lseg-table-card').style.display = 'none';

  try {
    const data = await fetchWithCache(url, 'lseg');
    lsegRawData = Array.isArray(data) ? data : (data.data || []);

    if (lsegRawData.length === 0) {
      throw new Error('Tidak ada data');
    }

    document.getElementById('loading').style.display = 'none';
    showToast(`Berhasil mengambil ${lsegRawData.length} data LSEG`, 'success');

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
    prodiSelect.innerHTML += `<option value="${p}">${p}</option>`;
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

  const sorted = Object.entries(monthly).sort((a, b) => {
    const pa = a[0].split(' ');
    const pb = b[0].split(' ');
    const ya = parseInt(pa[1]), yb = parseInt(pb[1]);
    if (ya !== yb) return ya - yb;
    return MONTH_NAMES.indexOf(pa[0]) - MONTH_NAMES.indexOf(pb[0]);
  });

  const labels = sorted.map(s => s[0]);
  const values = sorted.map(s => s[1]);

  const ctx = document.getElementById('chart-lseg-monthly').getContext('2d');
  lsegCharts.monthly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Jumlah Pengguna',
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
  const labels = Object.keys(prodiCounts);
  const values = Object.values(prodiCounts);

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
      <td>${d.nipnim || '—'}</td>
      <td>${d.prodi || '—'}</td>
      <td>${dateStr}</td>
      <td style="white-space:normal; max-width:200px;">${d.tujuan || '—'}</td>
      <td><span style="padding:2px 8px; border-radius:12px; font-size:11px; font-weight:600;
        background:${classifyUser(d.nipnim) === 'Dosen' ? 'rgba(99,102,241,0.15)' : classifyUser(d.nipnim) === 'Mahasiswa' ? 'rgba(6,182,212,0.15)' : 'rgba(245,158,11,0.15)'};
        color:${classifyUser(d.nipnim) === 'Dosen' ? 'var(--accent-indigo)' : classifyUser(d.nipnim) === 'Mahasiswa' ? 'var(--accent-cyan)' : 'var(--accent-amber)'};
      ">${classifyUser(d.nipnim)}</span></td>
    </tr>`;
  }).join('');

  document.getElementById('lseg-page-info').textContent =
    `Menampilkan ${start + 1}–${Math.min(start + LSEG_PAGE_SIZE, data.length)} dari ${data.length}`;

  const btnContainer = document.getElementById('lseg-page-buttons');
  btnContainer.innerHTML = '';
  if (totalPages > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.textContent = '←';
    prevBtn.disabled = lsegCurrentPage === 1;
    prevBtn.onclick = () => { lsegCurrentPage--; renderTable(getFilteredData()); };
    btnContainer.appendChild(prevBtn);

    for (let p = 1; p <= Math.min(totalPages, 5); p++) {
      const btn = document.createElement('button');
      btn.className = `pagination-btn ${p === lsegCurrentPage ? 'active' : ''}`;
      btn.textContent = p;
      btn.onclick = () => { lsegCurrentPage = p; renderTable(getFilteredData()); };
      btnContainer.appendChild(btn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.textContent = '→';
    nextBtn.disabled = lsegCurrentPage === totalPages;
    nextBtn.onclick = () => { lsegCurrentPage++; renderTable(getFilteredData()); };
    btnContainer.appendChild(nextBtn);
  }
}
