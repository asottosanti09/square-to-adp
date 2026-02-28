'use strict';

// ================================================================
// CONFIGURATION
// ================================================================
const RESTAURANTS = [
  {
    name: "L'industrie Pizzeria",
    locations: [
      { name: 'Brooklyn',     adpIid: '32204797' },
      { name: 'West Village', adpIid: '32204791' },
      { name: 'Little Italy', adpIid: '' }
    ]
  },
  {
    name: 'Court Street Grocers',
    locations: [
      { name: 'Greenwich Village', adpIid: '' },
      { name: 'Williamsburg',      adpIid: '' },
      { name: 'Carroll Gardens',   adpIid: '' },
      { name: 'Midtown',           adpIid: '' }
    ]
  },
  { name: 'Elbow Bread', adpIid: '' },
  { name: 'S&P Lunch',   adpIid: '' }
];

const SPREAD_HOUR_RATE = 17;  // $ per spread-hour credit
const PAY_FREQUENCY    = 'W';
const RATE_CODE        = 'BASE';

const ADP_HEADERS = [
  'ADP IID', 'Pay Frequency', 'Pay Period Start', 'Pay Period End',
  'Employee Id', 'Earnings Code', 'Pay Hours', 'Dollars',
  'Separate Check', 'Department', 'Rate Code'
];

// ================================================================
// STATE
// ================================================================
const state = {
  restaurant:   null,
  location:     null,
  weekStart:    null,
  weekEnd:      null,
  squareRows:   null,   // raw parsed Square CSV rows
  tipsHeaders:  null,   // column headers from tips file
  tipsRawRows:  null,   // raw row objects from tips file
  outputCsv:    null,
  outputName:   null
};

// ================================================================
// INIT
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
  populateRestaurants();
  setupListeners();
});

function populateRestaurants() {
  const sel = document.getElementById('restaurant');
  RESTAURANTS.forEach(r => {
    const o = document.createElement('option');
    o.value = r.name;
    o.textContent = r.name;
    sel.appendChild(o);
  });
}

function setupListeners() {
  document.getElementById('restaurant').addEventListener('change', onRestaurantChange);
  document.getElementById('location').addEventListener('change',   onLocationChange);
  document.getElementById('weekStart').addEventListener('change',  onWeekStartChange);
  document.getElementById('squareFile').addEventListener('change', onSquareUpload);
  document.getElementById('tipsFile').addEventListener('change',   onTipsUpload);
  document.getElementById('processBtn').addEventListener('click',  onProcess);
  document.getElementById('downloadBtn').addEventListener('click', onDownload);

  // Drag-and-drop
  setupDropZone('square-zone', 'squareFile', onSquareUpload);
  setupDropZone('tips-zone',   'tipsFile',   onTipsUpload);

  // Remove / clear buttons
  document.getElementById('square-remove').addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    clearUpload('square-zone', 'squareFile', 'square-status');
    state.squareRows = null;
    checkReady();
  });
  document.getElementById('tips-remove').addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    clearUpload('tips-zone', 'tipsFile', 'tips-status');
    state.tipsHeaders = null;
    state.tipsRawRows = null;
    document.getElementById('tips-col-mapper').classList.add('hidden');
    checkReady();
  });
}

// ================================================================
// DRAG-AND-DROP HELPER
// ================================================================
function setupDropZone(zoneId, inputId, handler) {
  const zone = document.getElementById(zoneId);

  zone.addEventListener('dragenter', e => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', e => {
    // only fire when leaving the zone itself (not a child element)
    if (!zone.contains(e.relatedTarget)) {
      zone.classList.remove('drag-over');
    }
  });
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (!file) return;
    // Inject the file into the hidden input and fire the handler
    const input = document.getElementById(inputId);
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    handler({ target: input });
  });
}

// ================================================================
// CLEAR / REMOVE UPLOAD
// ================================================================
function clearUpload(zoneId, inputId, statusId) {
  const zone   = document.getElementById(zoneId);
  const input  = document.getElementById(inputId);
  const status = document.getElementById(statusId);

  // Reset file input
  input.value = '';
  // Hide status bar
  status.style.display = 'none';
  status.textContent   = '';
  status.className     = 'file-status';
  // Remove has-file class (also hides X button via CSS)
  zone.classList.remove('has-file');
}

// ================================================================
// RESTAURANT / LOCATION HANDLERS
// ================================================================
function onRestaurantChange() {
  const name = document.getElementById('restaurant').value;
  const locGroup = document.getElementById('location-group');
  const locSel   = document.getElementById('location');

  locSel.innerHTML = '<option value="">Select a location…</option>';
  locSel.disabled  = true;
  state.restaurant = null;
  state.location   = null;

  if (!name) { checkReady(); return; }

  const rest = RESTAURANTS.find(r => r.name === name);
  if (!rest) { checkReady(); return; }

  state.restaurant = rest;

  if (rest.locations && rest.locations.length > 0) {
    rest.locations.forEach(loc => {
      const o = document.createElement('option');
      o.value = loc.name;
      o.textContent = loc.name;
      locSel.appendChild(o);
    });
    locSel.disabled = false;
    locGroup.style.display = '';
  } else {
    // No sub-locations — hide the location picker
    locGroup.style.display = 'none';
    state.location = { name: rest.name, adpIid: rest.adpIid || '' };
  }
  checkReady();
}

function onLocationChange() {
  const name = document.getElementById('location').value;
  state.location = null;
  if (!name || !state.restaurant) { checkReady(); return; }
  const loc = (state.restaurant.locations || []).find(l => l.name === name);
  if (loc) state.location = loc;
  checkReady();
}

// ================================================================
// DATE HANDLER
// ================================================================
function onWeekStartChange() {
  const val  = document.getElementById('weekStart').value;
  const errEl = document.getElementById('date-error');
  const endGrp = document.getElementById('week-end-display');
  const endEl  = document.getElementById('weekEndDate');

  state.weekStart = null;
  state.weekEnd   = null;
  endGrp.style.display = 'none';
  errEl.classList.add('hidden');

  if (!val) { checkReady(); return; }

  const d = parseDateInput(val);
  if (d.getDay() !== 1) {
    errEl.classList.remove('hidden');
    document.getElementById('weekStart').value = '';
    checkReady();
    return;
  }

  state.weekStart = d;
  state.weekEnd   = addDays(d, 6);   // that Sunday

  endEl.textContent    = formatDate(state.weekEnd);
  endGrp.style.display = '';
  checkReady();
}

// ================================================================
// FILE UPLOAD HANDLERS
// ================================================================
function onSquareUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  state.squareRows = null;
  setFileStatus('square-status', 'Reading…', 'loading');

  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const rows = parseSquareCsv(ev.target.result);
      state.squareRows = rows;

      // Detect how many unique locations are in the file
      const locs = [...new Set(rows.map(r => (r['Location'] || '').trim()).filter(Boolean))];
      const locNote = locs.length > 1
        ? ` ⚠ Multiple locations found: ${locs.join(', ')}`
        : locs.length === 1 ? ` · Location: ${locs[0]}` : '';

      setFileStatus('square-status', `✓ ${file.name} — ${rows.length} shift rows loaded${locNote}`,
        locs.length <= 1 ? 'success' : 'loading');
      document.getElementById('square-zone').classList.add('has-file');
    } catch (err) {
      setFileStatus('square-status', '✗ ' + err.message, 'error');
      state.squareRows = null;
    }
    checkReady();
  };
  reader.onerror = () => { setFileStatus('square-status', '✗ Could not read file', 'error'); checkReady(); };
  reader.readAsText(file);
}

function onTipsUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  state.tipsHeaders  = null;
  state.tipsRawRows  = null;
  setFileStatus('tips-status', 'Reading…', 'loading');

  const ext = (file.name.split('.').pop() || '').toLowerCase();

  const finish = (headers, rows, err) => {
    if (err) {
      setFileStatus('tips-status', '✗ ' + err, 'error');
      checkReady();
      return;
    }
    state.tipsHeaders = headers;
    state.tipsRawRows = rows;
    document.getElementById('tips-zone').classList.add('has-file');
    populateColMapper(headers);
    setFileStatus('tips-status', `✓ ${file.name} — ${rows.length} data rows`, 'success');
    checkReady();
  };

  if (ext === 'csv') {
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const { headers, rows } = parseFlatCsv(ev.target.result);
        finish(headers, rows, null);
      } catch (err) { finish(null, null, err.message); }
    };
    reader.readAsText(file);
  } else if (ext === 'xlsx' || ext === 'xls') {
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const { headers, rows } = parseFlatExcel(ev.target.result);
        finish(headers, rows, null);
      } catch (err) { finish(null, null, err.message); }
    };
    reader.readAsArrayBuffer(file);
  } else {
    setFileStatus('tips-status', '✗ Unsupported format — use CSV or Excel (.xlsx)', 'error');
    checkReady();
  }
}

// ================================================================
// TIPS COLUMN MAPPER UI
// ================================================================
function populateColMapper(headers) {
  const mapper  = document.getElementById('tips-col-mapper');
  const nameSel = document.getElementById('col-name');
  const amtSel  = document.getElementById('col-amount');

  // Build option list: first entry = "— not used —"
  const makeOpts = () => {
    const none = document.createElement('option');
    none.value = '';
    none.textContent = '— not used —';
    return none;
  };

  nameSel.innerHTML = '';
  amtSel.innerHTML  = '';
  nameSel.appendChild(makeOpts());
  amtSel.appendChild(makeOpts());

  headers.forEach((h, i) => {
    const addOpt = (sel, selected) => {
      const o = document.createElement('option');
      o.value = i;
      o.textContent = h || `Column ${i + 1}`;
      if (selected) o.selected = true;
      sel.appendChild(o);
    };
    addOpt(nameSel, false);
    addOpt(amtSel,  false);
  });

  // Auto-select best guesses
  const lower = headers.map(h => String(h || '').toLowerCase().trim());

  // Name col: prefer "name", then "employee", then first col
  const nameGuess = lower.findIndex(h => h === 'name' || h === 'employee name')
    ?? lower.findIndex(h => h.includes('name'));
  if (nameGuess >= 0) nameSel.value = nameGuess;
  else if (headers.length > 0) nameSel.value = 0;

  // Amount col: prefer "total", "tips", "tip total"
  const amtGuess = (() => {
    const checks = [
      h => h === 'total tips' || h === 'tips total',
      h => h === 'total',
      h => h.includes('total') && h.includes('tip'),
      h => h === 'tips',
      h => h.includes('tip'),
      h => h.includes('amount')
    ];
    for (const test of checks) {
      const idx = lower.findIndex(test);
      if (idx >= 0) return idx;
    }
    return lower.length - 1;
  })();
  amtSel.value = amtGuess;

  mapper.classList.remove('hidden');
}

// ================================================================
// PROCESS
// ================================================================
function onProcess() {
  if (!isReady()) return;
  try {
    const result = processData();
    state.outputCsv  = result.csv;
    state.outputName = result.filename;
    displayResults(result);
    const sec = document.getElementById('results-section');
    sec.style.display = '';
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    alert('Processing error: ' + err.message);
    console.error(err);
  }
}

function onDownload() {
  if (!state.outputCsv) return;
  downloadFile(state.outputCsv, state.outputName, 'text/csv;charset=utf-8;');
}

// ================================================================
// CORE DATA PROCESSING
// ================================================================
function processData() {
  const { weekStart, weekEnd, squareRows, tipsHeaders, tipsRawRows, restaurant, location } = state;

  const adpIid = location
    ? (location.adpIid || '')
    : (restaurant ? (restaurant.adpIid || '') : '');

  // ── 1. Use all Square rows as-is (user is responsible for uploading the correct week)
  const weekRows = squareRows;

  // ── 2. Aggregate per employee ───────────────────────────────
  const employees = aggregateEmployees(weekRows);

  // ── 3. Parse tips ──────────────────────────────────────────
  let tipsMap   = {};
  let tipsTotal = 0;
  if (tipsHeaders && tipsRawRows) {
    const nameIdx = parseInt(document.getElementById('col-name').value,  10);
    const amtIdx  = parseInt(document.getElementById('col-amount').value, 10);
    ({ tipsMap, tipsTotal } = extractTipsFromRows(tipsHeaders, tipsRawRows, nameIdx, amtIdx));
  }

  // ── 4. Generate ADP rows ────────────────────────────────────
  const config = {
    adpIid,
    payPeriodStart: formatDate(weekStart),
    payPeriodEnd:   formatDate(weekEnd)
  };
  const { adpRows, matchedTips, unmatchedTipNames } = generateAdpRows(employees, tipsMap, config);

  // ── 5. Validate ─────────────────────────────────────────────
  const validation = buildValidation(employees, tipsMap, matchedTips, unmatchedTipNames);

  // ── 6. Build CSV ─────────────────────────────────────────────
  const csv = generateCsv(adpRows);

  // ── 7. Filename ──────────────────────────────────────────────
  const locName  = location ? location.name : (restaurant ? restaurant.name : 'export');
  const dateSlug = [
    weekStart.getFullYear(),
    String(weekStart.getMonth() + 1).padStart(2, '0'),
    String(weekStart.getDate()).padStart(2, '0')
  ].join('-');
  const filename = `ADP_Import_${locName.replace(/[^a-zA-Z0-9]/g, '_')}_${dateSlug}.csv`;

  return { csv, filename, adpRows, employees, tipsMap, tipsTotal, validation };
}

// ================================================================
// PARSING — Square CSV
// ================================================================
function parseSquareCsv(text) {
  const result = Papa.parse(text.trim(), {
    header:          true,
    skipEmptyLines:  true,
    transformHeader: h => h.trim()
  });
  if (result.errors.length && result.data.length === 0) {
    throw new Error(result.errors[0].message);
  }
  // Verify expected columns exist
  const fields = result.meta.fields || [];
  const required = ['Regular hours', 'Overtime hours', 'Spread of hours credit', 'Clockin date'];
  required.forEach(col => {
    if (!fields.includes(col)) throw new Error(`Square CSV is missing column: "${col}"`);
  });
  return result.data;
}

// ================================================================
// PARSING — Tips file (CSV / Excel) — returns { headers, rows }
// ================================================================
function parseFlatCsv(text) {
  const result = Papa.parse(text.trim(), {
    header:         false,
    skipEmptyLines: true
  });
  if (result.data.length < 1) throw new Error('Tips CSV appears to be empty');
  const raw = result.data;
  // First row → headers (as strings)
  const headers = raw[0].map(h => String(h || '').trim());
  const rows    = raw.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] != null ? row[i] : ''; });
    return obj;
  });
  return { headers, rows };
}

function parseFlatExcel(arrayBuffer) {
  const wb    = XLSX.read(arrayBuffer, { type: 'array' });
  const ws    = wb.Sheets[wb.SheetNames[0]];
  const raw   = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (raw.length < 1) throw new Error('Tips Excel file appears to be empty');
  const headers = raw[0].map(h => String(h || '').trim());
  const rows    = raw.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] != null ? row[i] : ''; });
    return obj;
  });
  return { headers, rows };
}

function extractTipsFromRows(headers, rows, nameColIdx, amtColIdx) {
  const tipsMap = {};
  let tipsTotal = 0;

  const nameHeader = headers[nameColIdx];
  const amtHeader  = headers[amtColIdx];

  rows.forEach(row => {
    const rawName = String(row[nameHeader] || '').trim();
    if (!rawName) return;

    const rawAmt = row[amtHeader];
    const amount = parseCurrency(String(rawAmt || ''));
    if (!(amount > 0)) return;

    const key = normalizeName(rawName);
    tipsMap[key] = (tipsMap[key] || 0) + amount;
    tipsTotal += amount;
  });

  return { tipsMap, tipsTotal };
}

// ================================================================
// WEEK FILTER
// ================================================================
function filterByWeek(rows, weekStart, weekEnd) {
  const s = dateOnly(weekStart);
  const e = dateOnly(weekEnd);

  return rows.filter(row => {
    const d = parseSquareDate(row['Clockin date']);
    if (!d) return false;
    const dOnly = dateOnly(d);
    return dOnly >= s && dOnly <= e;
  });
}

// ================================================================
// AGGREGATE EMPLOYEES
// ================================================================
function aggregateEmployees(rows) {
  const map = {};

  rows.forEach(row => {
    const empNum   = (row['Employee number'] || '').trim();
    const firstName = (row['First name'] || '').trim();
    const lastName  = (row['Last name']  || '').trim();

    // Key: employee number (preferred) or normalised full name
    const key = empNum || normalizeName(`${firstName} ${lastName}`);
    if (!key) return;

    if (!map[key]) {
      map[key] = {
        employeeNumber: empNum,
        firstName,
        lastName,
        regularHours:  0,
        overtimeHours: 0,
        spreadCredits: 0,
        _matchedTip:   null
      };
    }

    map[key].regularHours  += parseFloat(row['Regular hours'])          || 0;
    map[key].overtimeHours += parseFloat(row['Overtime hours'])         || 0;
    map[key].spreadCredits += parseFloat(row['Spread of hours credit']) || 0;
  });

  return map;
}

// ================================================================
// GENERATE ADP ROWS
// ================================================================
function generateAdpRows(employees, tipsMap, config) {
  const { adpIid, payPeriodStart, payPeriodEnd } = config;
  const adpRows        = [];
  const matchedTips    = {};   // normalised name → amount matched
  const unmatchedTipNames = new Set(Object.keys(tipsMap));

  Object.values(employees).forEach(emp => {
    const empId = emp.employeeNumber || '';

    // REG ──────────────────────────────────────────────────────
    if (emp.regularHours > 0) {
      adpRows.push(makeRow(adpIid, payPeriodStart, payPeriodEnd, empId, 'REG',
        fmt(emp.regularHours), ''));
    }

    // OVT ──────────────────────────────────────────────────────
    if (emp.overtimeHours > 0) {
      adpRows.push(makeRow(adpIid, payPeriodStart, payPeriodEnd, empId, 'OVT',
        fmt(emp.overtimeHours), ''));
    }

    // CREDTIPP ─────────────────────────────────────────────────
    const tipAmt = findTip(emp.firstName, emp.lastName, tipsMap);
    if (tipAmt !== null && tipAmt > 0) {
      adpRows.push(makeRow(adpIid, payPeriodStart, payPeriodEnd, empId, 'CREDTIPP',
        '', fmt(tipAmt)));
      const nKey = bestTipKey(emp.firstName, emp.lastName, tipsMap);
      if (nKey) {
        matchedTips[nKey] = tipAmt;
        unmatchedTipNames.delete(nKey);
      }
      emp._matchedTip = tipAmt;
    }

    // OTH2 — spread hours ──────────────────────────────────────
    if (emp.spreadCredits > 0) {
      const spreadDollars = round2(emp.spreadCredits * SPREAD_HOUR_RATE);
      adpRows.push(makeRow(adpIid, payPeriodStart, payPeriodEnd, empId, 'OTH2',
        '', fmt(spreadDollars)));
    }
  });

  return { adpRows, matchedTips, unmatchedTipNames: [...unmatchedTipNames] };
}

function makeRow(adpIid, start, end, empId, code, hours, dollars) {
  return [adpIid, PAY_FREQUENCY, start, end, empId, code, hours, dollars, '', '', RATE_CODE];
}

// ================================================================
// TIP MATCHING HELPERS
// ================================================================
function findTip(firstName, lastName, tipsMap) {
  const key = bestTipKey(firstName, lastName, tipsMap);
  return key !== null ? tipsMap[key] : null;
}

function bestTipKey(firstName, lastName, tipsMap) {
  const fn = (firstName || '').toLowerCase().trim();
  const ln = (lastName  || '').toLowerCase().trim();

  const candidates = [
    `${fn} ${ln}`,
    `${ln} ${fn}`,
    `${ln}, ${fn}`
  ].filter(c => c.trim().length > 2);

  for (const c of candidates) {
    if (tipsMap[c] !== undefined) return c;
  }

  // Fuzzy: any tips key that contains both name tokens
  if (fn && ln) {
    for (const key of Object.keys(tipsMap)) {
      if (key.includes(fn) && key.includes(ln)) return key;
    }
  }
  return null;
}

// ================================================================
// VALIDATION
// ================================================================
function buildValidation(employees, tipsMap, matchedTips, unmatchedTipNames) {
  const warnings = [];
  const infos    = [];

  // Employees without ADP employee numbers
  const noId = Object.values(employees).filter(e => !e.employeeNumber);
  if (noId.length > 0) {
    warnings.push({
      text: `${noId.length} employee(s) are missing an Employee Number in Square — the Employee Id column in the output will be blank.`,
      detail: noId.map(e => `${e.firstName} ${e.lastName}`).join(', ')
    });
  }

  // Tip validation — compare CREDTIPP output total against recognized employees only
  // (avoids false mismatches from "Total" rows or unmatched names in the tips file)
  if (Object.keys(tipsMap).length > 0) {
    const matchedCount = Object.keys(matchedTips).length;
    const matchedTotal = Object.values(matchedTips).reduce((s, v) => s + v, 0);

    if (matchedCount > 0) {
      infos.push(`✓ CREDTIPP total: $${matchedTotal.toFixed(2)} across ${matchedCount} recognized employee${matchedCount !== 1 ? 's' : ''}`);
    }

    if (unmatchedTipNames.length > 0) {
      warnings.push({
        text: `${unmatchedTipNames.length} name(s) in the tips file could not be matched to any Square employee — no CREDTIPP row was created for:`,
        detail: unmatchedTipNames.join(', ')
      });
    }
  }

  // Spread hours summary
  const spreadEmps   = Object.values(employees).filter(e => e.spreadCredits > 0);
  const spreadTotal  = spreadEmps.reduce((s, e) => s + e.spreadCredits, 0);
  const spreadDollar = round2(spreadTotal * SPREAD_HOUR_RATE);
  if (spreadEmps.length > 0) {
    infos.push(`Spread hours (OTH2): ${spreadTotal} credit(s) across ${spreadEmps.length} employee(s) = $${spreadDollar.toFixed(2)}`);
  }

  return { warnings, infos };
}

// ================================================================
// CSV GENERATION
// ================================================================
function generateCsv(adpRows) {
  const lines = [];

  // Row 1: ##GENERIC## V1.0 in A1, rest empty (11 fields total)
  lines.push('##GENERIC## V1.0,,,,,,,,,,');

  // Row 2: column headers
  lines.push(ADP_HEADERS.join(','));

  // Data rows
  adpRows.forEach(row => {
    lines.push(
      row.map(cell => {
        const s = (cell === null || cell === undefined) ? '' : String(cell);
        // Wrap in double quotes if contains comma, quote, or newline
        return (s.includes(',') || s.includes('"') || s.includes('\n'))
          ? '"' + s.replace(/"/g, '""') + '"'
          : s;
      }).join(',')
    );
  });

  return lines.join('\r\n');
}

// ================================================================
// DISPLAY RESULTS
// ================================================================
function displayResults({ adpRows, employees, tipsTotal, validation }) {
  const container = document.getElementById('validation-results');
  container.innerHTML = '';

  const empCount    = Object.keys(employees).length;
  const totalRegHrs = Object.values(employees).reduce((s, e) => s + e.regularHours, 0);
  const totalTipsDollars = adpRows
    .filter(r => r[5] === 'CREDTIPP')
    .reduce((s, r) => s + (parseFloat(r[7]) || 0), 0);
  const totalSpreadDollars = adpRows
    .filter(r => r[5] === 'OTH2')
    .reduce((s, r) => s + (parseFloat(r[7]) || 0), 0);

  // ── Stats grid ──────────────────────────────────────────────
  const statsHtml = `
    <div class="stats-grid">
      <div class="stat-box"><div class="stat-num">${empCount.toLocaleString()}</div><div class="stat-label">Employees</div></div>
      <div class="stat-box"><div class="stat-num">${parseFloat(totalRegHrs.toFixed(2)).toLocaleString()}</div><div class="stat-label">Regular Hours</div></div>
      <div class="stat-box"><div class="stat-num">$${totalTipsDollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div><div class="stat-label">Tips (CREDTIPP)</div></div>
      <div class="stat-box"><div class="stat-num">$${totalSpreadDollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div><div class="stat-label">Spread Hours (OTH2)</div></div>
    </div>`;
  container.insertAdjacentHTML('beforeend', statsHtml);

  // ── Info messages ───────────────────────────────────────────
  if (validation.infos.length > 0) {
    const div = document.createElement('div');
    div.className = 'validation-list info';
    validation.infos.forEach(msg => {
      const p = document.createElement('p');
      p.textContent = msg;
      div.appendChild(p);
    });
    container.appendChild(div);
  }

  // ── Warnings ────────────────────────────────────────────────
  if (validation.warnings.length > 0) {
    const div = document.createElement('div');
    div.className = 'validation-list warnings';
    const heading = document.createElement('div');
    heading.className = 'warn-heading';
    heading.textContent = `⚠ ${validation.warnings.length} Warning${validation.warnings.length > 1 ? 's' : ''}`;
    div.appendChild(heading);
    validation.warnings.forEach(w => {
      const p = document.createElement('p');
      p.textContent = w.detail ? `${w.text} ${w.detail}` : w.text;
      div.appendChild(p);
    });
    container.appendChild(div);
  } else {
    const div = document.createElement('div');
    div.className = 'validation-list success';
    div.innerHTML = '<p>✓ All validation checks passed</p>';
    container.appendChild(div);
  }

  // ── Preview table (first 20 rows) ───────────────────────────
  if (adpRows.length > 0) {
    const preview = adpRows.slice(0, 20);
    const wrapDiv = document.createElement('div');
    wrapDiv.innerHTML = `<p class="preview-label" style="margin-top:1.25rem;font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-2);margin-bottom:.65rem;">Output preview</p>`;

    const tableWrap = document.createElement('div');
    tableWrap.className = 'preview-wrap';

    const table = document.createElement('table');
    table.className = 'preview-table';

    const thead = document.createElement('thead');
    thead.innerHTML = `<tr>${ADP_HEADERS.map(h => `<th>${h}</th>`).join('')}</tr>`;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    preview.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = row.map((cell, i) =>
        i === 5  // Earnings Code column — monospace styled
          ? `<td class="code-cell">${escHtml(cell)}</td>`
          : `<td>${escHtml(cell)}</td>`
      ).join('');
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);

    if (adpRows.length > 20) {
      const more = document.createElement('div');
      more.className = 'preview-more';
      more.textContent = `… and ${adpRows.length - 20} more rows`;
      tableWrap.appendChild(more);
    }

    wrapDiv.appendChild(tableWrap);
    container.appendChild(wrapDiv);
  }
}

// ================================================================
// UTILITIES
// ================================================================
function isReady() {
  if (!state.restaurant) return false;
  if (state.restaurant.locations && state.restaurant.locations.length > 0 && !state.location) return false;
  if (!state.weekStart) return false;
  if (!state.squareRows || state.squareRows.length === 0) return false;
  return true;
}

function checkReady() {
  document.getElementById('processBtn').disabled = !isReady();
}

function setFileStatus(id, text, type) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className   = `file-status ${type}`;
  el.style.display = '';
}

function downloadFile(content, filename, mimeType) {
  const bom  = '\uFEFF'; // UTF-8 BOM — helps Excel recognise encoding
  const blob = new Blob([bom + content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Date helpers
function parseDateInput(str) {
  // "2025-12-01" → local Date (avoids UTC-day shift)
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function parseSquareDate(str) {
  if (!str) return null;
  // Handles "12/1/25", "12/01/2025"
  const parts = str.trim().split('/');
  if (parts.length !== 3) return null;
  let [mon, day, yr] = parts.map(Number);
  if (yr < 100) yr += 2000;
  return new Date(yr, mon - 1, day);
}

function dateOnly(d) {
  // Returns a comparable number YYYYMMDD
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatDate(date) {
  // M/D/YYYY — matches ADP expected format
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

// String helpers
function normalizeName(name) {
  return String(name || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function parseCurrency(str) {
  if (str === null || str === undefined || str === '') return 0;
  return parseFloat(String(str).replace(/[$,\s]/g, '')) || 0;
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function fmt(n) {
  // Format number to 2 dp, drop trailing zeros: 5.00 → "5", 5.50 → "5.5", 5.57 → "5.57"
  if (n === '' || n === null || n === undefined) return '';
  const num = parseFloat(n);
  if (isNaN(num) || num === 0) return '';
  return parseFloat(num.toFixed(2)).toString();
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
