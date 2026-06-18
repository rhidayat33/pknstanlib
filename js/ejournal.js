/* ============================================
   EJournal.js — E-Journal Page Logic
   Dashboard E-Resources PKN STAN
   ============================================ */

let ejournalData = null;
let ejCharts = {};
let ejCurrentPage = 1;
const EJ_PAGE_SIZE = 20;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('sidebar').innerHTML = getSidebarHTML('ejournal');

  // Clean up old file-upload-based localStorage data (migration)
  localStorage.removeItem('ejournal_data');
  localStorage.removeItem('ejournal_file');
  localStorage.removeItem('ejournal_uploaded_at');

  // Load saved API URL
  const savedUrl = getStoredApiUrl('ejournal');
  if (savedUrl) {
    document.getElementById('api-url-input').value = savedUrl;
    fetchEjournalData(savedUrl);
  } else {
    document.getElementById('ej-empty').style.display = 'flex';
  }

  // Filter events
  document.getElementById('filter-year').addEventListener('change', onFilterChange);
  document.getElementById('filter-metric').addEventListener('change', onFilterChange);
  document.getElementById('filter-search').addEventListener('input', onFilterChange);
});

// ============ API Connection ============
function saveAndFetch() {
  const url = document.getElementById('api-url-input').value.trim();
  if (!url) {
    showToast('Masukkan URL Apps Script terlebih dahulu', 'error');
    return;
  }
  setStoredApiUrl('ejournal', url);

  // Clear old cache so fresh data is fetched
  localStorage.removeItem('dashboard_cache_ejournal');

  fetchEjournalData(url);
}

async function fetchEjournalData(url) {
  console.log('[EJ] 🔄 Fetching data from:', url);

  document.getElementById('loading').style.display = 'flex';
  document.getElementById('ej-empty').style.display = 'none';
  document.getElementById('ej-stats').style.display = 'none';
  document.getElementById('ej-filters').style.display = 'none';
  document.getElementById('ej-charts').style.display = 'none';
  document.getElementById('ej-table-card').style.display = 'none';

  try {
    const data = await fetchWithCache(url, 'ejournal');
    console.log('[EJ] 📦 Raw API response:', data);

    // Validate response
    if (data.error) {
      throw new Error(data.error);
    }

    // The Apps Script returns: { journals, monthColumns, metricTypes, ... }
    if (!data.journals || !Array.isArray(data.journals)) {
      console.error('[EJ] ❌ Invalid response format. Keys:', Object.keys(data));
      throw new Error('Format data tidak valid — expected { journals: [...] }');
    }

    if (data.journals.length === 0) {
      throw new Error('Tidak ada data jurnal ditemukan');
    }

    ejournalData = {
      journals: data.journals,
      monthColumns: data.monthColumns || [],
      metricTypes: data.metricTypes || [],
    };

    console.log(`[EJ] ✅ Data loaded:
  Journals: ${ejournalData.journals.length}
  Month columns (${ejournalData.monthColumns.length}): ${JSON.stringify(ejournalData.monthColumns)}
  Metric types: ${JSON.stringify(ejournalData.metricTypes)}
  Headers from API: ${JSON.stringify(data.allHeaders || [])}`);

    // Fallback: if monthColumns empty, extract from journal data
    if (ejournalData.monthColumns.length === 0 && ejournalData.journals.length > 0) {
      console.warn('[EJ] ⚠️ monthColumns empty, extracting from journal data...');
      const monthSet = new Set();
      ejournalData.journals.forEach(j => {
        Object.keys(j.monthly || {}).forEach(k => monthSet.add(k));
      });
      ejournalData.monthColumns = [...monthSet].sort();
      console.log('[EJ] 🔄 Extracted monthColumns:', ejournalData.monthColumns);
    }

    // Fallback: if metricTypes empty, extract from journal data
    if (ejournalData.metricTypes.length === 0) {
      ejournalData.metricTypes = [...new Set(ejournalData.journals.map(j => j.metricType))];
      console.log('[EJ] 🔄 Extracted metricTypes:', ejournalData.metricTypes);
    }

    // Debug: show sample journal
    if (ejournalData.journals.length > 0) {
      const sample = ejournalData.journals[0];
      console.log('[EJ] 📝 Sample journal:', JSON.stringify({
        title: sample.title,
        metricType: sample.metricType,
        total: sample.total,
        monthlyKeys: Object.keys(sample.monthly || {}),
        monthlyValues: Object.values(sample.monthly || {}),
      }));
    }

    document.getElementById('loading').style.display = 'none';
    showToast(`Berhasil mengambil ${ejournalData.journals.length} data jurnal`, 'success');

    populateFilters();
    renderAll();

  } catch (err) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('ej-empty').style.display = 'flex';
    showToast('Gagal mengambil data: ' + err.message, 'error');
    console.error('[EJ] ❌ Error:', err);
  }
}

// ============ Filters ============
function populateFilters() {
  // --- Year filter ---
  const yearSelect = document.getElementById('filter-year');
  const years = new Set();
  if (ejournalData.monthColumns) {
    ejournalData.monthColumns.forEach(m => {
      const match = m.match(/(\d{4})/);
      if (match) years.add(match[1]);
    });
  }
  const currentYear = yearSelect.value;
  yearSelect.innerHTML = '<option value="all">Semua Tahun</option>';
  Array.from(years).sort().forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  });
  if (currentYear && currentYear !== 'all') yearSelect.value = currentYear;

  console.log('[EJ] 📅 Year filter populated:', [...years]);

  // --- Metric filter ---
  const metricSelect = document.getElementById('filter-metric');
  const currentMetric = metricSelect.value;
  const availableMetrics = ejournalData.metricTypes;

  // Rebuild metric options with available metrics first
  metricSelect.innerHTML = '';
  const added = new Set();
  availableMetrics.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m.replace(/_/g, ' ');
    metricSelect.appendChild(opt);
    added.add(m);
  });
  // Add known metrics if not already present (as fallback options)
  ['Total_Item_Requests', 'Unique_Item_Requests'].forEach(m => {
    if (!added.has(m)) {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m.replace(/_/g, ' ');
      metricSelect.appendChild(opt);
    }
  });
  if (currentMetric) metricSelect.value = currentMetric;

  console.log('[EJ] 📊 Metric filter populated:', availableMetrics, '| Selected:', metricSelect.value);
}

function getFilteredJournals() {
  const metric = document.getElementById('filter-metric').value;
  const year = document.getElementById('filter-year').value;
  const search = document.getElementById('filter-search').value.toLowerCase().trim();

  let filtered = ejournalData.journals.filter(j => j.metricType === metric);

  // Fallback: case-insensitive
  if (filtered.length === 0) {
    const metricLower = metric.toLowerCase();
    filtered = ejournalData.journals.filter(j =>
      j.metricType.toLowerCase() === metricLower
    );
    if (filtered.length > 0) {
      console.log(`[EJ] 🔄 Case-insensitive match found ${filtered.length} journals`);
    }
  }

  // Last resort: use first available metric type
  if (filtered.length === 0 && ejournalData.metricTypes.length > 0) {
    console.warn(`[EJ] ⚠️ No match for "${metric}", falling back to "${ejournalData.metricTypes[0]}"`);
    filtered = ejournalData.journals.filter(j =>
      j.metricType === ejournalData.metricTypes[0]
    );
  }

  if (search) {
    filtered = filtered.filter(j => j.title.toLowerCase().includes(search));
  }

  // If year filter, recalculate totals from monthly data
  if (year !== 'all') {
    filtered = filtered.map(j => {
      let yearTotal = 0;
      const yearMonthly = {};
      Object.entries(j.monthly || {}).forEach(([m, v]) => {
        if (m.includes(year)) {
          yearTotal += v;
          yearMonthly[m] = v;
        }
      });
      return { ...j, total: yearTotal, monthly: yearMonthly };
    });
  }

  return filtered;
}

function getFilteredMonths() {
  const year = document.getElementById('filter-year').value;
  let months = ejournalData.monthColumns || [];

  if (months.length === 0) {
    const monthSet = new Set();
    ejournalData.journals.forEach(j => {
      Object.keys(j.monthly || {}).forEach(k => monthSet.add(k));
    });
    months = [...monthSet].sort();
    ejournalData.monthColumns = months;
  }

  if (year !== 'all') {
    months = months.filter(m => m.includes(year));
  }
  return months;
}

function onFilterChange() {
  updateStats();
  renderCharts();
  renderTable();
}

// ============ Render All ============
function renderAll() {
  if (!ejournalData) return;

  document.getElementById('ej-stats').style.display = '';
  document.getElementById('ej-filters').style.display = '';
  document.getElementById('ej-charts').style.display = '';
  document.getElementById('ej-table-card').style.display = '';

  updateStats();
  renderCharts();
  renderTable();
}

// ============ Stats ============
function updateStats() {
  const filtered = getFilteredJournals();
  const totalAccess = filtered.reduce((sum, j) => sum + (j.total || 0), 0);
  const totalJournals = filtered.length;
  const avgAccess = totalJournals > 0 ? Math.round(totalAccess / totalJournals) : 0;
  const sorted = [...filtered].sort((a, b) => (b.total || 0) - (a.total || 0));
  const topJournal = sorted[0];

  console.log(`[EJ] 📈 Stats — Filtered: ${totalJournals} journals | Total access: ${totalAccess} | Top: "${topJournal?.title || '—'}"`);

  animateCounter(document.getElementById('ej-total-access'), totalAccess);
  animateCounter(document.getElementById('ej-total-journals'), totalJournals);
  animateCounter(document.getElementById('ej-avg-access'), avgAccess);
  document.getElementById('ej-top-journal').textContent = topJournal ? topJournal.title : '—';
}

// ============ Charts ============
function renderCharts() {
  Object.values(ejCharts).forEach(c => { try { c.destroy(); } catch(e) {} });
  ejCharts = {};

  renderMonthlyChart();
  renderTopChart();
  renderMetricsChart();
}

function renderMonthlyChart() {
  const filtered = getFilteredJournals();
  const months = getFilteredMonths();

  console.log(`[EJ] 📊 Monthly chart — ${filtered.length} journals | ${months.length} months: [${months.join(', ')}]`);

  const monthlyTotals = {};
  months.forEach(m => monthlyTotals[m] = 0);
  filtered.forEach(j => {
    Object.entries(j.monthly || {}).forEach(([m, v]) => {
      if (monthlyTotals.hasOwnProperty(m)) {
        monthlyTotals[m] += v;
      }
    });
  });

  const labels = months;
  const data = months.map(m => monthlyTotals[m] || 0);

  console.log(`[EJ] 📊 Monthly data — Values: [${data.join(', ')}] | Sum: ${data.reduce((a,b) => a+b, 0)}`);

  const ctx = document.getElementById('chart-ej-monthly').getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(99, 102, 241, 0.8)');
  gradient.addColorStop(1, 'rgba(139, 92, 246, 0.3)');

  ejCharts.monthly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Total Akses',
        data,
        backgroundColor: gradient,
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { callback: val => formatNumber(val) } },
        x: { ticks: { maxRotation: 45 } },
      },
    },
  });
}

function renderTopChart() {
  const filtered = getFilteredJournals()
    .sort((a, b) => (b.total || 0) - (a.total || 0))
    .slice(0, 20);
  const labels = filtered.map(j => j.title);
  const data = filtered.map(j => j.total);

  console.log(`[EJ] 📊 Top 20 chart — ${filtered.length} journals | Top values: [${data.slice(0,5).join(', ')}...]`);

  const ctx = document.getElementById('chart-ej-top').getContext('2d');
  ejCharts.top = createHorizontalBarChart(ctx, labels, data, CHART_COLORS.cyan);
}

function renderMetricsChart() {
  const allTotalReq = ejournalData.journals.filter(j => j.metricType === 'Total_Item_Requests');
  const allUniqueReq = ejournalData.journals.filter(j => j.metricType === 'Unique_Item_Requests');

  const year = document.getElementById('filter-year').value;
  let totalSum = 0, uniqueSum = 0;

  allTotalReq.forEach(j => {
    if (year === 'all') {
      totalSum += j.total || 0;
    } else {
      Object.entries(j.monthly || {}).forEach(([m, v]) => {
        if (m.includes(year)) totalSum += v;
      });
    }
  });

  allUniqueReq.forEach(j => {
    if (year === 'all') {
      uniqueSum += j.total || 0;
    } else {
      Object.entries(j.monthly || {}).forEach(([m, v]) => {
        if (m.includes(year)) uniqueSum += v;
      });
    }
  });

  console.log(`[EJ] 📊 Metrics chart — Total: ${totalSum} | Unique: ${uniqueSum}`);

  const ctx = document.getElementById('chart-ej-metrics').getContext('2d');
  ejCharts.metrics = createDoughnutChart(
    ctx,
    ['Total Item Requests', 'Unique Item Requests'],
    [totalSum, uniqueSum],
    [CHART_COLORS.indigo, CHART_COLORS.cyan]
  );
}

// ============ Table ============
function renderTable() {
  const filtered = getFilteredJournals().sort((a, b) => (b.total || 0) - (a.total || 0));
  const totalPages = Math.ceil(filtered.length / EJ_PAGE_SIZE);
  ejCurrentPage = Math.min(ejCurrentPage, totalPages || 1);

  const start = (ejCurrentPage - 1) * EJ_PAGE_SIZE;
  const pageData = filtered.slice(start, start + EJ_PAGE_SIZE);

  // Get unique request data for same journals
  const uniqueMap = {};
  const year = document.getElementById('filter-year').value;
  ejournalData.journals
    .filter(j => j.metricType === 'Unique_Item_Requests')
    .forEach(j => {
      if (year === 'all') {
        uniqueMap[j.title] = j.total;
      } else {
        let sum = 0;
        Object.entries(j.monthly || {}).forEach(([m, v]) => {
          if (m.includes(year)) sum += v;
        });
        uniqueMap[j.title] = sum;
      }
    });

  const tbody = document.getElementById('ej-table-body');
  tbody.innerHTML = pageData.map((j, i) => `
    <tr>
      <td>${start + i + 1}</td>
      <td style="white-space:normal; min-width:250px;">${j.title}</td>
      <td>${formatNumberFull(j.total)}</td>
      <td>${formatNumberFull(uniqueMap[j.title] || 0)}</td>
    </tr>
  `).join('');

  const totalFiltered = filtered.length;
  document.getElementById('ej-page-info').textContent =
    totalFiltered > 0
      ? `Menampilkan ${start + 1}–${Math.min(start + EJ_PAGE_SIZE, totalFiltered)} dari ${totalFiltered} jurnal`
      : 'Tidak ada data';

  const btnContainer = document.getElementById('ej-page-buttons');
  btnContainer.innerHTML = '';

  if (totalPages > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.textContent = '←';
    prevBtn.disabled = ejCurrentPage === 1;
    prevBtn.onclick = () => { ejCurrentPage--; renderTable(); };
    btnContainer.appendChild(prevBtn);

    for (let p = 1; p <= totalPages; p++) {
      if (totalPages > 7 && p > 3 && p < totalPages - 1 && Math.abs(p - ejCurrentPage) > 1) {
        if (p === 4 || p === totalPages - 2) {
          const dots = document.createElement('span');
          dots.textContent = '...';
          dots.style.padding = '6px 8px';
          dots.style.color = 'var(--text-muted)';
          btnContainer.appendChild(dots);
        }
        continue;
      }
      const btn = document.createElement('button');
      btn.className = `pagination-btn ${p === ejCurrentPage ? 'active' : ''}`;
      btn.textContent = p;
      btn.onclick = () => { ejCurrentPage = p; renderTable(); };
      btnContainer.appendChild(btn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.textContent = '→';
    nextBtn.disabled = ejCurrentPage === totalPages;
    nextBtn.onclick = () => { ejCurrentPage++; renderTable(); };
    btnContainer.appendChild(nextBtn);
  }
}
