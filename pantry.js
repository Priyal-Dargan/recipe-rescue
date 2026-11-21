/* =========================================================
   pantry.js - Stage 2: drag-and-drop pantry board
   - state-driven: every change updates App.state, then render()
   - SortableJS handles dragging; undo/redo uses state snapshots
   - exposes window.Pantry for Stage 3 (add) and Stage 4 (cart)
   ========================================================= */
(() => {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let App, root, dlg;
  let sortables = [];
  const undoStack = [];
  const redoStack = [];
  let preDrag = null;
  let pulseId = null;
  let editingId = null;

  const S = () => App.state;
  const byId = (id) => S().pantry.find((p) => p.id === id);
  const catOf = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
  const cartItems = () => S().cart.map(byId).filter(Boolean);
  const uid = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  /* ---------- tiny inline icons ---------- */
  const I = {
    undo:  '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>',
    redo:  '<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 15-6.7L21 13"/>',
    plus:  '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    edit:  '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    x:     '<path d="M18 6 6 18M6 6l12 12"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>'
  };
  const svg = (n, cls = 'icon icon-sm') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;

  /* ---------- dates + freshness ---------- */
  const DAY = 86400000;
  const todayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const addDays = (n) => { const d = todayStart(); d.setDate(d.getDate() + n); return toISO(d); };
  const daysLeft = (iso) => {
    const [y, m, d] = String(iso).split('-').map(Number);
    return Math.round((new Date(y, m - 1, d) - todayStart()) / DAY);
  };

  function freshness(item) {
    const n = daysLeft(item.expiry);
    if (Number.isNaN(n)) return { level: 'fresh', label: 'No date', icon: '✓' };
    if (n < 0)  return { level: 'expired', label: n === -1 ? 'Expired yesterday' : `Expired ${-n} days ago`, icon: '⛔' };
    if (n <= 3) return { level: 'soon', label: n === 0 ? 'Expires today' : n === 1 ? 'Expires tomorrow' : `${n} days left`, icon: '⏳' };
    return { level: 'fresh', label: n > 60 ? 'Long shelf life' : `${n} days left`, icon: '✓' };
  }

  const UNITS = ['pcs', 'g', 'kg', 'ml', 'L', 'packs'];
  const UNIT_BY_CAT = { veggies: 'pcs', fruits: 'pcs', dairy: 'packs', grains: 'packs', proteins: 'pcs', spices: 'packs', other: 'packs' };
  const fmtQty = (p) => `${Math.round(p.qty * 100) / 100} ${p.unit}`;

  /* ---------- history (undo / redo) ---------- */
  const snapshot = () => JSON.stringify({ pantry: S().pantry, cart: S().cart });
  function pushUndo(snap) {
    undoStack.push(snap);
    if (undoStack.length > 60) undoStack.shift();
    redoStack.length = 0;
  }
  function restore(snap) {
    const o = JSON.parse(snap);
    S().pantry = o.pantry; S().cart = o.cart;
    App.save(); render();
  }
  function undo() {
    if (!undoStack.length) return App.toast('Nothing to undo');
    redoStack.push(snapshot()); restore(undoStack.pop()); App.toast('Undone ↶');
  }
  function redo() {
    if (!redoStack.length) return App.toast('Nothing to redo');
    undoStack.push(snapshot()); restore(redoStack.pop()); App.toast('Redone ↷');
  }
  /* run a change, remember the "before" state, save, redraw */
  function mutate(fn) {
    const snap = snapshot();
    fn();
    pushUndo(snap);
    App.save(); render();
  }

  /* ---------- public: add an ingredient (Stage 3 will reuse this) ---------- */
  function addIngredient(name, opts = {}, quiet = false) {
    const base = INGREDIENTS.find((i) => i.name.toLowerCase() === String(name).toLowerCase());
    const cat = opts.cat || (base ? base.cat : 'other');
    const shelf = Math.min(opts.shelf ?? (base ? base.shelf : 7), 730);
    const item = {
      id: uid(),
      name: base ? base.name : String(name).trim(),
      emoji: opts.emoji || (base ? base.emoji : '🥫'),
      cat,
      qty: opts.qty ?? 1,
      unit: opts.unit || UNIT_BY_CAT[cat] || 'pcs',
      expiry: opts.expiry || addDays(shelf)
    };
    const snap = snapshot();
    const existing = S().pantry.find((p) => p.name.toLowerCase() === item.name.toLowerCase() && p.unit === item.unit);
    let result;
    if (existing) {
      existing.qty = Math.round((existing.qty + item.qty) * 100) / 100;
      if (item.expiry < existing.expiry) existing.expiry = item.expiry;
      result = { item: existing, merged: true };
    } else {
      S().pantry.push(item);
      result = { item, merged: false };
    }
    if (!quiet) { pushUndo(snap); pulseId = result.item.id; App.save(); render(); }
        return result;
    }

  /* add several ingredients as ONE undoable action (used by the Add screen) */
    function addMany(list) {
        const snap = snapshot();
        list.forEach((it) => addIngredient(it.name, it, true));
        pushUndo(snap);
        App.save(); render();
  }
    /* remove several ingredients as ONE undoable action (used by cooking mode) */
  function removeMany(ids) {
    mutate(() => {
      S().pantry = S().pantry.filter((p) => !ids.includes(p.id));
      S().cart = S().cart.filter((id) => !ids.includes(id));
    });
  }
  

  const SAMPLE = [
    ['Tomato', 4, 'pcs', 1], ['Spinach', 200, 'g', 2], ['Paneer', 1, 'packs', 3], ['Milk', 1, 'L', 2],
    ['Chicken', 500, 'g', 0], ['Bread', 1, 'packs', -1], ['Banana', 3, 'pcs', 1], ['Curd', 400, 'g', 4],
    ['Capsicum', 2, 'pcs', 5], ['Onion', 3, 'pcs', 20], ['Potato', 5, 'pcs', 25], ['Egg', 6, 'pcs', 12],
    ['Cheese', 1, 'packs', 15], ['Rice', 1, 'kg', 300], ['Turmeric', 1, 'packs', 200]
  ];
  function loadSample() {
    mutate(() => {
      SAMPLE.forEach(([name, qty, unit, days]) => {
        const b = INGREDIENTS.find((i) => i.name === name);
        S().pantry.push({ id: uid(), name, emoji: b.emoji, cat: b.cat, qty, unit, expiry: addDays(days) });
      });
    });
    App.toast('Sample pantry loaded 🧺');
  }

  /* ---------- HTML builders ---------- */
  function cardHTML(p) {
    const f = freshness(p);
    const inCart = S().cart.includes(p.id);
    return `<li class="card-ing ${f.level}${inCart ? ' in-cart' : ''}${pulseId === p.id ? ' pop' : ''}" data-id="${p.id}">
      <span class="ing-emoji" aria-hidden="true">${esc(p.emoji)}</span>
      <div class="ing-info"><strong class="ing-name">${esc(p.name)}</strong><small class="ing-qty">${esc(fmtQty(p))}</small></div>
      <span class="badge ${f.level}"><span aria-hidden="true">${f.icon}</span> ${f.label}</span>
      <div class="ing-actions">
        <button type="button" class="icon-btn${inCart ? ' on' : ''}" data-action="cart" data-id="${p.id}"
          aria-label="${inCart ? 'Remove ' + esc(p.name) + ' from' : 'Add ' + esc(p.name) + ' to'} recipe cart">${svg(inCart ? 'check' : 'plus')}</button>
        <button type="button" class="icon-btn" data-action="edit" data-id="${p.id}" aria-label="Edit ${esc(p.name)}">${svg('edit')}</button>
      </div></li>`;
  }

  function binHTML(c) {
    const items = S().pantry.filter((p) => p.cat === c.id);
    return `<section class="bin" aria-label="${c.label} bin, ${items.length} items">
      <div class="bin-head"><span class="bin-emoji" aria-hidden="true">${c.emoji}</span><h2>${c.label}</h2><span class="bin-count">${items.length}</span></div>
      <ul class="bin-list" data-cat="${c.id}">${items.map(cardHTML).join('')}</ul></section>`;
  }

  function chipHTML(p) {
    const f = freshness(p);
    return `<li class="cart-chip" data-id="${p.id}"><span class="dot ${f.level}" aria-hidden="true"></span>
      <span aria-hidden="true">${esc(p.emoji)}</span>${esc(p.name)}
      <button type="button" data-action="cart-remove" data-id="${p.id}" aria-label="Remove ${esc(p.name)} from cart">${svg('x')}</button></li>`;
  }

  function cartHTML() {
    const items = cartItems();
    const n = items.length;
    return `<aside class="cart-panel" aria-labelledby="cart-title">
      <div class="cart-head">
        <h2 id="cart-title">Recipe cart</h2>
        <span class="cart-count" aria-live="polite">${n}</span>
        <span class="spacer"></span>
        <button type="button" class="btn btn-ghost btn-sm" data-action="cart-clear" ${n ? '' : 'disabled'}>Clear</button>
      </div>
      <p class="cart-hint">Drag ingredients here, or tap the + on a card.</p>
      <ul class="cart-list" id="cart-list" data-empty="Nothing selected yet">${items.map(chipHTML).join('')}</ul>
      <button type="button" class="btn btn-primary btn-wide" data-action="find" ${n ? '' : 'disabled'}>Find recipes ${svg('arrow')}</button>
    </aside>`;
  }

  /* ---------- main render ---------- */
  function captureFocus() {
    const a = document.activeElement;
    return a && root.contains(a) && a.dataset.action ? { action: a.dataset.action, id: a.dataset.id || null } : null;
  }
  function restoreFocus(f) {
    if (!f) return;
    const el = root.querySelector(`[data-action="${f.action}"]` + (f.id ? `[data-id="${f.id}"]` : ''));
    if (el && !el.disabled) el.focus({ preventScroll: true });
  }

  function render() {
    const s = S();
    s.cart = s.cart.filter((id) => byId(id));
    const focus = captureFocus();
    destroySortables();

    const total = s.pantry.length;
    let soon = 0, expired = 0;
    s.pantry.forEach((p) => { const l = freshness(p).level; if (l === 'soon') soon++; if (l === 'expired') expired++; });

    const toolbar = `<div class="pantry-toolbar">
      <button type="button" class="btn btn-primary" data-action="add">${svg('plus')} Add ingredient</button>
      ${total ? `<button type="button" class="btn btn-ghost" data-action="cart-expiring">${svg('clock')} Use expiring items</button>` : ''}
      <span class="spacer"></span>
      <button type="button" class="btn btn-ghost btn-sm" data-action="undo" ${undoStack.length ? '' : 'disabled'}>${svg('undo')} Undo</button>
      <button type="button" class="btn btn-ghost btn-sm" data-action="redo" ${redoStack.length ? '' : 'disabled'}>${svg('redo')} Redo</button>
    </div>`;

    let body;
    if (!total) {
      body = `<div class="empty-state">
        <div class="empty-emoji" aria-hidden="true">🧺</div>
        <h2>Your pantry is empty</h2>
        <p>Add what's in your kitchen, or try the app with a sample pantry.</p>
        <div class="empty-actions">
          <button type="button" class="btn btn-primary" data-action="add">${svg('plus')} Add ingredient</button>
          <button type="button" class="btn btn-ghost" data-action="sample">Load sample pantry</button>
        </div></div>`;
    } else {
      body = `<div class="stats">
          <div class="stat"><b>${total}</b><span>Ingredients</span></div>
          <div class="stat soon"><b>${soon}</b><span>Expiring within 3 days</span></div>
          <div class="stat expired"><b>${expired}</b><span>Expired</span></div>
          <div class="stat good"><b>${s.cart.length}</b><span>In recipe cart</span></div>
        </div>
        <div class="legend" aria-label="Colour legend">
          <span class="fresh"><i></i>Fresh</span><span class="soon"><i></i>Use soon (3 days or less)</span><span class="expired"><i></i>Expired</span>
        </div>
        <div class="pantry-layout">
          <div class="bins">${CATEGORIES.map(binHTML).join('')}</div>
          ${cartHTML()}
        </div>`;
    }

    root.innerHTML = toolbar + body;
    initSortables();
    restoreFocus(focus);
    pulseId = null;
  }

  /* ---------- drag and drop ---------- */
  function destroySortables() { sortables.forEach((s) => s.destroy()); sortables = []; }

  function initSortables() {
    const common = {
      animation: 180, forceFallback: true, fallbackOnBody: true, fallbackTolerance: 3,
      delay: 140, delayOnTouchOnly: true, touchStartThreshold: 6,
      draggable: '.card-ing', filter: '.icon-btn', preventOnFilter: false,
      ghostClass: 'ghost-slot', chosenClass: 'chosen-card', fallbackClass: 'drag-fallback',
      emptyInsertThreshold: 40, scrollSensitivity: 90
    };
    $$('.bin-list').forEach((ul) => {
      sortables.push(Sortable.create(ul, {
        ...common,
        group: { name: 'pantry', pull: true, put: true },
        onStart: () => { preDrag = snapshot(); document.body.classList.add('is-dragging'); },
        onEnd: onDragEnd
      }));
    });
    const cart = $('#cart-list');
    if (cart) sortables.push(Sortable.create(cart, { ...common, group: { name: 'pantry', pull: false, put: true }, sort: false }));
  }

  function onDragEnd(evt) {
    document.body.classList.remove('is-dragging');
    const id = evt.item.dataset.id;
    const p = byId(id);
    if (!p) return;

    if (evt.to.id === 'cart-list') {
      if (S().cart.includes(id)) App.toast(`${p.name} is already in your cart`);
      else { pushUndo(preDrag); S().cart.push(id); pulseId = id; App.toast(`${p.emoji} ${p.name} added to cart`); }
    } else if (evt.to.classList.contains('bin-list')) {
      const newCat = evt.to.dataset.cat;
      const changedCat = newCat !== p.cat;
      if (changedCat || evt.oldIndex !== evt.newIndex) pushUndo(preDrag);
      if (changedCat) { p.cat = newCat; pulseId = id; App.toast(`${p.emoji} ${p.name} moved to ${catOf(newCat).label}`); }
      const order = $$('.bin-list .card-ing').map((li) => li.dataset.id);
      if (order.length === S().pantry.length) S().pantry = order.map(byId);
    }
    App.save();
    setTimeout(render, 0);   // redraw after Sortable finishes its own cleanup
  }

  /* ---------- dialogs ---------- */
  function openAdd() {
    editingId = null;
    dlg.innerHTML = `
      <div class="dlg-head"><h2 id="dlg-title">Add ingredient</h2>
        <button type="button" class="btn-icon" data-close aria-label="Close">${svg('x', 'icon')}</button></div>
      <div class="dlg-body">
        <label class="lbl" for="dlg-search" style="margin-top:4px">Search, or type a new ingredient</label>
        <input class="input" id="dlg-search" type="search" placeholder="e.g. tomato, paneer…" autocomplete="off">
        <div id="dlg-results"></div>
      </div>
      <div class="dlg-foot"><p class="dlg-status" id="dlg-status" role="status"></p><span class="spacer"></span>
        <button type="button" class="btn btn-primary" data-close>Done</button></div>`;
    renderResults('');
    dlg.showModal();
    $('#dlg-search').focus();
  }

  function renderResults(q) {
    const query = q.trim().toLowerCase();
    const have = new Set(S().pantry.map((p) => p.name.toLowerCase()));
    let html = '';
    CATEGORIES.forEach((c) => {
      const items = INGREDIENTS.filter((i) => i.cat === c.id && i.name.toLowerCase().includes(query));
      if (!items.length) return;
      html += `<h3 class="cat-title">${c.emoji} ${c.label}</h3><div class="cat-grid">` +
        items.map((i) => `<button type="button" class="cat-tile${have.has(i.name.toLowerCase()) ? ' have' : ''}" data-item="${esc(i.name)}">
          <span class="em" aria-hidden="true">${i.emoji}</span><span>${esc(i.name)}</span></button>`).join('') + '</div>';
    });
    const exact = INGREDIENTS.some((i) => i.name.toLowerCase() === query);
    if (query && !exact) {
      html = `<button type="button" class="custom-add" data-custom="${esc(q.trim())}">${svg('plus')} Add “${esc(q.trim())}” as a custom ingredient</button>` + html;
    }
    $('#dlg-results').innerHTML = html || '<p class="muted" style="margin-top:16px">No matches.</p>';
  }

  function say(msg) { const el = $('#dlg-status'); if (el) el.textContent = msg; }

  function openEdit(id) {
    const p = byId(id);
    if (!p) return;
    editingId = id;
    dlg.innerHTML = `
      <form class="dlg-form" id="edit-form" novalidate>
        <div class="dlg-head"><h2 id="dlg-title">${esc(p.emoji)} Edit ingredient</h2>
          <button type="button" class="btn-icon" data-close aria-label="Close">${svg('x', 'icon')}</button></div>
        <div class="dlg-body">
          <label class="lbl" for="e-name" style="margin-top:4px">Name</label>
          <input class="input" id="e-name" type="text" maxlength="30" value="${esc(p.name)}">
          <label class="lbl" for="e-cat">Category (moves it to that bin)</label>
          <select class="input" id="e-cat">${CATEGORIES.map((c) => `<option value="${c.id}" ${c.id === p.cat ? 'selected' : ''}>${c.emoji} ${c.label}</option>`).join('')}</select>
          <div class="row">
            <div><label class="lbl" for="e-qty">Quantity</label>
              <input class="input" id="e-qty" type="number" min="0.1" step="any" value="${p.qty}"></div>
            <div><label class="lbl" for="e-unit">Unit</label>
              <select class="input" id="e-unit">${UNITS.map((u) => `<option ${u === p.unit ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
          </div>
          <label class="lbl" for="e-exp">Expiry date</label>
          <input class="input" id="e-exp" type="date" value="${p.expiry}">
          <div class="chip-group" role="group" aria-label="Quick expiry">
            <button type="button" class="chip" data-days="0">Today</button>
            <button type="button" class="chip" data-days="3">+3 days</button>
            <button type="button" class="chip" data-days="7">+1 week</button>
            <button type="button" class="chip" data-days="30">+1 month</button>
          </div>
          <p id="e-prev" style="margin-top:12px" aria-live="polite"></p>
          <p class="form-error" id="e-err" role="alert"></p>
        </div>
        <div class="dlg-foot">
          <button type="button" class="btn btn-danger" data-delete>Delete</button><span class="spacer"></span>
          <button type="button" class="btn btn-ghost" data-close>Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>`;
    updatePreview();
    dlg.showModal();
  }

  function updatePreview() {
    const v = $('#e-exp') && $('#e-exp').value;
    const el = $('#e-prev');
    if (!el) return;
    if (!v) { el.innerHTML = ''; return; }
    const f = freshness({ expiry: v });
    el.innerHTML = `<span class="badge ${f.level}" style="display:inline-block">${f.icon} ${f.label}</span>`;
  }

  function saveEdit() {
    const p = byId(editingId);
    if (!p) return dlg.close();
    const name = $('#e-name').value.trim();
    const qty = parseFloat($('#e-qty').value);
    const exp = $('#e-exp').value;
    const fail = (msg, sel) => { $('#e-err').textContent = msg; $(sel).focus(); };
    if (!name) return fail('Please enter a name.', '#e-name');
    if (!(qty > 0)) return fail('Quantity must be more than 0.', '#e-qty');
    if (!exp) return fail('Please pick an expiry date.', '#e-exp');
    const cat = $('#e-cat').value, unit = $('#e-unit').value;
    mutate(() => Object.assign(p, { name, cat, unit, qty: Math.round(qty * 100) / 100, expiry: exp }));
    dlg.close();
    App.toast(`${p.emoji} ${name} updated`);
  }

  function bindDialog() {
    dlg = document.createElement('dialog');
    dlg.className = 'dlg';
    dlg.setAttribute('aria-labelledby', 'dlg-title');
    document.body.appendChild(dlg);

    dlg.addEventListener('click', (e) => {
      if (e.target === dlg || e.target.closest('[data-close]')) return dlg.close();

      const tile = e.target.closest('[data-item]');
      if (tile) {
        const r = addIngredient(tile.dataset.item);
        say(r.merged ? `${r.item.emoji} ${r.item.name}: now ${fmtQty(r.item)}` : `${r.item.emoji} ${r.item.name} added ✓`);
        return renderResults($('#dlg-search').value);
      }
      const custom = e.target.closest('[data-custom]');
      if (custom) {
        const r = addIngredient(custom.dataset.custom);
        say(`${r.item.emoji} ${r.item.name} added ✓`);
        $('#dlg-search').value = '';
        return renderResults('');
      }
      const quick = e.target.closest('[data-days]');
      if (quick) { $('#e-exp').value = addDays(Number(quick.dataset.days)); return updatePreview(); }

      if (e.target.closest('[data-delete]')) {
        const p = byId(editingId);
        if (!p) return;
        mutate(() => {
          S().pantry = S().pantry.filter((x) => x.id !== editingId);
          S().cart = S().cart.filter((x) => x !== editingId);
        });
        dlg.close();
        App.toast(`${p.name} removed · press Undo to bring it back`);
      }
    });

    dlg.addEventListener('input', (e) => {
      if (e.target.id === 'dlg-search') renderResults(e.target.value);
      if (e.target.id === 'e-exp') updatePreview();
    });
    dlg.addEventListener('submit', (e) => { if (e.target.id === 'edit-form') { e.preventDefault(); saveEdit(); } });
  }

  /* ---------- button actions on the board ---------- */
  function handleAction(action, id) {
    switch (action) {
      case 'add': return openAdd();
      case 'sample': return loadSample();
      case 'undo': return undo();
      case 'redo': return redo();
      case 'edit': return openEdit(id);
      case 'cart': {
        const p = byId(id);
        if (!p) return;
        const inCart = S().cart.includes(id);
        mutate(() => { S().cart = inCart ? S().cart.filter((x) => x !== id) : [...S().cart, id]; });
        return App.toast(inCart ? `${p.name} removed from cart` : `${p.emoji} ${p.name} added to cart`);
      }
      case 'cart-remove': return mutate(() => { S().cart = S().cart.filter((x) => x !== id); });
      case 'cart-clear': return mutate(() => { S().cart = []; });
      case 'cart-expiring': {
        const ids = S().pantry.filter((p) => freshness(p).level === 'soon' && !S().cart.includes(p.id)).map((p) => p.id);
        if (!ids.length) return App.toast('Nothing new is expiring within 3 days 🎉');
        mutate(() => { S().cart = [...S().cart, ...ids]; });
        return App.toast(`Added ${ids.length} expiring item${ids.length > 1 ? 's' : ''} to your cart`);
      }
      case 'find': {
        document.dispatchEvent(new CustomEvent('findrecipes', { detail: cartItems() }));
        App.navigate('recipes');
        return;
      }
    }
  }

  /* ---------- boot ---------- */
  function init() {
    App = window.App;
    root = $('#pantry-root');
    if (!root) return;
    if (!App || typeof Sortable === 'undefined') {
      root.innerHTML = `<div class="empty-state"><div class="empty-emoji">📡</div><h2>Couldn't load the drag-and-drop library</h2>
        <p>Check your internet connection and refresh the page.</p></div>`;
      return;
    }
    bindDialog();
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (btn) handleAction(btn.dataset.action, btn.dataset.id);
    });
    document.addEventListener('keydown', (e) => {
      if (!(e.ctrlKey || e.metaKey) || dlg.open || !$('#screen-pantry').classList.contains('active')) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
    });
    document.addEventListener('screenchange', (e) => { if (e.detail === 'pantry') render(); });  // refresh "days left"
    render();
  }

  window.Pantry = { add: addIngredient, addMany, removeMany, all: () => S().pantry, cart: cartItems, freshness, daysLeft, render };
  document.addEventListener('DOMContentLoaded', init);
})();