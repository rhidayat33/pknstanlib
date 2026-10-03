const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

function context() {
  const storage = new Map();
  const ctx = vm.createContext({
    console, URL, AbortController, setTimeout, clearTimeout,
    document: { addEventListener() {}, dispatchEvent() {} },
    window: { location: { pathname: '/index.html' } },
    sessionStorage: { getItem: () => 'session_pknstanlib_authenticated' },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
  });
  ctx.load = file => vm.runInContext(fs.readFileSync(path.join(root, 'js', file), 'utf8'), ctx, { filename: file });
  ctx.run = code => vm.runInContext(code, ctx);
  ctx.load('data-utils.js');
  ctx.load('app.js');
  return ctx;
}

test('similarity: distinguish missing values from zero and enforce valid range', () => {
  const c = context();
  for (const value of [null, undefined, '', ' ', 'n/a', -1, 101, Infinity]) assert.equal(c.parseSimilarity(value), null);
  assert.equal(c.parseSimilarity('0%'), 0);
  assert.equal(c.parseSimilarity('30,5%'), 30.5);
  assert.equal(c.normalizeKTIRow({ similarity: '' }).status, undefined);
  assert.equal(c.normalizeKTIRow({ similarity: 0, status: 'Lolos' }).status, undefined);
  assert.equal(c.normalizeKTIRow(['2026-01-01', '001', 'A', 'P', 'KTI', 'Title', '31%']).status, undefined);
  assert.equal(c.averageSimilarity([{ similarity: 0 }, { similarity: 30 }, { similarity: null }]), '15.0');
  assert.equal(c.averageSimilarity([{ similarity: null }]), null);
});

test('months and impossible day-first dates are handled consistently', () => {
  const c = context();
  assert.equal(c.normalizeMonthLabel('May 2026'), 'Mei 2026');
  assert.equal(c.normalizeMonthLabel('Aug-2026'), 'Agu 2026');
  assert.equal(c.normalizeMonthLabel('Dec/2026'), 'Des 2026');
  assert.equal(c.parseDate('31/02/2026'), null);
  assert.equal(c.parseDate('29/02/2025'), null);
  assert.equal(c.parseDate('29/02/2024').getDate(), 29);
  assert.equal(c.parseDate('01/01/2026 25:00:00'), null);
});

test('safe text, formula-resistant CSV, unique IDs, prototype-like prodi names', () => {
  const c = context();
  assert.equal(c.escapeHTML('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(c.csvCell('=1+1'), '"\'=1+1"');
  assert.equal(c.csvCell('a,"b"'), '"a,""b"""');
  assert.equal(c.uniqueUserCount([{ nipnim: '01' }, { nipnim: '01 ' }, { nipnim: '' }, { nipnim: '02' }]), 2);
  assert.equal(c.countBy(['__proto__', '__proto__'], row => row)['__proto__'], 2);
});

test('cache uses source URL, force refresh, timestamps, and stale fallback', async () => {
  const c = context();
  let calls = 0;
  c.fetch = async () => { calls++; return { ok: true, json: async () => [{ nipnim: '001' }] }; };
  const url = c.getStoredApiUrl('lseg');
  await c.fetchWithCache(url, 'lseg');
  assert.equal(c.run("sourceStates.lseg.state"), 'live');
  const timestamp = c.getCachedData('lseg').timestamp;
  await c.fetchWithCache(url, 'lseg');
  assert.equal(calls, 1);
  assert.equal(c.run("sourceStates.lseg.state"), 'cache');
  await c.fetchWithCache(url, 'lseg', { force: true });
  assert.equal(calls, 2);
  c.fetch = async () => { throw Error('offline'); };
  const before = c.getCachedData('lseg').timestamp;
  const rows = await c.fetchWithCache(url, 'lseg', { force: true });
  assert.equal(rows.length, 1);
  assert.equal(c.run("sourceStates.lseg.state"), 'stale');
  assert.equal(c.getCachedData('lseg').timestamp, before);
  assert.ok(before >= timestamp);
  assert.equal(c.getCachedData('lseg', url + '?sheet=other'), null);
  await assert.rejects(c.fetchWithCache(url + '?sheet=other', 'lseg'), /offline/);
  assert.equal(c.run("sourceStates.lseg.state"), 'error');
});

test('invalid API payload is never cached; an empty array is valid', async () => {
  const c = context();
  const url = c.getStoredApiUrl('kti');
  c.fetch = async () => ({ ok: true, json: async () => ({ error: 'denied' }) });
  await assert.rejects(c.fetchWithCache(url, 'kti'), /denied/);
  assert.equal(c.getCachedData('kti'), null);
  c.fetch = async () => ({ ok: true, json: async () => [] });
  assert.equal((await c.fetchWithCache(url, 'kti')).length, 0);
  assert.equal(c.run("sourceStates.kti.state"), 'live');
});

test('home KTI matches details and STATA array timestamp uses the sixth field', () => {
  const c = context(); c.load('home.js');
  const summary = c.processKTIData([{ similarity: 0 }, { similarity: 60 }, { similarity: null }]);
  assert.equal(summary.avgSim, '30.0');
  assert.equal(summary.totalPengajuan, 3);
  assert.equal(summary.scored, 2);
  assert.equal(summary.unscored, 1);
  assert.equal(summary.lolos, undefined);
  const stata = c.processSTATAData([['A', '3001', '', 'P', 'Research', '2026-09-01']]);
  assert.equal(stata.monthlyTotals['Sep 2026'], 1);
});

test('refresh KTI replaces processed cache instead of showing previous rows', async () => {
  const c = context(); c.load('similaritas-kti.js');
  const element = { style: {} };
  c.document.getElementById = () => element;
  c.showToast = () => {};
  c.populateFilters = () => {};
  c.renderAll = () => {};
  let rows = [{ nama: 'First', similarity: 0 }];
  c.fetch = async () => ({ ok: true, json: async () => rows });
  await c.fetchData(c.getStoredApiUrl('kti'), true);
  assert.equal(c.getProcessedData()[0].nama, 'First');
  rows = [{ nama: 'Second', similarity: 50 }];
  await c.fetchData(c.getStoredApiUrl('kti'), true);
  assert.equal(c.getProcessedData()[0].nama, 'Second');
});

test('Apps Script KTI reads percentage formats without inferring outcomes', () => {
  const values = [
    ['', '1', 'A', 'P', 'KTI', 'Title', 0.4, ''],
    ['', '2', 'B', 'P', 'KTI', 'Title', '', ''],
    ['', '3', 'C', 'P', 'KTI', 'Title', 0, ''],
  ];
  const formats = values.map((_, index) => Array.from({ length: 8 }, (_, col) => index === 0 && col === 6 ? '0%' : 'General'));
  const sheet = { getLastRow: () => 4, getLastColumn: () => 8, getRange: () => ({ getValues: () => values, getNumberFormats: () => formats }) };
  const c = vm.createContext({
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheets: () => [sheet] }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) },
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'apps-script/kti-apps-script.js'), 'utf8'), c);
  const result = vm.runInContext('doGet({parameter:{secret:SECRET_TOKEN}})', c);
  assert.equal(result[0].similarity, 40);
  assert.equal(result[0].status, '');
  assert.equal(result[1].similarity, null);
  assert.equal(result[1].status, '');
  assert.equal(result[2].similarity, 0);
});

test('legacy Details Report mapping restores date and actual similarity without inventing prodi', () => {
  const c = context(); c.load('home.js');
  const row = { timestamp: 'Test', nim: 'User', nama: 'test@example.org', prodi: '2026-01-02T00:00:00Z', jenis_kti: '1500', judul: '61', similarity: 0, status: 'Lolos' };
  const result = c.normalizeKTIRow(row);
  assert.equal(result.nama, 'Test User');
  assert.equal(result.nim, '');
  assert.equal(result.prodi, 'Tidak tersedia');
  assert.equal(result.similarity, 61);
  assert.equal(result.status, undefined);
  assert.equal(c.processKTIData([row]).monthlyTotals['Jan 2026'], 1);
  // A normal form remains unchanged even if a name resembles an email address.
  assert.equal(c.normalizeKTIRow({ ...row, prodi: 'Akuntansi', similarity: 25 }).similarity, 25);
});

test('Apps Script recognizes six-column Details Reports by header, including real zero', () => {
  const headers = ['User first name', 'User last name', 'User email', 'Date processed', 'Words count', 'Similarity score'];
  const rows = [['Test', 'User', 'test@example.org', '2026-01-02T00:00:00Z', 2000, 0], ['Test', 'Two', 'two@example.org', '2026-01-03T00:00:00Z', 2500, 61]];
  const sheet = {
    getLastRow: () => rows.length + 1, getLastColumn: () => headers.length,
    getRange: row => ({ getValues: () => row === 1 ? [headers] : rows, getNumberFormats: () => rows.map(() => Array(8).fill('General')) }),
  };
  const c = vm.createContext({
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheets: () => [sheet] }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) },
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'apps-script/kti-apps-script.js'), 'utf8'), c);
  const result = vm.runInContext('doGet({parameter:{secret:SECRET_TOKEN}})', c);
  assert.equal(result.length, 2);
  assert.equal(result[0].similarity, 0);
  assert.equal(result[0].status, '');
  assert.equal(result[0].prodi, 'Tidak tersedia');
  assert.equal(result[1].similarity, 61);
  assert.equal(result[1].status, '');
});

test('CSV export includes every filtered row rather than just the visible page', async () => {
  const c = context(); c.load('dashboard-tools.js');
  let blob, clicked = false;
  c.Blob = Blob;
  c.URL = class extends URL { static createObjectURL(value) { blob = value; return 'blob:test'; } static revokeObjectURL() {} };
  c.document.createElement = () => ({ click() { clicked = true; } });
  c.setTimeout = callback => callback();
  c.showToast = () => {};
  c.getFilteredData = () => Array.from({ length: 25 }, (_, index) => ({ nipnim: '000' + index, prodi: 'Test', tanggal: '2026-01-01', tujuan: index ? 'Research' : '=1+1' }));
  c.exportCurrentData('lseg');
  assert.equal(clicked, true);
  const csv = await blob.text();
  assert.equal(csv.split('\r\n').length, 26);
  assert.ok(csv.includes('"00024"'));
  assert.ok(csv.includes('"\'=1+1"'));
});

test('KTI periods and filters handle multiple years, zero scores, missing dates and empty selections', () => {
  const c = context(); c.load('similaritas-kti.js');
  c.run(`ktiRawData = [
    {timestamp:'15/01/2025',nama:'A',similarity:0,status:'Lolos'},
    {timestamp:'20/01/2025',nama:'B',similarity:40},
    {timestamp:'15/02/2025',nama:'A',similarity:null},
    {timestamp:'15/01/2026',nama:'A',similarity:100},
    {timestamp:'bad-date',nama:'C',similarity:20}
  ]`);
  const elements = {'kti-filter-year':{value:'all'}, 'kti-filter-month':{value:'all'}};
  c.document.getElementById = id => elements[id];
  const data = c.getFilteredData();
  assert.equal(data.length, 5);
  const years = c.summarizeKTIPeriods(data, 'year');
  assert.deepEqual(Array.from(years, group => [group.key, group.total, group.scored, group.average]), [['2025',3,2,'20.0'],['2026',1,1,'100.0']]);
  const months = c.summarizeKTIPeriods(data, 'month');
  assert.deepEqual(Array.from(months, group => [group.key, group.total, group.average]), [['2025-01',2,'20.0'],['2025-02',1,null],['2026-01',1,'100.0']]);
  elements['kti-filter-month'].value = '1';
  assert.equal(c.getFilteredData().length, 3);
  elements['kti-filter-year'].value = '2025';
  assert.equal(c.getFilteredData().length, 2);
  elements['kti-filter-month'].value = '3';
  assert.equal(c.getFilteredData().length, 0);
  const distribution = c.similarityDistribution([0,10,10.5,20,90,90.1,100,null].map(similarity => ({similarity})));
  assert.deepEqual(Array.from(distribution.counts), [3,2,0,0,0,0,0,0,1,2]);
  assert.equal(distribution.counts.reduce((a, b) => a + b, 0), 8);
  assert.equal(c.averageSimilarity([{similarity:10}, {similarity:null}]), '10.0');
});

test('KTI export omits inferred statuses and unavailable form fields', async () => {
  const c = context(); c.load('dashboard-tools.js');
  let blob;
  c.Blob = Blob;
  c.URL = class extends URL { static createObjectURL(value) { blob = value; return 'blob:test'; } static revokeObjectURL() {} };
  c.document.createElement = () => ({click() {}});
  c.setTimeout = callback => callback(); c.showToast = () => {};
  c.getFilteredData = () => [{timestamp:'2026-01-15',nama:'Test',similarity:0,status:'Lolos'}];
  c.exportCurrentData('kti');
  const csv = await blob.text();
  assert.ok(csv.includes('"Similaritas (%)"'));
  assert.ok(csv.includes('"0"'));
  assert.ok(!/Status|Lolos|NIM|Judul/.test(csv));
});
