/*
 * Pure bill math, shared by the app (window.TipCalc) and the tests.
 * All money is handled as integer cents so splits always add up exactly.
 */
(function (root) {
  'use strict';

  function toCents(value) {
    const n = parseFloat(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.round(n * 100);
  }

  function formatCents(cents) {
    return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  // Split totalCents into whole-cent parts proportional to weights, using the
  // largest-remainder method so the parts always sum exactly to the total.
  // If every weight is zero the total is split evenly.
  function allocate(totalCents, weights) {
    if (weights.length === 0) return [];
    let sum = weights.reduce((a, w) => a + w, 0);
    if (sum <= 0) {
      weights = weights.map(() => 1);
      sum = weights.length;
    }
    const exact = weights.map((w) => (totalCents * w) / sum);
    const parts = exact.map(Math.floor);
    const leftover = totalCents - parts.reduce((a, p) => a + p, 0);
    const order = exact
      .map((x, i) => ({ i, frac: x - parts[i] }))
      .sort((a, b) => b.frac - a.frac || a.i - b.i);
    for (let k = 0; k < leftover; k++) parts[order[k].i] += 1;
    return parts;
  }

  // mode is 'amount' (value is dollars) or 'percent' (value is % of subtotal).
  function computeTax(subtotalCents, value, mode) {
    if (mode === 'percent') {
      const pct = parseFloat(value);
      return Number.isFinite(pct) && pct > 0 ? Math.round((subtotalCents * pct) / 100) : 0;
    }
    return toCents(value);
  }

  function computeBill(subtotalCents, taxCents, tipPercent, tipOnTax) {
    const pct = Number.isFinite(tipPercent) && tipPercent > 0 ? tipPercent : 0;
    const tipBase = subtotalCents + (tipOnTax ? taxCents : 0);
    const tipCents = Math.round((tipBase * pct) / 100);
    return {
      subtotalCents,
      taxCents,
      tipCents,
      tipPercent: pct,
      totalCents: subtotalCents + taxCents + tipCents,
    };
  }

  function share(subtotalCents, taxCents, tipCents) {
    return { subtotalCents, taxCents, tipCents, totalCents: subtotalCents + taxCents + tipCents };
  }

  // Everyone pays the same, give or take a cent.
  function splitEven(bill, count) {
    const n = Math.max(1, Math.floor(count) || 1);
    const ones = new Array(n).fill(1);
    const totals = allocate(bill.totalCents, ones);
    const tax = allocate(bill.taxCents, ones);
    const tip = allocate(bill.tipCents, ones);
    const people = totals.map((t, i) => share(t - tax[i] - tip[i], tax[i], tip[i]));
    return { bill, people };
  }

  // items: [{ name, priceCents, sharedBy: [personIndex, ...] }]
  // An item with no one in sharedBy is split among everyone. Tax and tip are
  // shared in proportion to what each person ordered.
  function splitByItems(items, peopleCount, taxCents, tipPercent, tipOnTax) {
    const n = Math.max(0, Math.floor(peopleCount) || 0);
    const everyone = Array.from({ length: n }, (_, i) => i);
    const subs = new Array(n).fill(0);
    const lines = everyone.map(() => []);
    let subtotalCents = 0;

    items.forEach((item) => {
      subtotalCents += item.priceCents;
      if (n === 0) return;
      const chosen = (item.sharedBy || []).filter((i) => i >= 0 && i < n);
      const who = chosen.length ? chosen : everyone;
      const parts = allocate(item.priceCents, who.map(() => 1));
      who.forEach((p, k) => {
        subs[p] += parts[k];
        lines[p].push({ name: item.name, cents: parts[k], sharedWith: who.length });
      });
    });

    const bill = computeBill(subtotalCents, taxCents, tipPercent, tipOnTax);
    const tax = allocate(bill.taxCents, subs);
    const tip = allocate(bill.tipCents, subs.map((s, i) => s + (tipOnTax ? tax[i] : 0)));
    const people = subs.map((s, i) => Object.assign(share(s, tax[i], tip[i]), { items: lines[i] }));
    return { bill, people };
  }

  const api = { toCents, formatCents, allocate, computeTax, computeBill, splitEven, splitByItems };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TipCalc = api;
})(this);
