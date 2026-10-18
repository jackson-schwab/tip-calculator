/* UI wiring. All math lives in calc.js (window.TipCalc). */
(function () {
  'use strict';

  const { toCents, formatCents, computeTax, computeBill, splitEven, splitByItems } = window.TipCalc;
  const $ = (id) => document.getElementById(id);
  const MAX_PEOPLE = 50;

  let nextId = 1;
  const newPerson = () => ({ id: nextId++, name: '' });
  const newItem = () => ({ id: nextId++, name: '', price: '', sharedBy: new Set() });

  const state = {
    tipPercent: 20,
    mode: 'even',
    people: [newPerson(), newPerson()],
    items: [newItem()],
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

  // ---- Mode ----

  function setMode(mode) {
    state.mode = mode;
    document.querySelectorAll('[data-mode]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
    });
    $('even-panel').hidden = mode !== 'even';
    $('items-panel').hidden = mode !== 'items';
    // In item mode the subtotal comes from the item prices.
    $('subtotal-field').hidden = mode !== 'even';
    update();
  }

  document.querySelectorAll('[data-mode]').forEach((b) => {
    b.addEventListener('click', () => setMode(b.dataset.mode));
  });

  // ---- Split by items ----

  const displayName = (person, i) => person.name.trim() || `Person ${i + 1}`;

  function renderPeopleList() {
    const ul = $('people-list');
    ul.replaceChildren();
    state.people.forEach((person, i) => {
      const li = el('li');
      const input = el('input');
      input.type = 'text';
      input.value = person.name;
      input.placeholder = `Person ${i + 1}`;
      input.setAttribute('aria-label', `Name of person ${i + 1}`);
      input.addEventListener('input', () => {
        person.name = input.value;
        renderItemList();
        update();
      });

      const remove = el('button', 'remove', '✕');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove ${displayName(person, i)}`);
      remove.disabled = state.people.length === 1;
      remove.addEventListener('click', () => {
        state.people.splice(i, 1);
        state.items.forEach((item) => item.sharedBy.delete(person.id));
        renderPeopleList();
        renderItemList();
        update();
      });

      li.append(input, remove);
      ul.append(li);
    });
    $('add-person').disabled = state.people.length >= MAX_PEOPLE;
  }

  function renderChips(item, container) {
    container.replaceChildren();
    state.people.forEach((person, i) => {
      const chip = el('button', '', displayName(person, i));
      chip.type = 'button';
      chip.setAttribute('aria-pressed', String(item.sharedBy.has(person.id)));
      chip.addEventListener('click', () => {
        if (item.sharedBy.has(person.id)) item.sharedBy.delete(person.id);
        else item.sharedBy.add(person.id);
        chip.setAttribute('aria-pressed', String(item.sharedBy.has(person.id)));
        note.hidden = item.sharedBy.size > 0;
        update();
      });
      container.append(chip);
    });
    const note = el('span', 'chip-note', 'Everyone');
    note.hidden = item.sharedBy.size > 0;
    container.append(note);
  }

  function renderItemList() {
    const ul = $('item-list');
    ul.replaceChildren();
    state.items.forEach((item, i) => {
      const li = el('li', 'item-row');
      const main = el('div', 'item-main');

      const name = el('input', 'item-name');
      name.type = 'text';
      name.value = item.name;
      name.placeholder = `Item ${i + 1}`;
      name.setAttribute('aria-label', `Item ${i + 1} name`);
      name.addEventListener('input', () => {
        item.name = name.value;
        update();
      });

      const priceWrap = el('div', 'affix-input');
      const price = el('input');
      price.type = 'number';
      price.inputMode = 'decimal';
      price.min = '0';
      price.step = '0.01';
      price.placeholder = '0.00';
      price.value = item.price;
      price.setAttribute('aria-label', `Item ${i + 1} price`);
      price.addEventListener('input', () => {
        item.price = price.value;
        update();
      });
      priceWrap.append(el('span', 'affix', '$'), price);

      const remove = el('button', 'remove', '✕');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove item ${i + 1}`);
      remove.addEventListener('click', () => {
        state.items.splice(i, 1);
        if (state.items.length === 0) state.items.push(newItem());
        renderItemList();
        update();
      });

      main.append(name, priceWrap, remove);
      const chips = el('div', 'chips');
      chips.setAttribute('role', 'group');
      chips.setAttribute('aria-label', `Who shared item ${i + 1}`);
      renderChips(item, chips);
      li.append(main, chips);
      ul.append(li);
    });
  }

  $('add-person').addEventListener('click', () => {
    state.people.push(newPerson());
    renderPeopleList();
    renderItemList();
    update();
    const inputs = $('people-list').querySelectorAll('input');
    inputs[inputs.length - 1].focus();
  });

  $('add-item').addEventListener('click', () => {
    state.items.push(newItem());
    renderItemList();
    update();
    const names = $('item-list').querySelectorAll('.item-name');
    names[names.length - 1].focus();
  });

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

  function computeItemSplit(taxValue, taxMode, tipOnTax) {
    const items = state.items.map((item, i) => ({
      name: item.name.trim() || `Item ${i + 1}`,
      priceCents: toCents(item.price),
      sharedBy: state.people
        .map((person, idx) => (item.sharedBy.has(person.id) ? idx : -1))
        .filter((idx) => idx >= 0),
    })).filter((item) => item.priceCents > 0);
    const subtotal = items.reduce((a, it) => a + it.priceCents, 0);
    const tax = computeTax(subtotal, taxValue, taxMode);
    return splitByItems(items, state.people.length, tax, state.tipPercent, tipOnTax);
  }

  function update() {
    const taxValue = $('tax').value;
    const taxMode = $('tax-mode').value;
    const tipOnTax = $('tip-on-tax').checked;
    let result;
    let names;

    if (state.mode === 'items') {
      result = computeItemSplit(taxValue, taxMode, tipOnTax);
      names = state.people.map(displayName);
    } else {
      const subtotal = toCents($('subtotal').value);
      const tax = computeTax(subtotal, taxValue, taxMode);
      const bill = computeBill(subtotal, tax, state.tipPercent, tipOnTax);
      result = splitEven(bill, peopleCount());
      names = result.people.map((_, i) => `Person ${i + 1}`);
    }

    renderTotals(result.bill);
    if (state.mode === 'even') renderHeadline(result.people);
    else $('headline').replaceChildren();
    renderBreakdown(result.people, names);
  }

  markPreset(state.tipPercent);
  renderPeopleList();
  renderItemList();
  update();
})();
