/* ============================================
   STATA.js — STATA Page Logic
   Dashboard E-Resources PKN STAN
   ============================================ */

let stataRawData = [];
let stataCharts = {};
let stataCurrentPage = 1;
const STATA_PAGE_SIZE = 20;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('sidebar').innerHTML = getSidebarHTML('stata');

  const savedUrl = getStoredApiUrl('stata');
  if (savedUrl) {
    document.getElementById('api-url-input').value = savedUrl;
    fetchData(savedUrl);
  } else {
    document.getElementById('stata-empty').style.display = 'flex';
  }

  document.getElementById('stata-filter-year').addEventListener('change', onStataFilterChange);
  document.getElementById('stata-filter-prodi').addEventListener('change', onStataFilterChange);
  document.getElementById('stata-filter-category').addEventListener('change', onStataFilterChange);
});

function saveAndFetch() {
  const url = document.getElementById('api-url-input').value.trim();
  if (!url) {
    showToast('Masukkan URL Apps Script terlebih dahulu', 'error');
    return;
  }
  setStoredApiUrl('stata', url);
  fetchData(url);
}

async function fetchData(url) {
  document.getElementById('loading').style.display = 'flex';
  document.getElementById('stata-empty').style.display = 'none';
  document.getElementById('stata-stats').style.display = 'none';
  document.getElementById('stata-charts').style.display = 'none';
  document.getElementById('stata-table-card').style.display = 'none';

  try {
    const data = await fetchWithCache(url, 'stata');
    stataRawData = Array.isArray(data) ? data : (data.data || []);

    if (stataRawData.length === 0) throw new Error('Tidak ada data');

    document.getElementById('loading').style.display = 'none';
    showToast(`Berhasil mengambil ${stataRawData.length} data STATA`, 'success');

    populateFilters();
    renderAll();
  } catch (err) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('stata-empty').style.display = 'flex';
    document.getElementById('config-panel').style.display = 'block'; // Tampilkan panel jika gagal load
    showToast('Gagal mengambil data: ' + err.message, 'error');
    console.error(err);
  }
}

// ============ Data Processing ============
function processRow(row) {
  if (Array.isArray(row)) {
    return {
      nama: String(row[0] || ''),
      nipnim: String(row[1] || ''),
      email: String(row[2] || ''),
      prodi: String(row[3] || 'Tidak Diketahui'),
      kebutuhan: String(row[4] || 'Tidak Disebutkan'),
      timestamp: row[5] || '',
    };
  }
  return {
    nama: String(row.nama || row.Nama || ''),
    nipnim: String(row.nipnim || row.nip_nim_nik || row.NIP_NIM_NIK || ''),
    email: String(row.email || row.Email || ''),
    prodi: String(row.prodi || row.prodi_bagian_unit || row.Prodi_Bagian_Unit || 'Tidak Diketahui'),
    kebutuhan: String(row.kebutuhan || row.kebutuhan_penggunaan || row.Kebutuhan_Penggunaan_STATA || 'Tidak Disebutkan'),
    timestamp: row.timestamp || row.Timestamp || '',
  };
}

function getProcessedData() {
  return stataRawData.map(processRow);
}

function getFilteredData() {
  let data = getProcessedData();
  const year = document.getElementById('stata-filter-year').value;
  const prodi = document.getElementById('stata-filter-prodi').value;
  const category = document.getElementById('stata-filter-category').value;

  if (year !== 'all') {
    data = data.filter(d => {
      const date = parseDate(d.timestamp);
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

  const years = new Set();
  data.forEach(d => {
    const date = parseDate(d.timestamp);
    if (date) years.add(getYear(date));
  });

  const yearSelect = document.getElementById('stata-filter-year');
  yearSelect.innerHTML = '<option value="all">Semua</option>';
  Array.from(years).sort().forEach(y => {
    yearSelect.innerHTML += `<option value="${y}">${y}</option>`;
  });

  const prodis = new Set();
  data.forEach(d => { if (d.prodi) prodis.add(d.prodi); });

  const prodiSelect = document.getElementById('stata-filter-prodi');
  prodiSelect.innerHTML = '<option value="all">Semua</option>';
  Array.from(prodis).sort().forEach(p => {
    prodiSelect.innerHTML += `<option value="${p}">${p}</option>`;
  });
}

function onStataFilterChange() {
  renderAll();
}

// ============ Render ============
function renderAll() {
  const data = getFilteredData();

  document.getElementById('stata-stats').style.display = '';
  document.getElementById('stata-filters').style.display = '';
  document.getElementById('stata-charts').style.display = '';
  document.getElementById('stata-table-card').style.display = '';

  const totalUsers = data.length;
  const prodis = new Set(data.map(d => d.prodi));
  const categories = countBy(data, d => classifyUser(d.nipnim));

  animateCounter(document.getElementById('stata-total-users'), totalUsers);
  animateCounter(document.getElementById('stata-total-prodi'), prodis.size);
  animateCounter(document.getElementById('stata-dosen-count'), categories['Dosen'] || 0);
  animateCounter(document.getElementById('stata-mhs-count'), categories['Mahasiswa'] || 0);

  Object.values(stataCharts).forEach(c => c.destroy());
  stataCharts = {};

  renderMonthlyChart(data);
  renderProdiChart(data);
  renderCategoryChart(data);
  renderNeedChart(data);

  stataCurrentPage = 1;
  renderTable(data);
}

function renderMonthlyChart(data) {
  const monthly = countBy(data, d => {
    const date = parseDate(d.timestamp);
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

  const ctx = document.getElementById('chart-stata-monthly').getContext('2d');
  stataCharts.monthly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Jumlah Pengguna',
        data: values,
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
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

  const ctx = document.getElementById('chart-stata-prodi').getContext('2d');
  stataCharts.prodi = createHorizontalBarChart(ctx, labels, values, CHART_COLORS.emerald);
}

function renderCategoryChart(data) {
  const cats = countBy(data, d => classifyUser(d.nipnim));
  const labels = Object.keys(cats);
  const values = Object.values(cats);

  const ctx = document.getElementById('chart-stata-category').getContext('2d');
  stataCharts.category = createDoughnutChart(ctx, labels, values, [CHART_COLORS.indigo, CHART_COLORS.emerald, CHART_COLORS.amber]);
}

function renderNeedChart(data) {
  const needs = sortObjectByValue(countBy(data, d => {
    const t = d.kebutuhan.trim();
    return t.length > 50 ? t.substring(0, 47) + '...' : t;
  }), true);
  const top10 = Object.fromEntries(Object.entries(needs).slice(0, 10));
  const labels = Object.keys(top10);
  const values = Object.values(top10);

  const ctx = document.getElementById('chart-stata-need').getContext('2d');
  stataCharts.need = createHorizontalBarChart(ctx, labels, values, CHART_COLORS.violet);
}

function renderTable(data) {
  const totalPages = Math.ceil(data.length / STATA_PAGE_SIZE);
  stataCurrentPage = Math.min(stataCurrentPage, totalPages || 1);

  const start = (stataCurrentPage - 1) * STATA_PAGE_SIZE;
  const pageData = data.slice(start, start + STATA_PAGE_SIZE);

  const tbody = document.getElementById('stata-table-body');
  tbody.innerHTML = pageData.map((d, i) => {
    const cat = classifyUser(d.nipnim);
    return `<tr>
      <td>${start + i + 1}</td>
      <td>${d.nama || '—'}</td>
      <td>${d.nipnim || '—'}</td>
      <td>${d.prodi || '—'}</td>
      <td style="white-space:normal; max-width:200px;">${d.kebutuhan || '—'}</td>
      <td><span style="padding:2px 8px; border-radius:12px; font-size:11px; font-weight:600;
        background:${cat === 'Dosen' ? 'rgba(99,102,241,0.15)' : cat === 'Mahasiswa' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'};
        color:${cat === 'Dosen' ? 'var(--accent-indigo)' : cat === 'Mahasiswa' ? 'var(--accent-emerald)' : 'var(--accent-amber)'};
      ">${cat}</span></td>
    </tr>`;
  }).join('');

  document.getElementById('stata-page-info').textContent =
    `Menampilkan ${start + 1}–${Math.min(start + STATA_PAGE_SIZE, data.length)} dari ${data.length}`;

  const btnContainer = document.getElementById('stata-page-buttons');
  btnContainer.innerHTML = '';
  if (totalPages > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.textContent = '←';
    prevBtn.disabled = stataCurrentPage === 1;
    prevBtn.onclick = () => { stataCurrentPage--; renderTable(getFilteredData()); };
    btnContainer.appendChild(prevBtn);

    for (let p = 1; p <= Math.min(totalPages, 5); p++) {
      const btn = document.createElement('button');
      btn.className = `pagination-btn ${p === stataCurrentPage ? 'active' : ''}`;
      btn.textContent = p;
      btn.onclick = () => { stataCurrentPage = p; renderTable(getFilteredData()); };
      btnContainer.appendChild(btn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.textContent = '→';
    nextBtn.disabled = stataCurrentPage === totalPages;
    nextBtn.onclick = () => { stataCurrentPage++; renderTable(getFilteredData()); };
    btnContainer.appendChild(nextBtn);
  }
}
