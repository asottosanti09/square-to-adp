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
      { name: 'LaGuardia Place',     adpIid: '30256751' },
      { name: 'Northside',           adpIid: '30264633' },
      { name: 'Finkelstein & Ross',  adpIid: '30257633' },
      { name: 'Midtown',             adpIid: '' },
      { name: 'Starship',            adpIid: '30256821' },
      { name: 'Commissary',          adpIid: '30256765' }
    ]
  },
  { name: 'Elbow Bread', adpIid: '30257311' },
  { name: 'S&P Lunch',   adpIid: '30256821' }
];

const PAY_FREQUENCY = 'W';
const RATE_CODE     = 'BASE';
const SPREAD_HOUR_RATE = 17;

// ================================================================
// NICKNAME MATCHING
// Each group lists all equivalent forms of a first name.
// ================================================================
const NICKNAME_GROUPS = [
  ['elizabeth', 'liz', 'lizzy', 'beth', 'eliza', 'betty', 'bette', 'elise', 'lisa'],
  ['robert',    'bob', 'bobby', 'rob', 'robby', 'robbie'],
  ['william',   'bill', 'billy', 'will', 'willie', 'willy', 'liam'],
  ['james',     'jim', 'jimmy', 'jamie'],
  ['john',      'johnny', 'jack'],
  ['joseph',    'joe', 'joey'],
  ['michael',   'mike', 'mikey', 'mick', 'mickey'],
  ['nicholas',  'nick', 'nico', 'nicky'],
  ['thomas',    'tom', 'tommy'],
  ['susan',     'sue', 'susie', 'suzy'],
  ['jennifer',  'jen', 'jenny', 'jenn'],
  ['katherine', 'kate', 'katie', 'kathy', 'cathy', 'kat', 'kathryn'],
  ['daniel',    'dan', 'danny'],
  ['richard',   'rich', 'rick', 'ricky', 'dick'],
  ['christopher', 'chris'],
  ['alexander', 'alex', 'alec', 'al', 'xander'],
  ['matthew',   'matt', 'matty'],
  ['patricia',  'pat', 'patty', 'trish', 'tricia'],
  ['david',     'dave', 'davy'],
  ['stephen',   'steve', 'steven', 'stevie'],
  ['edward',    'ed', 'eddie', 'ned', 'ted', 'teddy'],
  ['charles',   'charlie', 'chuck', 'chaz'],
  ['donald',    'don', 'donnie'],
  ['ronald',    'ron', 'ronnie'],
  ['anthony',   'tony'],
  ['andrew',    'andy', 'drew'],
  ['samuel',    'sam', 'sammy'],
  ['samantha',  'sam', 'sammy', 'sami'],
  ['benjamin',  'ben', 'benny', 'benji'],
  ['kenneth',   'ken', 'kenny'],
  ['leonard',   'len', 'lenny'],
  ['frederick', 'fred', 'freddy', 'freddie'],
  ['gregory',   'greg', 'gregg'],
  ['jeffrey',   'jeff', 'geoff'],
  ['timothy',   'tim', 'timmy'],
  ['vincent',   'vince', 'vinnie', 'vin'],
  ['henry',     'hank'],
  ['margaret',  'peg', 'peggy', 'meg', 'maggie', 'marge'],
  ['theresa',   'tess', 'terry', 'terri', 'tessa'],
  ['rebecca',   'becky', 'becca'],
  ['barbara',   'barb', 'babs'],
  ['deborah',   'deb', 'debbie'],
  ['pamela',    'pam'],
  ['sarah',     'sally', 'sara'],
  ['sandra',    'sandy', 'sandi'],
  ['laura',     'lori', 'laurie'],
  ['judith',    'judy'],
  ['gerald',    'jerry', 'gerry'],
  ['raymond',   'ray'],
  ['lawrence',  'larry'],
  ['jessica',   'jess', 'jessie'],
  ['jonathan',  'jon', 'jonny'],
  ['madeline',  'maddie', 'maddy'],
  ['stephanie', 'steph'],
  ['theodore',  'ted', 'theo', 'teddy'],
  ['walter',    'walt', 'wally'],
  ['arthur',    'art', 'artie'],
  ['peter',     'pete'],
  ['albert',    'al', 'bert'],
  ['alfred',    'al', 'fred', 'alfie'],
  ['anne',      'ann', 'anna', 'annie'],
  ['eleanor',   'ellie', 'ella', 'nell', 'nelly'],
  ['emily',     'em', 'emmy'],
  ['eugene',    'gene'],
  ['helen',     'ellie', 'nell'],
  ['irving',    'irv'],
  ['reginald',  'reg', 'reggie'],
  ['sophia',    'sophie'],
  ['victoria',  'vicky', 'vickie', 'tori'],
  ['nathaniel', 'nate', 'nat'],
  ['philip',    'phil', 'phillip'],
  ['randolph',  'randy'],
  ['stanley',   'stan'],
  ['louis',     'lou', 'louie'],
  ['carolyn',   'carol', 'carrie'],
  ['dorothy',   'dot', 'dottie'],
  ['francis',   'frank', 'frankie'],
  ['frank',     'frankie'],
  ['george',    'georgie'],
  ['kathleen',  'kathy', 'kate', 'kat'],
  ['mark',      'marc'],
  ['nancy',     'nan'],
  ['natalie',   'nat', 'nattie'],
  ['grace',     'gracie'],
  ['claire',    'clara', 'clare'],
];

// Build a map: normalised first name → array of all names in its group
const NICKNAME_MAP = (() => {
  const map = {};
  NICKNAME_GROUPS.forEach(group => {
    group.forEach(name => {
      if (!map[name]) map[name] = [];
      group.forEach(eq => { if (!map[name].includes(eq)) map[name].push(eq); });
    });
  });
  return map;
})();

// Returns true if two first-name strings are equivalent (exact or nickname match)
function firstNamesMatch(a, b) {
  a = (a || '').toLowerCase().trim();
  b = (b || '').toLowerCase().trim();
  if (!a || !b) return false;
  if (a === b) return true;
  const groupA = NICKNAME_MAP[a] || [a];
  const groupB = NICKNAME_MAP[b] || [b];
  return groupA.some(n => groupB.includes(n));
}

// ================================================================
// EMPLOYEE CODE LOOKUP (from uploaded ADP codes file)
// ================================================================

// empCodesList: [{nameKey: "first last", code: "42"}, ...]
// Returns the code string or null if not found.
function lookupEmpCodeFromList(empCodesList, firstName, lastName) {
  if (!empCodesList || empCodesList.length === 0) return null;

  const sqFirst = normalizeName(firstName);
  const sqLast  = normalizeName(lastName);
  const key1 = `${sqFirst} ${sqLast}`.trim();
  const key2 = `${sqLast} ${sqFirst}`.trim();

  // 1. Exact full-name match
  for (const entry of empCodesList) {
    if (entry.nameKey === key1 || entry.nameKey === key2) return entry.code;
  }

  // 2. Last-name exact + first-name nickname-expanded match
  if (sqFirst && sqLast) {
    for (const entry of empCodesList) {
      const parts = entry.nameKey.split(' ');
      if (parts.length < 2) continue;

      // Treat as "first [middle] last" — compare last token as last name
      const adpFirst = parts[0];
      const adpLast  = parts.slice(1).join(' ');
      if (adpLast === sqLast && firstNamesMatch(sqFirst, adpFirst)) return entry.code;

      // Also try reversed orientation ("last first")
      const adpFirst2 = parts[parts.length - 1];
      const adpLast2  = parts.slice(0, -1).join(' ');
      if (adpLast2 === sqLast && firstNamesMatch(sqFirst, adpFirst2)) return entry.code;
    }
  }

  // 3. Word-set match: every significant word from the Square name appears in the ADP key
  const qWords = key1.split(' ').filter(w => w.length > 1);
  if (qWords.length > 0) {
    for (const entry of empCodesList) {
      const kWords = entry.nameKey.split(' ');
      if (qWords.every(w => kWords.includes(w))) return entry.code;
    }
  }

  return null;
}

// Parse uploaded ADP codes file → [{nameKey, code}], filtered by selected location.
function parseEmpCodesFromUpload(headers, rows, locationName) {
  const byLocation = parseEmpCodeFile(headers, rows);
  const locKeys    = Object.keys(byLocation).filter(k => k !== '_default');
  const defaultMap = byLocation._default || {};

  let codeMap;
  if (locKeys.length === 0) {
    // No location column — use everything
    codeMap = defaultMap;
  } else {
    const matchedLoc = locKeys.find(k =>
      k.toLowerCase() === (locationName || '').toLowerCase());
    if (matchedLoc) {
      // Prefer matched location, augmented with no-location rows
      codeMap = Object.assign({}, defaultMap, byLocation[matchedLoc]);
    } else {
      // No match — merge all locations (user uploaded correct-entity file)
      codeMap = Object.assign({}, defaultMap);
      locKeys.forEach(loc => Object.assign(codeMap, byLocation[loc]));
    }
  }

  return Object.entries(codeMap).map(([nameKey, code]) => ({ nameKey, code }));
}

// Parse "Last, First" (ADP format) → normalised "first last" key
function empNameToKey(adpName) {
  const str = String(adpName || '').trim();
  const ci  = str.indexOf(',');
  if (ci >= 0) {
    const last  = str.slice(0, ci).trim();
    const first = str.slice(ci + 1).trim();
    return normalizeName(first + ' ' + last);
  }
  return normalizeName(str);
}

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
  empCodesList: null,   // [{nameKey, code}] from uploaded ADP codes file
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
  document.getElementById('empCodesFile').addEventListener('change', onEmpCodesUpload);
  document.getElementById('processBtn').addEventListener('click',  onProcess);
  document.getElementById('downloadBtn').addEventListener('click', onDownload);

  // Drag-and-drop
  setupDropZone('square-zone',    'squareFile',   onSquareUpload);
  setupDropZone('tips-zone',      'tipsFile',     onTipsUpload);
  setupDropZone('emp-codes-zone', 'empCodesFile', onEmpCodesUpload);

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
  document.getElementById('emp-codes-remove').addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    clearUpload('emp-codes-zone', 'empCodesFile', 'emp-codes-status');
    state.empCodesList = null;
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
    if (!zone.contains(e.relatedTarget)) {
      zone.classList.remove('drag-over');
    }
  });
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (!file) return;
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

  input.value = '';
  status.style.display = 'none';
  status.textContent   = '';
  status.className     = 'file-status';
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
  const val   = document.getElementById('weekStart').value;
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
  state.weekEnd   = addDays(d, 6);

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

  state.tipsHeaders = null;
  state.tipsRawRows = null;
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

function onEmpCodesUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  state.empCodesList = null;
  setFileStatus('emp-codes-status', 'Reading…', 'loading');

  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const locationName = state.location ? state.location.name : '';

  const finish = (headers, rows, err) => {
    if (err) {
      setFileStatus('emp-codes-status', '✗ ' + err, 'error');
      checkReady();
      return;
    }
    try {
      const list = parseEmpCodesFromUpload(headers, rows, locationName);
      state.empCodesList = list;
      document.getElementById('emp-codes-zone').classList.add('has-file');
      setFileStatus('emp-codes-status', `✓ ${file.name} — ${list.length} employee codes loaded`, 'success');
    } catch (err) {
      setFileStatus('emp-codes-status', '✗ ' + err.message, 'error');
      state.empCodesList = null;
    }
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
    setFileStatus('emp-codes-status', '✗ Unsupported format — use CSV or Excel (.xlsx)', 'error');
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

  const lower = headers.map(h => String(h || '').toLowerCase().trim());

  const nameGuess = lower.findIndex(h => h === 'name' || h === 'employee name')
    ?? lower.findIndex(h => h.includes('name'));
  if (nameGuess >= 0) nameSel.value = nameGuess;
  else if (headers.length > 0) nameSel.value = 0;

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
  const { weekStart, weekEnd, squareRows, tipsHeaders, tipsRawRows,
          restaurant, location, empCodesList } = state;

  const adpIid = location
    ? (location.adpIid || '')
    : (restaurant ? (restaurant.adpIid || '') : '');

  // ── 1. Aggregate per employee ─────────────────────────────────
  const employees = aggregateEmployees(squareRows);

  // ── 2. Parse tips ─────────────────────────────────────────────
  let tipsMap   = {};
  let tipsTotal = 0;
  if (tipsHeaders && tipsRawRows) {
    const nameIdx = parseInt(document.getElementById('col-name').value,  10);
    const amtIdx  = parseInt(document.getElementById('col-amount').value, 10);
    ({ tipsMap, tipsTotal } = extractTipsFromRows(tipsHeaders, tipsRawRows, nameIdx, amtIdx));
  }

  // ── 3. Generate ADP rows ──────────────────────────────────────
  const isWestVillage = restaurant && restaurant.name === "L'industrie Pizzeria"
                     && location   && location.name   === 'West Village';
  const config = {
    adpIid,
    payPeriodStart: formatDate(weekStart),
    payPeriodEnd:   formatDate(weekEnd),
    spreadCode:     isWestVillage ? 'OTH' : 'OTH2',
    empCodesList:   empCodesList || []
  };
  const { adpRows, matchedTips, unmatchedTipNames, unmatchedEmpNames } =
    generateAdpRows(employees, tipsMap, config);

  // ── 4. Validate ───────────────────────────────────────────────
  const validation = buildValidation(employees, tipsMap, matchedTips,
    unmatchedTipNames, unmatchedEmpNames);

  // ── 5. Build CSV ──────────────────────────────────────────────
  const csv = generateCsv(adpRows);

  // ── 6. Filename ───────────────────────────────────────────────
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
  const fields = result.meta.fields || [];
  const required = ['Regular hours', 'Overtime hours', 'Spread of hours credit', 'Clockin date'];
  required.forEach(col => {
    if (!fields.includes(col)) throw new Error(`Square CSV is missing column: "${col}"`);
  });
  return result.data;
}

// ================================================================
// PARSING — Tips / Employee Codes (CSV / Excel) — returns { headers, rows }
// ================================================================
function parseFlatCsv(text) {
  const result = Papa.parse(text.trim(), {
    header:         false,
    skipEmptyLines: true
  });
  if (result.data.length < 1) throw new Error('CSV appears to be empty');
  const raw = result.data;
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
  if (raw.length < 1) throw new Error('Excel file appears to be empty');
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
// AGGREGATE EMPLOYEES
// ================================================================
function aggregateEmployees(rows) {
  const map = {};

  rows.forEach(row => {
    const firstName = (row['First name'] || '').trim();
    const lastName  = (row['Last name']  || '').trim();
    const key = normalizeName(`${firstName} ${lastName}`);
    if (!key) return;

    if (!map[key]) {
      map[key] = {
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
  const { adpIid, payPeriodStart, payPeriodEnd, spreadCode, empCodesList } = config;
  const adpRows           = [];
  const matchedTips       = {};
  const unmatchedTipNames = new Set(Object.keys(tipsMap));
  const unmatchedEmpNames = [];   // Square employees with no ADP code found

  Object.values(employees).forEach(emp => {
    const empId = lookupEmpCodeFromList(empCodesList, emp.firstName, emp.lastName) || '';

    if (!empId) {
      unmatchedEmpNames.push(`${emp.firstName} ${emp.lastName}`);
    }

    // REG
    if (emp.regularHours > 0) {
      adpRows.push(makeRow(adpIid, payPeriodStart, payPeriodEnd, empId, 'REG',
        fmt(emp.regularHours), ''));
    }

    // OVT
    if (emp.overtimeHours > 0) {
      adpRows.push(makeRow(adpIid, payPeriodStart, payPeriodEnd, empId, 'OVT',
        fmt(emp.overtimeHours), ''));
    }

    // CREDTIPP
    const tipAmt = findTip(emp.firstName, emp.lastName, tipsMap);
    if (tipAmt !== null && tipAmt > 0) {
      adpRows.push(makeRow(adpIid, payPeriodStart, payPeriodEnd, empId, 'CREDTIPP',
        '', String(round2(tipAmt))));
      const nKey = bestTipKey(emp.firstName, emp.lastName, tipsMap);
      if (nKey) {
        matchedTips[nKey] = tipAmt;
        unmatchedTipNames.delete(nKey);
      }
      emp._matchedTip = tipAmt;
    }

    // OTH2 / OTH — spread hours
    if (emp.spreadCredits > 0) {
      adpRows.push(makeRow(adpIid, payPeriodStart, payPeriodEnd, empId, spreadCode,
        String(emp.spreadCredits), ''));
    }
  });

  return { adpRows, matchedTips, unmatchedTipNames: [...unmatchedTipNames], unmatchedEmpNames };
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
function buildValidation(employees, tipsMap, matchedTips, unmatchedTipNames, unmatchedEmpNames) {
  const warnings = [];
  const infos    = [];

  // Employees not found in the ADP codes file
  if (unmatchedEmpNames && unmatchedEmpNames.length > 0) {
    warnings.push({
      text: `${unmatchedEmpNames.length} employee(s) in the Square file could not be matched to any ADP employee code — the Employee Id column will be blank for:`,
      detail: unmatchedEmpNames.join(', ')
    });
  }

  // Tip validation
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
  const spreadEmps  = Object.values(employees).filter(e => e.spreadCredits > 0);
  const spreadTotal = spreadEmps.reduce((s, e) => s + e.spreadCredits, 0);
  if (spreadEmps.length > 0) {
    infos.push(`Spread hours (SOH): ${spreadTotal} credit(s) across ${spreadEmps.length} employee(s)`);
  }

  return { warnings, infos };
}

// ================================================================
// CSV GENERATION
// ================================================================
function generateCsv(adpRows) {
  const lines = [];

  lines.push('##GENERIC## V1.0,,,,,,,,,,');
  lines.push(ADP_HEADERS.join(','));

  adpRows.forEach(row => {
    lines.push(
      row.map(cell => {
        const s = (cell === null || cell === undefined) ? '' : String(cell);
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
  const totalSpreadHours = adpRows
    .filter(r => r[5] === 'OTH2' || r[5] === 'OTH')
    .reduce((s, r) => s + (parseFloat(r[6]) || 0), 0);

  // ── Stats grid ───────────────────────────────────────────────
  const statsHtml = `
    <div class="stats-grid">
      <div class="stat-box"><div class="stat-num">${empCount.toLocaleString()}</div><div class="stat-label">Employees</div></div>
      <div class="stat-box"><div class="stat-num">${parseFloat(totalRegHrs.toFixed(2)).toLocaleString()}</div><div class="stat-label">Regular Hours</div></div>
      <div class="stat-box"><div class="stat-num">$${totalTipsDollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div><div class="stat-label">Tips (CREDTIPP)</div></div>
      <div class="stat-box"><div class="stat-num">${parseFloat(totalSpreadHours.toFixed(2)).toLocaleString()}</div><div class="stat-label">Spread Hours (SOH)</div></div>
    </div>`;
  container.insertAdjacentHTML('beforeend', statsHtml);

  // ── Info messages ─────────────────────────────────────────────
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

  // ── Warnings ──────────────────────────────────────────────────
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

  // ── Preview table (first 20 rows) ─────────────────────────────
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
        i === 5
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
  if (!state.empCodesList || state.empCodesList.length === 0) return false;
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
  const bom  = '\uFEFF';
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
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function parseSquareDate(str) {
  if (!str) return null;
  const parts = str.trim().split('/');
  if (parts.length !== 3) return null;
  let [mon, day, yr] = parts.map(Number);
  if (yr < 100) yr += 2000;
  return new Date(yr, mon - 1, day);
}

function dateOnly(d) {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatDate(date) {
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

// ================================================================
// ADP EMPLOYEE CODE FILE PARSER
// Detects Employee, Code, and (optionally) Location columns.
// Returns { [location|'_default']: { nameKey: code } }
// ================================================================
function parseEmpCodeFile(headers, rows) {
  const lower = headers.map(h => h.toLowerCase());

  const nameColIdx = lower.findIndex(h =>
    h.includes('employee') && !h.includes('code') && !h.includes('status') &&
    !h.includes('frequency') && !h.includes('clock'));
  const codeColIdx = lower.findIndex(h =>
    h.includes('code') && !h.includes('pay') && !h.includes('frequency'));
  const locColIdx  = lower.findIndex(h => h.includes('location'));

  if (nameColIdx < 0) throw new Error('Could not find employee name column (expected a header containing "Employee").');
  if (codeColIdx < 0) throw new Error('Could not find employee code column (expected a header containing "Code").');

  const nameHeader = headers[nameColIdx];
  const codeHeader = headers[codeColIdx];
  const locHeader  = locColIdx >= 0 ? headers[locColIdx] : null;

  const result = {};

  rows.forEach(row => {
    const name = String(row[nameHeader] || '').trim();
    const code = String(row[codeHeader] || '').trim();
    const loc  = locHeader ? String(row[locHeader] || '').trim() : '';

    if (!name || !code) return;
    const key = empNameToKey(name);
    if (!key) return;

    const bucket = loc || '_default';
    if (!result[bucket]) result[bucket] = {};
    result[bucket][key] = code;
  });

  if (Object.keys(result).length === 0) throw new Error('No valid employee rows found in the file.');
  return result;
}
