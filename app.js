const STORAGE_KEY = 'ratio-split-rows';

let rows = loadRows();

const tbody = document.getElementById('rows-body');
const addBtn = document.getElementById('add-row-btn');
const clearBtn = document.getElementById('clear-btn');

function loadRows() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch (e) {
    /* ignore corrupt storage */
  }
  return defaultRows();
}

function defaultRows() {
  return Array.from({ length: 2 }, () => ({ name: '', amount: 0, ratio: 1 }));
}

function saveRows() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

function computeTotal(row) {
  return (Number(row.amount) || 0) * (Number(row.ratio) || 0);
}

function sumAmounts() {
  return rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
}

function computeResult(row) {
  return sumAmounts() - computeTotal(row);
}

function formatNumber(n) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function render() {
  tbody.innerHTML = '';

  rows.forEach((row, index) => {
    const tr = document.createElement('tr');

    tr.appendChild(makeInputCell('text', row.name, 'Name', (val) => {
      rows[index].name = val;
      saveRows();
    }));

    tr.appendChild(makeInputCell('number', row.amount, '0', (val) => {
      rows[index].amount = val === '' ? 0 : Number(val);
      saveRows();
      renderResults();
    }));

    tr.appendChild(makeInputCell('number', row.ratio, '1', (val) => {
      rows[index].ratio = val === '' ? 0 : Number(val);
      saveRows();
      renderResults();
    }));

    const totalTd = document.createElement('td');
    totalTd.className = 'total-cell';
    totalTd.dataset.totalFor = index;
    tr.appendChild(totalTd);

    const resultTd = document.createElement('td');
    resultTd.className = 'result-cell';
    resultTd.dataset.resultFor = index;
    tr.appendChild(resultTd);

    const delTd = document.createElement('td');
    if (rows.length > 1) {
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'del-btn';
      delBtn.textContent = '×';
      delBtn.setAttribute('aria-label', 'Remove row');
      delBtn.addEventListener('click', () => {
        rows.splice(index, 1);
        saveRows();
        render();
      });
      delTd.appendChild(delBtn);
    }
    tr.appendChild(delTd);

    tbody.appendChild(tr);
  });

  renderResults();
}

function renderResults() {
  rows.forEach((row, index) => {
    const entered = (Number(row.amount) || 0) !== 0;

    const totalCell = tbody.querySelector(`[data-total-for="${index}"]`);
    if (totalCell) {
      totalCell.textContent = entered ? formatNumber(computeTotal(row)) : '–';
      totalCell.classList.toggle('empty', !entered);
    }

    const cell = tbody.querySelector(`[data-result-for="${index}"]`);
    if (!cell) return;
    cell.innerHTML = '';
    cell.classList.remove('pos', 'neg');

    if (!entered) {
      cell.classList.add('empty');
      const span = document.createElement('span');
      span.className = 'value';
      span.textContent = '–';
      cell.appendChild(span);
      return;
    }

    const result = computeResult(row);
    const isNeg = result < 0;
    const span = document.createElement('span');
    span.className = 'value';
    span.textContent = formatNumber(result);
    cell.appendChild(span);
    cell.classList.toggle('pos', !isNeg);
    cell.classList.toggle('neg', isNeg);
  });
}

function makeInputCell(type, value, placeholder, onChange) {
  const td = document.createElement('td');
  const input = document.createElement('input');
  input.type = type;
  input.placeholder = placeholder;
  input.value = value === 0 && type === 'number' ? '' : value;
  if (type === 'number') input.inputMode = 'decimal';
  input.addEventListener('input', (e) => onChange(e.target.value));
  td.appendChild(input);
  return td;
}

addBtn.addEventListener('click', () => {
  rows.push({ name: '', amount: 0, ratio: 1 });
  saveRows();
  render();
});

clearBtn.addEventListener('click', () => {
  rows = defaultRows();
  saveRows();
  render();
});

render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* offline support unavailable, app still works online */
    });
  });
}
