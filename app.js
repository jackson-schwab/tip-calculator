/* UI wiring. All math lives in calc.js (window.TipCalc). */
(function () {
  'use strict';

  const { toCents, formatCents, computeTax, computeBill, splitEven } = window.TipCalc;
  const $ = (id) => document.getElementById(id);
  const MAX_PEOPLE = 50;

  const state = {
    tipPercent: 20,
  };

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // ---- Tip ----

  function markPreset(pct) {
    document.querySelectorAll('[data-tip]').forEach((b) => {
      b.setAttribute('aria-pressed', String(Number(b.dataset.tip) === pct));
    });
  }

  document.querySelectorAll('[data-tip]').forEach((b) => {
    b.addEventListener('click', () => {
      state.tipPercent = Number(b.dataset.tip);
      $('tip-custom').value = '';
      markPreset(state.tipPercent);
      update();
    });
  });

  $('tip-custom').addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    state.tipPercent = Number.isFinite(v) ? v : 0;
    markPreset(null);
    update();
  });

  // ---- Even split ----

  function peopleCount() {
    const n = parseInt($('people-count').value, 10);
    return Math.min(MAX_PEOPLE, Math.max(1, Number.isFinite(n) ? n : 1));
  }

  function setPeopleCount(n) {
    $('people-count').value = Math.min(MAX_PEOPLE, Math.max(1, n));
    update();
  }

  $('people-dec').addEventListener('click', () => setPeopleCount(peopleCount() - 1));
  $('people-inc').addEventListener('click', () => setPeopleCount(peopleCount() + 1));
  $('people-count').addEventListener('change', () => setPeopleCount(peopleCount()));

  ['subtotal', 'tax', 'people-count'].forEach((id) => $(id).addEventListener('input', update));
  ['tax-mode', 'tip-on-tax'].forEach((id) => $(id).addEventListener('change', update));

  // ---- Results ----

  function renderTotals(bill) {
    const dl = $('totals');
    dl.replaceChildren();
    const rows = [
      ['Subtotal', bill.subtotalCents],
      ['Tax', bill.taxCents],
      [`Tip (${+bill.tipPercent.toFixed(2)}%)`, bill.tipCents],
    ];
    rows.forEach(([label, cents]) => {
      dl.append(el('dt', '', label), el('dd', '', formatCents(cents)));
    });
    dl.append(el('dt', 'grand', 'Total'), el('dd', 'grand', formatCents(bill.totalCents)));
  }

  function renderHeadline(people) {
    const headline = $('headline');
    headline.replaceChildren();
    if (people.length < 2) return;
    const totals = people.map((p) => p.totalCents);
    const min = Math.min(...totals);
    const max = Math.max(...totals);
    const typical = people[totals.lastIndexOf(min)];
    headline.append('Each person pays ', el('strong', '', formatCents(min)));
    headline.append(` (${formatCents(typical.tipCents)} of it tip)`);
    if (max > min) {
      const extra = totals.filter((t) => t === max).length;
      headline.append(`. ${extra} ${extra === 1 ? 'person pays' : 'people pay'} 1¢ more to cover rounding.`);
    }
  }

  function renderBreakdown(people, names) {
    const table = $('breakdown');
    const tbody = table.tBodies[0];
    tbody.replaceChildren();
    people.forEach((p, i) => {
      const tr = el('tr');
      const nameCell = el('td', '', names[i]);
      if (p.items && p.items.length) {
        const list = p.items
          .map((it) => (it.sharedWith > 1 ? `${it.name} (1/${it.sharedWith})` : it.name))
          .join(', ');
        nameCell.append(el('span', 'person-items', list));
      }
      tr.append(
        nameCell,
        el('td', '', formatCents(p.subtotalCents)),
        el('td', '', formatCents(p.taxCents)),
        el('td', '', formatCents(p.tipCents)),
        el('td', '', formatCents(p.totalCents))
      );
      tbody.append(tr);
    });
  }

  function update() {
    const subtotal = toCents($('subtotal').value);
    const tax = computeTax(subtotal, $('tax').value, $('tax-mode').value);
    const bill = computeBill(subtotal, tax, state.tipPercent, $('tip-on-tax').checked);
    const result = splitEven(bill, peopleCount());
    const names = result.people.map((_, i) => `Person ${i + 1}`);

    renderTotals(result.bill);
    renderHeadline(result.people);
    renderBreakdown(result.people, names);
  }

  markPreset(state.tipPercent);
  update();
})();
