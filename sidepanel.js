/* Formsheet — a personal store of the details you retype into exam forms. */

const STORE_KEY = 'formsheet';
const PIN_KEY = 'formsheet_pin';

const uid = () => Math.random().toString(36).slice(2, 9);
const f = (label, value = '', note = '') => ({ id: uid(), label, value, note });

function starterData() {
  return {
    version: 1,
    groups: [
      {
        id: uid(),
        name: 'Personal',
        fields: [
          f('Full name (as on 10th marksheet)'),
          f("Father's name"),
          f("Mother's name"),
          f('Date of birth', '', 'Keep the dd/mm/yyyy form handy too'),
          f('Category'),
          f('Mobile'),
          f('Email'),
        ],
      },
      {
        id: uid(),
        name: 'Class 10',
        fields: [
          f('Board'),
          f('School'),
          f('Roll number'),
          f('Year of passing'),
          f('Marks obtained / total'),
          f('Percentage'),
        ],
      },
      {
        id: uid(),
        name: 'Class 12',
        fields: [
          f('Board'),
          f('School'),
          f('Roll number'),
          f('Year of passing'),
          f('Marks obtained / total'),
          f('Percentage'),
        ],
      },
      {
        id: uid(),
        name: 'B.Tech (ECE)',
        fields: [
          f('University'),
          f('College'),
          f('Registration number'),
          f('Roll number'),
          f('Year of admission'),
          f('Year of passing'),
          f('CGPA'),
          f('Percentage'),
        ],
      },
      {
        id: uid(),
        name: 'Address',
        fields: [
          f('Permanent address'),
          f('Correspondence address'),
          f('District'),
          f('State'),
          f('PIN code'),
        ],
      },
      {
        id: uid(),
        name: 'Documents',
        fields: [
          f('Photo size', '', 'e.g. 200 x 230 px, 20–50 KB'),
          f('Signature size', '', 'e.g. 140 x 60 px, 10–20 KB'),
        ],
      },
    ],
    semesters: [
      { id: uid(), name: 'Sem 1', sgpa: '', credits: '' },
      { id: uid(), name: 'Sem 2', sgpa: '', credits: '' },
    ],
  };
}

let data = starterData();
let editing = false;
let query = '';

/* ---------- storage ---------- */

let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    chrome.storage.local.set({ [STORE_KEY]: data });
  }, 250);
}

async function load() {
  const stored = await chrome.storage.local.get(STORE_KEY);
  if (stored && stored[STORE_KEY] && Array.isArray(stored[STORE_KEY].groups)) {
    data = stored[STORE_KEY];
    if (!Array.isArray(data.semesters)) data.semesters = [];
  }
}

/* ---------- small helpers ---------- */

const $ = (sel) => document.querySelector(sel);
const groupsEl = $('#groups');
const toastEl = $('#toast');

let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
}

function matches(field, group) {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    field.label.toLowerCase().includes(q) ||
    String(field.value).toLowerCase().includes(q) ||
    group.name.toLowerCase().includes(q)
  );
}

/* ---------- copy and fill ---------- */

async function copyValue(value, node) {
  if (!value) {
    toast('Nothing saved in this one yet.');
    return;
  }
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = value;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  node.classList.add('copied');
  setTimeout(() => node.classList.remove('copied'), 700);
  toast('Copied. Paste it with Ctrl+V.');
}

function fillValue(value) {
  if (!value) {
    toast('Nothing saved in this one yet.');
    return;
  }
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs && tabs[0];
    if (!tab) return;
    chrome.tabs.sendMessage(tab.id, { type: 'formsheet-fill', value }, (res) => {
      if (chrome.runtime.lastError || !res) {
        toast('Click inside the box on the form first, then press Fill.');
        return;
      }
      toast(res.ok ? `Filled ${res.field}.` : 'That box has no matching option.');
    });
  });
}

/* ---------- rendering ---------- */

function render() {
  groupsEl.replaceChildren();
  let shown = 0;

  data.groups.forEach((group) => {
    const visible = group.fields.filter((fl) => matches(fl, group));
    if (!visible.length && !editing) return;
    shown += visible.length;

    const sec = document.createElement('section');
    sec.className = 'group';

    const head = document.createElement('div');
    head.className = 'group-head';

    if (editing) {
      const nameInput = document.createElement('input');
      nameInput.value = group.name;
      nameInput.setAttribute('aria-label', 'Section name');
      nameInput.addEventListener('input', () => {
        group.name = nameInput.value;
        save();
      });
      head.appendChild(nameInput);

      const del = document.createElement('button');
      del.className = 'danger';
      del.textContent = 'Remove';
      del.addEventListener('click', () => {
        data.groups = data.groups.filter((g) => g.id !== group.id);
        save();
        render();
      });
      head.appendChild(del);
    } else {
      const h = document.createElement('h2');
      h.textContent = group.name;
      const filled = group.fields.filter((fl) => fl.value).length;
      const count = document.createElement('span');
      count.className = 'count';
      count.textContent = `${filled}/${group.fields.length}`;
      head.append(h, count);
    }

    sec.appendChild(head);
    (editing ? group.fields : visible).forEach((field) =>
      sec.appendChild(editing ? editRow(group, field) : readRow(field))
    );

    if (editing) {
      const add = document.createElement('button');
      add.className = 'ghost small';
      add.textContent = 'Add detail';
      add.addEventListener('click', () => {
        group.fields.push(f('New detail'));
        save();
        render();
      });
      sec.appendChild(add);
    }

    groupsEl.appendChild(sec);
  });

  if (!shown && !editing) {
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = query
      ? 'No detail matches that. Try a shorter word.'
      : 'Press Edit to put your details in.';
    groupsEl.appendChild(p);
  }
}

function readRow(field) {
  const row = document.createElement('div');
  row.className = 'field' + (field.value ? '' : ' empty');

  const label = document.createElement('div');
  label.className = 'label';
  label.textContent = field.label;

  const valueRow = document.createElement('div');
  valueRow.className = 'value-row';

  const val = document.createElement('button');
  val.className = 'value' + (field.value ? '' : ' blank');
  val.type = 'button';
  val.textContent = field.value || 'not saved yet';
  val.title = 'Copy';
  val.addEventListener('click', () => copyValue(field.value, row));

  valueRow.appendChild(val);

  if (field.value) {
    const fill = document.createElement('button');
    fill.className = 'fill';
    fill.type = 'button';
    fill.textContent = 'Fill';
    fill.title = 'Put this into the box you last clicked on the page';
    fill.addEventListener('click', () => fillValue(field.value));
    valueRow.appendChild(fill);
  }

  row.append(label, valueRow);

  if (field.note) {
    const note = document.createElement('div');
    note.className = 'note';
    note.textContent = field.note;
    row.appendChild(note);
  }
  return row;
}

function editRow(group, field) {
  const row = document.createElement('div');
  row.className = 'field';

  const grid = document.createElement('div');
  grid.className = 'edit-grid';

  const l = document.createElement('input');
  l.value = field.label;
  l.placeholder = 'Name of the detail';
  l.setAttribute('aria-label', 'Detail name');
  l.addEventListener('input', () => {
    field.label = l.value;
    save();
  });

  const v = document.createElement('input');
  v.className = 'v';
  v.value = field.value;
  v.placeholder = 'Value';
  v.setAttribute('aria-label', `Value for ${field.label}`);
  v.addEventListener('input', () => {
    field.value = v.value;
    save();
  });

  const n = document.createElement('input');
  n.value = field.note || '';
  n.placeholder = 'Note (optional)';
  n.setAttribute('aria-label', 'Note');
  n.addEventListener('input', () => {
    field.note = n.value;
    save();
  });

  grid.append(l, v, n);

  const actions = document.createElement('div');
  actions.className = 'edit-actions';
  const del = document.createElement('button');
  del.className = 'danger';
  del.textContent = 'Delete';
  del.addEventListener('click', () => {
    group.fields = group.fields.filter((x) => x.id !== field.id);
    save();
    render();
  });
  actions.appendChild(del);

  row.append(grid, actions);
  return row;
}

/* ---------- semester calculator ---------- */

function renderSemesters() {
  const body = $('#semRows');
  body.replaceChildren();

  data.semesters.forEach((sem) => {
    const tr = document.createElement('tr');

    const mk = (value, placeholder, key, aria) => {
      const td = document.createElement('td');
      const input = document.createElement('input');
      input.value = value;
      input.placeholder = placeholder;
      input.setAttribute('aria-label', aria);
      if (key !== 'name') input.inputMode = 'decimal';
      input.addEventListener('input', () => {
        sem[key] = input.value;
        save();
        computeCgpa();
      });
      td.appendChild(input);
      return td;
    };

    tr.append(
      mk(sem.name, 'Sem', 'name', 'Semester name'),
      mk(sem.sgpa, '0.00', 'sgpa', 'SGPA'),
      mk(sem.credits, 'opt', 'credits', 'Credits')
    );

    const tdDel = document.createElement('td');
    const del = document.createElement('button');
    del.className = 'danger';
    del.textContent = '×';
    del.title = 'Remove this semester';
    del.addEventListener('click', () => {
      data.semesters = data.semesters.filter((s) => s.id !== sem.id);
      save();
      renderSemesters();
      computeCgpa();
    });
    tdDel.appendChild(del);
    tr.appendChild(tdDel);

    body.appendChild(tr);
  });
}

function computeCgpa() {
  let totalPoints = 0;
  let totalWeight = 0;

  data.semesters.forEach((s) => {
    const sgpa = parseFloat(s.sgpa);
    if (!isFinite(sgpa)) return;
    const credits = parseFloat(s.credits);
    const weight = isFinite(credits) && credits > 0 ? credits : 1;
    totalPoints += sgpa * weight;
    totalWeight += weight;
  });

  const out = $('#cgpaOut');
  if (!totalWeight) {
    out.textContent = '—';
    $('#pc95').textContent = '—';
    $('#pc10').textContent = '—';
    return null;
  }

  const cgpa = totalPoints / totalWeight;
  out.textContent = cgpa.toFixed(2);
  $('#pc95').textContent = (cgpa * 9.5).toFixed(2) + '%';
  $('#pc10').textContent = (cgpa * 10 - 7.5).toFixed(2) + '%';
  return cgpa;
}

function saveCgpaAsField() {
  const cgpa = computeCgpa();
  if (cgpa === null) {
    toast('Put an SGPA in first.');
    return;
  }
  const value = cgpa.toFixed(2);
  let group =
    data.groups.find((g) => /tech|college|graduat|degree/i.test(g.name)) ||
    data.groups[0];
  let field = group.fields.find((x) => /^cgpa/i.test(x.label));
  if (field) field.value = value;
  else group.fields.push(f('CGPA', value));
  save();
  render();
  toast(`CGPA ${value} saved under ${group.name}.`);
}

/* ---------- backup ---------- */

function exportData() {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `formsheet-backup-${stamp}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast('Backup file saved.');
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed || !Array.isArray(parsed.groups)) throw new Error('bad shape');
      data = parsed;
      if (!Array.isArray(data.semesters)) data.semesters = [];
      save();
      render();
      renderSemesters();
      computeCgpa();
      toast('Details restored.');
    } catch {
      toast("That file isn't a Formsheet backup.");
    }
  };
  reader.readAsText(file);
}

/* ---------- PIN lock ---------- */

// PBKDF2 with a random salt: the PIN itself is never written to storage,
// only a derived hash that a stored copy of your data can't be reversed
// back into a working PIN from.
async function derivePinHash(pin, saltB64) {
  const enc = new TextEncoder();
  const salt = saltB64
    ? Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0))
    : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(bits)));
  const saltOut = btoa(String.fromCharCode(...salt));
  return { hash: hashB64, salt: saltOut };
}

async function getPinRecord() {
  const stored = await chrome.storage.local.get(PIN_KEY);
  return stored[PIN_KEY] || null;
}

async function setPinRecord(pin) {
  const { hash, salt } = await derivePinHash(pin);
  await chrome.storage.local.set({ [PIN_KEY]: { hash, salt } });
}

async function clearPinRecord() {
  await chrome.storage.local.remove(PIN_KEY);
}

async function checkPin(pin, record) {
  const { hash } = await derivePinHash(pin, record.salt);
  return hash === record.hash;
}

const lockScreen = $('#lockScreen');
const appEl = $('#app');
const lockInput = $('#lockInput');
const lockError = $('#lockError');
const lockSub = $('#lockSub');
const lockSubmit = $('#lockSubmit');
const lockForgot = $('#lockForgot');
const pinBtn = $('#pinBtn');

let pinMode = 'unlock'; // 'unlock' | 'create' | 'confirm' | 'change-old' | 'change-new' | 'change-confirm'
let pendingNewPin = '';

function showLock(mode, message) {
  pinMode = mode;
  lockInput.value = '';
  lockError.textContent = '';
  lockScreen.hidden = false;
  appEl.hidden = true;
  lockForgot.hidden = mode !== 'unlock';
  lockSub.textContent =
    message ||
    {
      unlock: 'Enter your PIN to open it.',
      create: 'Set a PIN to lock this panel.',
      confirm: 'Type it again to confirm.',
      'change-old': 'Enter your current PIN.',
      'change-new': 'Type a new PIN.',
      'change-confirm': 'Type the new PIN again to confirm.',
    }[mode];
  setTimeout(() => lockInput.focus(), 0);
}

function unlockApp() {
  lockScreen.hidden = true;
  appEl.hidden = false;
}

async function handleLockSubmit() {
  const value = lockInput.value.trim();
  lockError.textContent = '';

  if (!value) {
    lockError.textContent = 'Type something first.';
    return;
  }

  if (pinMode === 'unlock') {
    const record = await getPinRecord();
    if (!record) {
      unlockApp();
      return;
    }
    const ok = await checkPin(value, record);
    if (!ok) {
      lockError.textContent = 'Wrong PIN. Try again.';
      lockInput.value = '';
      lockInput.focus();
      return;
    }
    unlockApp();
  } else if (pinMode === 'create') {
    if (value.length < 4) {
      lockError.textContent = 'Use at least 4 digits.';
      return;
    }
    pendingNewPin = value;
    showLock('confirm');
  } else if (pinMode === 'confirm') {
    if (value !== pendingNewPin) {
      lockError.textContent = "That didn't match. Start again.";
      pendingNewPin = '';
      showLock('create');
      return;
    }
    await setPinRecord(value);
    pendingNewPin = '';
    pinBtn.textContent = 'Change PIN';
    pinRemoveBtn.hidden = false;
    unlockApp();
    toast('PIN set. The panel will lock next time you open it.');
  } else if (pinMode === 'change-old') {
    const record = await getPinRecord();
    const ok = record && (await checkPin(value, record));
    if (!ok) {
      lockError.textContent = 'That PIN is wrong.';
      lockInput.value = '';
      return;
    }
    showLock('change-new');
  } else if (pinMode === 'change-new') {
    if (value.length < 4) {
      lockError.textContent = 'Use at least 4 digits.';
      return;
    }
    pendingNewPin = value;
    showLock('change-confirm');
  } else if (pinMode === 'change-confirm') {
    if (value !== pendingNewPin) {
      lockError.textContent = "That didn't match. Start again.";
      pendingNewPin = '';
      showLock('change-new');
      return;
    }
    await setPinRecord(value);
    pendingNewPin = '';
    unlockApp();
    toast('PIN updated.');
  }
}

lockSubmit.addEventListener('click', handleLockSubmit);
lockInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleLockSubmit();
});

lockForgot.addEventListener('click', async () => {
  const sure = confirm(
    'Resetting clears the PIN but keeps your saved details. Continue?'
  );
  if (!sure) return;
  await clearPinRecord();
  pinBtn.textContent = 'Set a PIN';
  unlockApp();
  toast('PIN removed. You can set a new one from the bottom of the panel.');
});

$('#lockNow').addEventListener('click', async () => {
  const record = await getPinRecord();
  if (!record) {
    toast('Set a PIN first — see the bottom of the panel.');
    return;
  }
  showLock('unlock');
});

pinBtn.addEventListener('click', async () => {
  const record = await getPinRecord();
  if (record) {
    showLock('change-old');
  } else {
    showLock('create');
  }
});

const pinRemoveBtn = $('#pinRemoveBtn');

pinRemoveBtn.addEventListener('click', async () => {
  const sure = confirm('Remove the PIN? The panel will open without one from now on.');
  if (!sure) return;
  await clearPinRecord();
  pinBtn.textContent = 'Set a PIN';
  pinRemoveBtn.hidden = true;
  toast('PIN removed.');
});

async function initLock() {
  const record = await getPinRecord();
  pinBtn.textContent = record ? 'Change PIN' : 'Set a PIN';
  pinRemoveBtn.hidden = !record;
  if (record) {
    showLock('unlock');
  } else {
    unlockApp();
  }
}

/* ---------- wiring ---------- */

$('#search').addEventListener('input', (e) => {
  query = e.target.value.trim();
  render();
});

$('#editToggle').addEventListener('click', (e) => {
  editing = !editing;
  e.target.setAttribute('aria-pressed', String(editing));
  e.target.textContent = editing ? 'Done' : 'Edit';
  $('#addGroup').hidden = !editing;
  $('#modeHint').textContent = editing
    ? 'Type straight into the boxes. Everything saves on its own.'
    : 'Click a value to copy it. Click into a box on the form first, then press Fill to send it there.';
  render();
});

$('#addGroup').addEventListener('click', () => {
  data.groups.push({ id: uid(), name: 'New section', fields: [f('New detail')] });
  save();
  render();
});

$('#calcToggle').addEventListener('click', (e) => {
  const body = $('#calcBody');
  body.hidden = !body.hidden;
  e.target.textContent = body.hidden ? 'Show' : 'Hide';
});

$('#addSem').addEventListener('click', () => {
  data.semesters.push({
    id: uid(),
    name: `Sem ${data.semesters.length + 1}`,
    sgpa: '',
    credits: '',
  });
  save();
  renderSemesters();
});

$('#saveCgpa').addEventListener('click', saveCgpaAsField);
$('#exportBtn').addEventListener('click', exportData);
$('#importBtn').addEventListener('click', () => $('#importFile').click());
$('#importFile').addEventListener('change', (e) => {
  if (e.target.files[0]) importData(e.target.files[0]);
  e.target.value = '';
});

(async function start() {
  await load();
  render();
  renderSemesters();
  computeCgpa();
  await initLock();
})();
