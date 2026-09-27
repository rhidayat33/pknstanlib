/* Shared controls and feedback, used by every dashboard page. */
const SOURCE_LABELS = { ejournal: 'E-Journal', lseg: 'LSEG', stata: 'STATA', kti: 'Similaritas KTI' };

function renderPagination(id, current, total, onChange) {
  const container = document.getElementById(id);
  container.replaceChildren();
  if (total <= 1) return;
  const add = (label, page, disabled = false) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pagination-btn' + (page === current && typeof label === 'number' ? ' active' : '');
    button.textContent = label;
    button.disabled = disabled;
    button.setAttribute('aria-label', typeof label === 'number' ? 'Halaman ' + page : label === '←' ? 'Halaman sebelumnya' : 'Halaman berikutnya');
    if (page === current && typeof label === 'number') button.setAttribute('aria-current', 'page');
    button.onclick = () => onChange(page);
    container.appendChild(button);
  };
  add('←', current - 1, current === 1);
  const pages = [...new Set([1, total, current - 1, current, current + 1])].filter(page => page >= 1 && page <= total).sort((a, b) => a - b);
  pages.forEach((page, index) => {
    if (index && page - pages[index - 1] > 1) {
      const dots = document.createElement('span');
      dots.className = 'pagination-gap';
      dots.textContent = '…';
      container.appendChild(dots);
    }
    add(page, page);
  });
  add('→', current + 1, current === total);
}

function exportCurrentData(key) {
  let headers, rows;
  if (key === 'ejournal') {
    if (!ejournalData) return showToast('Muat data terlebih dahulu', 'error');
    headers = ['Judul', 'Metrik', 'Total periode terpilih', ...getFilteredMonths()];
    rows = getFilteredJournals().map(row => [row.title, row.metricType, row.total, ...getFilteredMonths().map(month => row.monthly[month] || 0)]);
  } else {
    const fields = key === 'lseg' ? ['nipnim', 'prodi', 'tanggal', 'tujuan']
      : key === 'stata' ? ['nama', 'nipnim', 'prodi', 'timestamp', 'kebutuhan']
      : ['timestamp', 'nim', 'nama', 'judul', 'similarity', 'status'];
    headers = key === 'lseg' ? ['NIP/NIM', 'Prodi', 'Tanggal', 'Tujuan']
      : key === 'stata' ? ['Nama', 'NIP/NIM', 'Prodi/Unit', 'Tanggal', 'Kebutuhan']
      : ['Tanggal', 'NIM', 'Nama', 'Judul', 'Similaritas (%)', 'Status'];
    rows = getFilteredData().map(row => fields.map(field => row[field]));
  }
  if (!rows.length) return showToast('Tidak ada data untuk filter yang dipilih', 'info');
  const url = URL.createObjectURL(new Blob([createCSV(headers, rows)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = key + '-' + new Date().toISOString().slice(0, 10) + '.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast(rows.length + ' baris diekspor sesuai filter', 'success');
}

function initDashboardTools() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  const key = ({ 'ejournal.html': 'ejournal', 'lseg.html': 'lseg', 'stata.html': 'stata', 'similaritas-kti.html': 'kti' })[page];
  const isHome = page === 'index.html';
  const main = document.querySelector('main');
  if (main) {
    main.id = 'main-content';
    main.tabIndex = -1;
    const skip = document.createElement('a');
    skip.href = '#main-content';
    skip.className = 'skip-link';
    skip.textContent = 'Langsung ke konten';
    document.body.prepend(skip);
  }
  document.querySelectorAll('.filter-group').forEach(group => {
    const control = group.querySelector('select, input');
    const label = group.querySelector('.filter-label');
    if (control && label) control.setAttribute('aria-label', label.textContent);
  });
  document.querySelectorAll('input[placeholder]').forEach(input => {
    if (!input.labels?.length && !input.hasAttribute('aria-label')) input.setAttribute('aria-label', input.placeholder);
  });
  document.querySelectorAll('canvas').forEach(canvas => {
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', canvas.closest('.chart-card')?.querySelector('.chart-title')?.textContent || 'Grafik statistik layanan');
  });
  document.querySelectorAll('th').forEach(th => th.scope = 'col');
  document.querySelectorAll('.stat-card.clickable').forEach(card => {
    card.tabIndex = 0;
    card.setAttribute('role', 'link');
    card.onkeydown = event => { if (event.key === 'Enter') card.click(); };
  });
  const menu = document.querySelector('.mobile-menu-btn');
  menu?.addEventListener('click', () => menu.setAttribute('aria-expanded', String(document.querySelector('.sidebar').classList.contains('open'))));
  const closeMenu = () => {
    document.querySelector('.sidebar')?.classList.remove('open');
    document.querySelector('.mobile-overlay')?.classList.remove('visible');
    menu?.setAttribute('aria-expanded', 'false');
  };
  document.querySelector('.mobile-overlay')?.addEventListener('click', closeMenu);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.querySelector('.sidebar')?.classList.contains('open')) { closeMenu(); menu?.focus(); }
  });
  queueMicrotask(() => {
    document.querySelector('.nav-item.active')?.setAttribute('aria-current', 'page');
    document.querySelector('.sidebar')?.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  });
  if (!key && !isHome) return;

  const header = document.querySelector('.page-header');
  const toolbar = document.createElement('div');
  toolbar.className = 'dashboard-toolbar';
  const refresh = document.createElement('button');
  refresh.type = 'button';
  refresh.className = 'action-button primary';
  refresh.textContent = '↻ Perbarui data';
  refresh.onclick = async () => {
    refresh.disabled = true;
    refresh.textContent = 'Memperbarui…';
    try {
      if (isHome) await loadHomeData(true, true);
      else if (key === 'ejournal') await fetchEjournalData(getStoredApiUrl(key), true);
      else await fetchData(getStoredApiUrl(key), true);
    } catch (error) { showToast(error.message, 'error'); }
    finally { refresh.disabled = false; refresh.textContent = '↻ Perbarui data'; }
  };
  toolbar.appendChild(refresh);
  if (key) {
    const download = document.createElement('button');
    download.type = 'button';
    download.className = 'action-button';
    download.textContent = '↓ Ekspor CSV';
    download.onclick = () => exportCurrentData(key);
    toolbar.appendChild(download);
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'action-button';
    reset.textContent = 'Reset filter';
    reset.onclick = () => {
      if (key === 'ejournal' && !ejournalData) return;
      document.querySelectorAll('.filter-bar select').forEach(select => {
        select.value = select.id === 'filter-metric' ? (ejournalData.metricTypes.includes('Total_Item_Requests') ? 'Total_Item_Requests' : ejournalData.metricTypes[0]) : 'all';
      });
      document.querySelectorAll('.filter-bar input, .search-input, #kti-search').forEach(input => input.value = '');
      if (key === 'kti') ktiSearchQuery = '';
      if (key === 'ejournal') ejCurrentPage = 1;
      renderAll();
    };
    toolbar.appendChild(reset);
  }
  header.appendChild(toolbar);
  const sourcePanel = document.createElement('div');
  sourcePanel.className = 'source-panel';
  sourcePanel.setAttribute('role', 'group');
  sourcePanel.setAttribute('aria-label', 'Status sumber data');
  sourcePanel.setAttribute('aria-live', 'polite');
  toolbar.appendChild(sourcePanel);
  document.addEventListener('click', event => {
    if (!sourcePanel.contains(event.target)) sourcePanel.querySelectorAll('details[open]').forEach(item => item.open = false);
  });
  sourcePanel.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      const open = sourcePanel.querySelector('details[open]');
      if (open) { open.open = false; open.querySelector('summary').focus(); }
    }
  });
  const sourceKeys = isHome ? Object.keys(SOURCE_LABELS) : [key];
  const renderSources = () => {
    const openKey = sourcePanel.querySelector('details[open]')?.dataset.source;
    sourcePanel.replaceChildren();
    sourceKeys.forEach(sourceKey => {
      const source = sourceStates[sourceKey] || {};
      const item = document.createElement('details');
      item.className = 'source-item source-' + (source.state || 'loading');
      item.dataset.source = sourceKey;
      item.open = openKey === sourceKey;
      item.addEventListener('toggle', () => {
        if (item.open) sourcePanel.querySelectorAll('details[open]').forEach(other => { if (other !== item) other.open = false; });
      });
      const summary = document.createElement('summary');
      const title = document.createElement('strong');
      title.textContent = SOURCE_LABELS[sourceKey];
      const detail = document.createElement('span');
      const labels = { live: 'Terbaru', cache: 'Tersimpan', stale: 'Data lama', error: 'Gagal', loading: 'Memuat…' };
      detail.textContent = labels[source.state] || 'Menunggu…';
      summary.append(title, detail);
      const popup = document.createElement('div');
      popup.className = 'source-detail';
      const time = document.createElement('small');
      time.textContent = source.timestamp ? 'Diambil ' + new Date(source.timestamp).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : 'Belum ada waktu pengambilan';
      popup.appendChild(time);
      if (source.message) {
        const error = document.createElement('small');
        error.textContent = source.message;
        popup.appendChild(error);
      }
      item.append(summary, popup);
      sourcePanel.appendChild(item);
    });
    refresh.disabled = sourceKeys.some(sourceKey => sourceStates[sourceKey]?.state === 'loading');
    const connect = document.getElementById('config-btn') || document.querySelector('.config-btn');
    if (connect) connect.disabled = refresh.disabled;
  };
  document.addEventListener('dashboard:source', renderSources);
  renderSources();
  if (typeof Chart === 'undefined') {
    const notice = document.createElement('p');
    notice.className = 'data-note';
    notice.textContent = 'Grafik belum dapat dimuat. Periksa koneksi internet lalu muat ulang halaman.';
    header.appendChild(notice);
  }
}
