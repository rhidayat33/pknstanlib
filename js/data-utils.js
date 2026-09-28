/* Shared data rules. This file has no browser or network dependencies. */
function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function parseSimilarity(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const text = String(value).trim().replace(/%$/, '').trim().replace(',', '.');
  const number = Number(text);
  return Number.isFinite(number) && number >= 0 && number <= 100 ? number : null;
}

function deriveStatus(similarity) {
  if (similarity === null) return 'Proses';
  if (similarity <= 30) return 'Lolos';
  if (similarity <= 50) return 'Revisi';
  return 'Tidak Lolos';
}

function normalizeKTIRow(row) {
  if (Array.isArray(row)) {
    row = Object.fromEntries(['timestamp', 'nim', 'nama', 'prodi', 'jenis_kti', 'judul', 'similarity', 'status']
      .map((key, index) => [key, row[index]]));
  }
  // The old deployment mapped six-column Details Reports onto the KTI form.
  // Recover only when all identifying fields match that known layout.
  const legacyDetails = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(row.nama || ''))
    && /^\d{4}-\d{2}-\d{2}T/.test(String(row.prodi || ''))
    && /^\d+$/.test(String(row.jenis_kti || ''));
  if (legacyDetails) {
    const similarity = parseSimilarity(row.judul);
    return {
      timestamp: String(row.prodi), nim: '',
      nama: [row.timestamp, row.nim].filter(Boolean).join(' ').trim(),
      prodi: 'Tidak tersedia', jenis_kti: 'Tidak tersedia', judul: '',
      similarity, status: deriveStatus(similarity), sourceFormat: 'details-report',
    };
  }
  const similarity = parseSimilarity(row.similarity ?? row.persentase ?? row['Persentase Similaritas'] ?? row['% Similaritas'] ?? row.persen);
  const rawStatus = String(row.status ?? row.Status ?? row.hasil ?? row.Hasil ?? '').trim();
  const status = ['Lolos', 'Revisi', 'Tidak Lolos', 'Proses'].find(value => value.toLowerCase() === rawStatus.toLowerCase()) || rawStatus || deriveStatus(similarity);
  return {
    timestamp: String(row.timestamp ?? row.Timestamp ?? row.tanggal ?? row.Tanggal ?? '').trim(),
    nim: String(row.nim ?? row.NIM ?? row.nim_mahasiswa ?? '').trim(),
    nama: String(row.nama ?? row.Nama ?? row.nama_mahasiswa ?? '').trim(),
    prodi: String(row.prodi ?? row.Prodi ?? row.program_studi ?? '').trim() || 'Tidak Diketahui',
    jenis_kti: String(row.jenis_kti ?? row.jenis ?? row.Jenis ?? row['Jenis KTI'] ?? '').trim() || 'KTI',
    judul: String(row.judul ?? row.Judul ?? row.title ?? '').trim(),
    similarity,
    status,
    sourceFormat: row.sourceFormat || 'kti-form',
  };
}

function averageSimilarity(rows) {
  const values = rows.map(row => row.similarity).filter(Number.isFinite);
  return values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1) : null;
}

function uniqueUserCount(rows, getId = row => row.nipnim) {
  return new Set(rows.map(row => String(getId(row) ?? '').trim()).filter(Boolean)).size;
}

function csvCell(value) {
  let text = String(value ?? '');
  // Prevent spreadsheet applications from evaluating supplied text as formulas.
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

function createCSV(headers, rows) {
  return '\uFEFF' + [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
}
