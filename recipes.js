/* =========================================================
   recipes.js - Stage 4: recipes, match %, filters, substitutions,
   AI recipe generation and step-by-step cooking mode.
   Exposes window.Recipes for Stage 5.
   ========================================================= */
(() => {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- constants ---------- */
  const HUE = { indian: 28, italian: 135, chinese: 350, mexican: 45, mediterranean: 200, thai: 165, continental: 265, american: 12 };
  const STAPLES = ['salt', 'water', 'black pepper', 'pepper', 'olive oil', 'oil', 'cooking oil', 'vegetable oil', 'sugar'];
  const MINOR_RX = /masala|powder|spice|seasoning|herb|flake|oregano|basil|coriander|cumin|turmeric|jeera|haldi|cardamom|cinnamon|paprika|thyme|parsley/;
  const NONVEG_RX = /chicken|fish|mutton|lamb|beef|pork|bacon|prawn|shrimp|meat|salmon|tuna|crab|sausage/;
  const EGG_RX = /\beggs?\b/;
  const DAIRY_RX = /milk|curd|yogurt|yoghurt|paneer|cheese|butter|cream|ghee|dahi/;
  const ALLERGEN = {
    dairy: DAIRY_RX, eggs: EGG_RX,
    gluten: /pasta|bread|flour|wheat|noodle|soy sauce|semolina|couscous/,
    peanuts: /peanut/, treenuts: /almond|cashew|walnut|pistachio|hazelnut|pecan/, soy: /soy|tofu/,
    shellfish: /prawn|shrimp|crab|lobster/, fish: /\bfish\b|salmon|tuna|\bcod\b/
  };
  const DIET_OK = {
    vegan: ['vegan'], vegetarian: ['vegan', 'vegetarian'],
    eggetarian: ['vegan', 'vegetarian', 'eggetarian'], jain: ['vegan', 'vegetarian']
  };
  const JAIN_RX = /onion|garlic|potato|carrot|ginger|radish|beetroot/;

  let App, root, dlg, cdlg, actx;
  let cook = null, detailId = null, CLASSIC = [];
  const F = { mode: null, cuisine: 'any', time: 'any', diff: 'any', sort: 'expiry', safe: true };
  const gen = { busy: false, error: null, newIds: new Set() };

  const S = () => App.state;
  const P = () => S().pantry;
  const cartItems = () => S().cart.map((id) => P().find((p) => p.id === id)).filter(Boolean);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const round2 = (n) => Math.round(n * 100) / 100;
  const cuisineLabel = (id) => { const c = CUISINES.find((x) => x.id === id); return c ? c.label : 'Other'; };
  const level = (p) => window.Pantry.freshness(p).level;
  const fmtG = (g) => (g >= 1000 ? `${(g / 1000).toFixed(1)} kg` : `${Math.round(g)} g`);
  const fmtT = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  const grams = (p) => ({ g: 1, kg: 1000, ml: 1, L: 1000 }[p.unit] || (p.unit === 'packs' ? 250 : /egg/i.test(p.name) ? 50 : 100)) * p.qty;
  const fromData = (x) => ({ id: x.id, title: x.t, emoji: x.e, cuisine: x.c, time: x.time, diff: x.d, serves: x.serves, blurb: x.blurb,
    ing: x.ing, steps: x.steps.map(([t, m]) => ({ t, m: m || 0 })), src: 'classic' });

  /* ---------- ingredient name matching ---------- */
  const sing = (w) => w.endsWith('oes') ? w.slice(0, -2) : w.endsWith('ies') ? w.slice(0, -3) + 'y' : (w.endsWith('s') && !w.endsWith('ss')) ? w.slice(0, -1) : w;
  const norm = (s) => String(s).toLowerCase().replace(/\(.*?\)/g, ' ')
    .replace(/\b(yogh?urt|dahi)\b/g, 'curd').replace(/\b(dal|daal)\b/g, 'lentils')
    .replace(/\bchil+[iy]\b/g, 'chilli').replace(/\bbell pepper\b/g, 'capsicum').replace(/\b(brinjal|aubergine)\b/g, 'eggplant')
    .replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim().split(' ').map(sing).join(' ');
  const same = (a, b) => {
    const x = norm(a), y = norm(b);
    if (!x || !y) return false;
    if (x === y) return true;
    return Math.min(x.length, y.length) >= 4 && (x.includes(y) || y.includes(x));
  };
  const isStaple = (n) => STAPLES.includes(norm(n));
  const isMinor = (n) => MINOR_RX.test(norm(n)) || INGREDIENTS.some((i) => i.cat === 'spices' && same(i.name, n));

    /* ---------- nutrition (estimates) ---------- */
  const nutriOn = () => S().showNutrition !== false;
  const NUTRI_SORTS = ['protein', 'lowcal', 'lowcarb'];
  const effSort = (f = F) => (!nutriOn() && NUTRI_SORTS.includes(f.sort) ? 'expiry' : f.sort);
  const nutriCache = new Map();

  function nutriFor(name) {
    const n = norm(name);
    let best = null;
    for (const key of Object.keys(NUTRI)) {
      const k = norm(key);
      if (k === n) return NUTRI[key];
      if (Math.min(k.length, n.length) >= 4 && (n.includes(k) || k.includes(n)) && (!best || k.length > best.len)) best = { v: NUTRI[key], len: k.length };
    }
    return best ? best.v : null;
  }

  function toGrams(name, qty, unit) {
    const u = String(unit || '').toLowerCase().trim();
    if (UNIT_TO_G[u]) return qty * UNIT_TO_G[u];
    const key = Object.keys(PIECE_G).find((k) => same(k, name));
    return qty * (key ? PIECE_G[key] : 100);
  }

  /* per-serving estimate for a recipe */
  function nutrition(r) {
    if (nutriCache.has(r.id)) return nutriCache.get(r.id);
    let kcal = 0, p = 0, c = 0, f = 0;
    const skipped = [];
    r.ing.forEach(([name, qty, unit]) => {
      const n = nutriFor(name);
      if (!n) { skipped.push(name); return; }
      const m = toGrams(name, Number(qty) || 0, unit) / 100;
      kcal += n[0] * m; p += n[1] * m; c += n[2] * m; f += n[3] * m;
    });
    const s = Math.max(1, Number(r.serves) || 1);
    const out = {
      kcal: Math.round(kcal / s), p: Math.round(p / s), c: Math.round(c / s), f: Math.round(f / s),
      total: r.ing.length, covered: r.ing.length - skipped.length, skipped,
      partial: (r.ing.length - skipped.length) / r.ing.length < 0.7
    };
    nutriCache.set(r.id, out);
    return out;
  }

  /* ---------- diet + allergy checks ---------- */
  const dietClass = (n) => NONVEG_RX.test(n) ? 'nonveg' : EGG_RX.test(n) ? 'eggetarian' : (DAIRY_RX.test(n) || /honey/.test(n)) ? 'vegetarian' : 'vegan';
  const hasRestrictions = () => { const p = S().profile; return !!(DIET_OK[p.diet] || (p.allergies || []).length); };
  function conflicts(r) {
    const p = S().profile, out = [];
    const names = r.ing.map((i) => i[0]).join(' ').toLowerCase();
    const ok = DIET_OK[p.diet];
    if (ok && !ok.includes(dietClass(names))) out.push(`Not ${(DIETS.find((d) => d.id === p.diet) || {}).label || 'suitable'}`.toLowerCase().replace(/^./, (c) => c.toUpperCase()));
    if (p.diet === 'jain' && JAIN_RX.test(names)) out.push('Has onion, garlic or root veg');
    (p.allergies || []).forEach((a) => { if (ALLERGEN[a] && ALLERGEN[a].test(names)) out.push(`Contains ${a}`); });
    return out;
  }
  function profileSummary() {
    const p = S().profile, parts = [];
    const d = DIETS.find((x) => x.id === p.diet);
    if (d && DIET_OK[p.diet]) parts.push(d.label);
    (p.allergies || []).forEach((a) => { const al = ALLERGIES.find((x) => x.id === a); if (al) parts.push('no ' + al.label.toLowerCase()); });
    return parts.join(' · ');
  }

  /* ---------- match analysis ---------- */
  function analyse(r, pool) {
    const rows = r.ing.map(([name, qty, unit, sub]) => {
      const staple = isStaple(name);
      const minor = !staple && isMinor(name);
      const item = pool.find((p) => same(p.name, name));
      return { name, qty, unit, sub, staple, minor, item, have: !!item };
    });
    const core = rows.filter((x) => !x.staple && !x.minor);
    const haveCore = core.filter((x) => x.have).length;
    const pct = core.length ? Math.round((haveCore / core.length) * 100) : 100;
    const urgent = [];
    let urg = 0;
    rows.forEach((x) => {
      if (x.item && level(x.item) === 'soon') {
        urg += 4 - Math.max(0, window.Pantry.daysLeft(x.item.expiry));
        urgent.push(x.item.name);
      }
    });
    return {
      rows, pct, urg, urgent,
      matched: rows.filter((x) => x.item && !x.staple),
      missing: rows.filter((x) => !x.have && !x.staple),
      missingCore: core.filter((x) => !x.have)
    };
  }

  function ensureMode() {
    const n = cartItems().length;
    if (!F.mode || (F.mode === 'cart' && !n)) F.mode = n ? 'cart' : 'pantry';
  }
  const poolItems = () => { ensureMode(); return F.mode === 'cart' ? cartItems() : P(); };
  const aiList = () => S().aiRecipes || [];
  const isFav = (id) => S().favorites.some((f) => f.id === id);
  const findRecipe = (id) => CLASSIC.find((r) => r.id === id) || aiList().find((r) => r.id === id) || S().favorites.find((r) => r.id === id);

  function results(pool, f = F) {
    let list = [...CLASSIC, ...aiList()].map((r) => ({ r, ...analyse(r, pool), flags: conflicts(r) }));
    list = list.filter((a) => a.matched.length > 0);
    if (f.cuisine !== 'any') list = list.filter((a) => a.r.cuisine === f.cuisine);
    if (f.time !== 'any') list = list.filter((a) => a.r.time <= Number(f.time));
    if (f.diff !== 'any') list = list.filter((a) => a.r.diff === f.diff);
    if (f.safe) list = list.filter((a) => !a.flags.length);
    const nf = (a, b) => (gen.newIds.has(b.r.id) ? 1 : 0) - (gen.newIds.has(a.r.id) ? 1 : 0);   // new AI recipes float to the top
    const by = {
      expiry:  (a, b) => b.urg - a.urg || b.pct - a.pct || a.r.time - b.r.time,
      match:   (a, b) => b.pct - a.pct || b.urg - a.urg || a.r.time - b.r.time,
      quick:   (a, b) => a.r.time - b.r.time || b.pct - a.pct,
      protein: (a, b) => nutrition(b.r).p - nutrition(a.r).p || b.pct - a.pct,
      lowcal:  (a, b) => nutrition(a.r).kcal - nutrition(b.r).kcal || b.pct - a.pct,
      lowcarb: (a, b) => nutrition(a.r).c - nutrition(b.r).c || b.pct - a.pct
    };
    const cmp = by[effSort(f)] || by.expiry;
    list.sort((a, b) => nf(a, b) || cmp(a, b));
    return list;
  }

  /* "easy Chinese recipes within 30 minutes" - describes the active filters in plain words */
  function filterPhrase() {
    const bits = [];
    if (F.diff !== 'any') bits.push(F.diff.toLowerCase());
    if (F.cuisine !== 'any') bits.push(cuisineLabel(F.cuisine));
    bits.push('recipes');
    return bits.join(' ') + (F.time !== 'any' ? ` within ${F.time} minutes` : '');
  }

  /* when nothing matches, find which single filter is blocking and how many recipes it would unlock */
  function blockerHints(pool) {
    const tries = [];
    if (F.time !== 'any') tries.push([`allow recipes longer than ${F.time} minutes`, { ...F, time: 'any' }]);
    if (F.cuisine !== 'any') tries.push([`include cuisines other than ${cuisineLabel(F.cuisine)}`, { ...F, cuisine: 'any' }]);
    if (F.diff !== 'any') tries.push(['include every difficulty level', { ...F, diff: 'any' }]);
    if (F.safe && hasRestrictions()) tries.push(['turn off the diet and allergy filter', { ...F, safe: false }]);
    return tries.map(([label, f]) => ({ label, n: results(pool, f).length })).filter((t) => t.n > 0);
  }

  /* ---------- HTML builders ---------- */
  const notice = (type, html, extra = '') =>
    `<div class="notice ${type}" role="${type === 'error' ? 'alert' : 'status'}"><span aria-hidden="true">${type === 'error' ? '⚠️' : type === 'ok' ? '✅' : 'ℹ️'}</span><div>${html}${extra}</div></div>`;

  function controlsHTML(cartN, pantryN) {
    const all = [...CLASSIC, ...aiList()];
    const cuisines = CUISINES.filter((c) => all.some((r) => r.cuisine === c.id));
    const opt = (v, label, cur) => `<option value="${v}"${String(cur) === String(v) ? ' selected' : ''}>${label}</option>`;
    const sort = effSort();
    const nutriSorts = nutriOn() ? opt('protein', '💪 Highest protein', sort) + opt('lowcal', '🥗 Lowest calories', sort) + opt('lowcarb', '🍞 Lowest carbs', sort) : '';
    return `<section class="rfilters" aria-label="Recipe options">
      <div class="rf-row">
        <div class="seg" role="group" aria-label="Which ingredients to use">
          <button type="button" data-src="cart" aria-pressed="${F.mode === 'cart'}"${cartN ? '' : ' disabled'}>🛒 Recipe cart (${cartN})</button>
          <button type="button" data-src="pantry" aria-pressed="${F.mode === 'pantry'}">🧺 Whole pantry (${pantryN})</button>
        </div>
        <button type="button" class="btn btn-primary" data-act="gen"${gen.busy ? ' disabled' : ''}>${gen.busy ? 'Creating recipes…' : '✨ Generate with AI'}</button>
      </div>
      <div class="rf-row">
        <label class="rf-field">Cuisine<select class="input" data-f="cuisine">${opt('any', 'Any cuisine', F.cuisine)}${cuisines.map((c) => opt(c.id, `${c.emoji} ${c.label}`, F.cuisine)).join('')}</select></label>
        <label class="rf-field">Cooking time<select class="input" data-f="time">${opt('any', 'Any time', F.time)}${opt(15, 'Up to 15 min', F.time)}${opt(30, 'Up to 30 min', F.time)}${opt(45, 'Up to 45 min', F.time)}</select></label>
        <label class="rf-field">Difficulty<select class="input" data-f="diff">${opt('any', 'Any level', F.diff)}${opt('Easy', 'Easy', F.diff)}${opt('Medium', 'Medium', F.diff)}${opt('Hard', 'Hard', F.diff)}</select></label>
        <label class="rf-field">Sort by<select class="input" data-f="sort">${opt('expiry', '⏳ Use expiring first', sort)}${opt('match', '🎯 Best match', sort)}${opt('quick', '⚡ Quickest', sort)}${nutriSorts}</select></label>
      </div>
      <div class="rf-row" style="justify-content:flex-start;gap:12px 28px">
        ${hasRestrictions() ? `<label class="switch"><input type="checkbox" data-f="safe"${F.safe ? ' checked' : ''}> Respect my diet and allergies <small>(${esc(profileSummary())})</small></label>` : ''}
        <label class="switch"><input type="checkbox" data-f="nutri"${nutriOn() ? ' checked' : ''}> Show nutrition <small>(estimates)</small></label>
      </div>
    </section>`;
  }

  function cardHTML(a) {
    const r = a.r, fav = isFav(r.id);
    const nu = nutriOn() ? nutrition(r) : null;
    const cls = a.pct >= 75 ? 'hi' : a.pct >= 40 ? 'mid' : 'lo';
    const tags = [
      gen.newIds.has(r.id) ? '<span class="badge ai">✨ New</span>' : r.src === 'ai' ? '<span class="badge ai">✨ AI</span>' : '',
      a.urgent.length ? `<span class="badge soon">⏳ Uses ${esc(a.urgent.slice(0, 2).join(', '))}</span>` : '',
      a.missingCore.length ? `<span class="badge">${a.missingCore.length} to buy</span>` : '<span class="badge fresh">✓ Have it all</span>',
      nu && nu.p >= 20 ? '<span class="badge fresh">💪 High protein</span>' : '',
      nu && nu.kcal <= 350 && nu.kcal > 0 ? '<span class="badge">🥗 Light</span>' : '',
      a.flags.length && !F.safe ? `<span class="badge expired">⚠ ${esc(a.flags[0])}</span>` : ''
    ].join('');
    const macro = nu ? `<p class="macros" aria-label="Per serving: about ${nu.kcal} calories, ${nu.p} grams protein, ${nu.c} grams carbs, ${nu.f} grams fat"><b>${nu.partial ? '~' : ''}${nu.kcal}</b> kcal <span aria-hidden="true">· P ${nu.p}g · C ${nu.c}g · F ${nu.f}g</span></p>` : '';
    return `<article class="rcard" style="--h:${HUE[r.cuisine] ?? 30}">
      <button type="button" class="rcard-main" data-open="${r.id}" aria-label="Open ${esc(r.title)}. ${a.pct} percent match, ${r.time} minutes${nu ? `, about ${nu.kcal} calories per serving` : ''}">
        <div class="rc-top"><span class="rc-emoji" aria-hidden="true">${esc(r.emoji)}</span>
          <span class="ring ${cls}" style="--p:${a.pct}" aria-hidden="true"><b>${a.pct}%</b></span></div>
        <h3>${esc(r.title)}</h3>
        <p class="rc-meta">⏱ ${r.time} min · ${esc(r.diff)} · ${esc(cuisineLabel(r.cuisine))}</p>
        ${macro}
        <div class="rc-tags">${tags}</div>
      </button>
      <button type="button" class="fav-btn${fav ? ' on' : ''}" data-fav="${r.id}" aria-pressed="${fav}" aria-label="${fav ? 'Remove' : 'Save'} ${esc(r.title)}">${App.icon('favorites')}</button>
    </article>`;
  }

  function captureFocus() {
    const a = document.activeElement;
    if (!a || !root.contains(a)) return null;
    for (const k of ['f', 'src', 'fav', 'open', 'act']) if (a.dataset[k]) return `[data-${k}="${a.dataset[k]}"]`;
    return null;
  }

  function render() {
    if (!root) return;
    const focus = captureFocus();
    const pantryN = P().length;
    if (!pantryN) {
      root.innerHTML = `<div class="empty-state"><div class="empty-emoji" aria-hidden="true">🧺</div>
        <h2>Add some ingredients first</h2><p>Recipes are matched to what is in your pantry.</p>
        <div class="empty-actions"><button type="button" class="btn btn-primary" data-act="goto-add">Add ingredients</button>
        <button type="button" class="btn btn-ghost" data-act="goto-pantry">Open pantry</button></div></div>`;
      return;
    }
    ensureMode();
    const pool = poolItems();
    const res = results(pool);
    const soon = pool.filter((p) => level(p) === 'soon').map((p) => p.name);

    let html = controlsHTML(cartItems().length, pantryN);
    if (soon.length) html += notice('info', `<b>${soon.length} ingredient${soon.length > 1 ? 's' : ''} expiring soon:</b> ${esc(soon.slice(0, 5).join(', '))}. ${F.sort === 'expiry' ? 'Recipes that use them are shown first.' : 'Sort by “Use expiring first” to see recipes that use them.'}`);
    if (gen.error && gen.error.nokey) html += notice('info', '<b>AI recipes need an API key.</b> Open the Add screen and click the “Demo mode” pill to connect one. The built-in recipes below work without it.',
      '<div class="actions"><button type="button" class="btn btn-ghost btn-sm" data-act="goto-add">Go to Add</button></div>');
    else if (gen.error) html += notice('error', esc(gen.error.msg) + ' The built-in recipes below still work.',
      '<div class="actions"><button type="button" class="btn btn-ghost btn-sm" data-act="gen">Try again</button></div>');

    html += `<p class="rcount" role="status">${gen.busy ? 'Asking AI for ideas…' : `${res.length} recipe${res.length === 1 ? '' : 's'} using ${pool.length} ingredient${pool.length === 1 ? '' : 's'} from ${F.mode === 'cart' ? 'your recipe cart' : 'your pantry'}`}</p>`;
    if (!res.length && !gen.busy) {
      const hints = blockerHints(pool);
      const filtered = F.cuisine !== 'any' || F.time !== 'any' || F.diff !== 'any';
      html += `<div class="empty-state"><div class="empty-emoji" aria-hidden="true">🔍</div>
        <h2>${filtered ? `No ${esc(filterPhrase())} with your ingredients` : 'No recipes match yet'}</h2>
        <p>${hints.length ? 'Here is what would bring recipes back:' : 'Try adding more ingredients, or let AI invent something.'}</p>
        ${hints.length ? `<ul style="list-style:none;display:grid;gap:6px;margin-top:12px">${hints.map((h) => `<li>If you <b>${esc(h.label)}</b>, you’d get ${h.n} recipe${h.n > 1 ? 's' : ''}.</li>`).join('')}</ul>` : ''}
        <div class="empty-actions"><button type="button" class="btn btn-ghost" data-act="reset">Clear filters</button>
        <button type="button" class="btn btn-primary" data-act="gen">✨ Generate with AI</button></div></div>`;
    } else {
      html += `<div class="rgrid">${gen.busy ? '<div class="skel" aria-hidden="true"></div>'.repeat(3) : ''}${res.map(cardHTML).join('')}</div>`;
    }
    root.innerHTML = html;
    if (focus) { const el = $(focus, root); if (el && !el.disabled) el.focus({ preventScroll: true }); }
  }

  /* ---------- favourites + shopping ---------- */
  function toggleFav(id) {
    const r = findRecipe(id); if (!r) return;
    if (isFav(id)) { S().favorites = S().favorites.filter((f) => f.id !== id); App.toast('Removed from saved recipes'); }
    else { S().favorites.unshift(JSON.parse(JSON.stringify(r))); App.toast(`♥ ${r.title} saved`); }
    App.save(); render();
    if (dlg.open) renderDetail();
  }

  function addMissing(id) {
    const r = findRecipe(id); if (!r) return;
    const a = analyse(r, poolItems());
    let n = 0;
    a.missing.forEach((x) => {
      if (!S().shopping.some((s) => !s.done && same(s.name, x.name))) {
        S().shopping.push({ id: uid(), name: x.name, qty: x.qty, unit: x.unit, done: false, from: r.title });
        n++;
      }
    });
    App.save();
    App.toast(n ? `🛒 ${n} item${n > 1 ? 's' : ''} added to your shopping list` : 'Those are already on your shopping list');
  }

  /* ---------- recipe detail ---------- */
  function subsFor(x) {
    const out = [];
    if (x.sub) out.push([x.sub, 'suggested']);
    const key = Object.keys(SUBSTITUTES).find((k) => same(k, x.name));
    if (key) SUBSTITUTES[key].forEach((s) => { if (!out.some((o) => same(o[0], s[0]))) out.push(s); });
    return out.map(([name, note]) => ({ name, note, have: P().some((p) => same(p.name, name)) }))
      .sort((a, b) => b.have - a.have).slice(0, 3);
  }

  function rowHTML(x) {
    const [cls, mark, label] = x.have ? ['have', '✓', 'You have this'] : x.staple ? ['staple', '•', 'Pantry staple']
      : x.minor ? ['opt', '○', 'Spice, not in pantry'] : ['miss', '✕', 'Missing'];
    let extra = '';
    if (x.item) {
      const f = window.Pantry.freshness(x.item);
      extra = `<span class="ing-note">In pantry: ${esc(String(x.item.qty))} ${esc(x.item.unit)} · ${f.icon} ${esc(f.label)}</span>`;
    } else if (!x.staple) {
      const subs = subsFor(x);
      if (subs.length) extra = `<div class="subs"><span>Swap with:</span>${subs.map((s) => `<span class="sub${s.have ? ' have' : ''}">${esc(s.name)}${s.note ? ' · ' + esc(s.note) : ''}${s.have ? ' ✓ you have it' : ''}</span>`).join('')}</div>`;
    }
    return `<li class="ing-row"><span class="st ${cls}" aria-hidden="true">${mark}</span>
      <div><b>${esc(x.name)}</b> <span class="sr-only">(${label})</span>${extra}</div>
      <span class="ing-amt">${esc(String(x.qty))} ${esc(x.unit)}</span></li>`;
  }

  function nutritionHTML(r) {
    if (!nutriOn()) return '';
    const nu = nutrition(r);
    const e = nu.p * 4 + nu.c * 4 + nu.f * 9;
    const pp = e ? Math.round((nu.p * 4 / e) * 100) : 0;
    const cp = e ? Math.round((nu.c * 4 / e) * 100) : 0;
    const fp = e ? Math.max(0, 100 - pp - cp) : 0;
    const note = nu.skipped.length ? ` Based on ${nu.covered} of ${nu.total} ingredients (${esc(nu.skipped.slice(0, 3).join(', '))} not counted).` : '';
    return `<h3 class="cat-title">Nutrition per serving</h3>
      <div class="nutri-grid">
        <div class="nutri-tile kcal"><b>${nu.partial ? '~' : ''}${nu.kcal}</b><span>calories</span></div>
        <div class="nutri-tile"><b>${nu.p} g</b><span>protein</span></div>
        <div class="nutri-tile"><b>${nu.c} g</b><span>carbs</span></div>
        <div class="nutri-tile"><b>${nu.f} g</b><span>fat</span></div>
      </div>
      <div class="nbar" role="img" aria-label="Share of calories: ${pp} percent protein, ${cp} percent carbs, ${fp} percent fat"><i class="p" style="width:${pp}%"></i><i class="c" style="width:${cp}%"></i><i class="f" style="width:${fp}%"></i></div>
      <div class="nlegend" aria-hidden="true"><span><i class="p"></i>Protein ${pp}%</span><span><i class="c"></i>Carbs ${cp}%</span><span><i class="f"></i>Fat ${fp}%</span></div>
      <p class="foot-note">Estimate for one of ${r.serves} serving${r.serves === 1 ? '' : 's'}, based on typical values per 100 g.${note} Oil used in the method but not listed isn’t counted. Not medical advice.</p>`;
  }

  function renderDetail() {
    const r = findRecipe(detailId); if (!r) return;
    const a = analyse(r, poolItems());
    const fav = isFav(r.id);
    const coreN = a.rows.filter((x) => !x.staple && !x.minor).length;
    dlg.style.setProperty('--h', HUE[r.cuisine] ?? 30);
    dlg.innerHTML = `
      <div class="rhero">
        <span class="rc-emoji" aria-hidden="true">${esc(r.emoji)}</span>
        <div style="flex:1;min-width:0"><h2 id="rd-title">${esc(r.title)}</h2>
          <p class="rc-meta">⏱ ${r.time} min · ${esc(r.diff)} · ${esc(cuisineLabel(r.cuisine))} · serves ${r.serves}</p></div>
        <button type="button" class="btn-icon" data-close aria-label="Close"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
      </div>
      <div class="dlg-body">
        ${r.blurb ? `<p style="margin-top:8px">${esc(r.blurb)}</p>` : ''}
        <h3 class="cat-title">Your match: ${a.pct}%</h3>
        <div class="mbar" role="img" aria-label="${a.pct} percent of key ingredients available"><div style="width:${a.pct}%"></div></div>
        <p class="muted">You have ${coreN - a.missingCore.length} of ${coreN} key ingredients${a.urgent.length ? `. Uses expiring: <b>${esc(a.urgent.join(', '))}</b>` : ''}.</p>
        ${nutritionHTML(r)}
        <h3 class="cat-title">Ingredients</h3>
        <ul class="ing-list">${a.rows.map(rowHTML).join('')}</ul>
        <h3 class="cat-title">Method</h3>
        <ol class="steps-prev">${r.steps.map((s) => `<li>${esc(s.t)}${s.m ? ` <span class="muted">(${s.m} min)</span>` : ''}</li>`).join('')}</ol>
      </div>
      <div class="dlg-foot wrap">
        <button type="button" class="btn btn-ghost${fav ? ' on' : ''}" data-d="fav" aria-pressed="${fav}">${App.icon('favorites')} ${fav ? 'Saved' : 'Save'}</button>
        <button type="button" class="btn btn-ghost" data-d="shop"${a.missing.length ? '' : ' disabled'}>${App.icon('shopping')} Add ${a.missing.length || ''} to shopping list</button>
        <span class="spacer"></span>
        <button type="button" class="btn btn-primary" data-d="cook">👩‍🍳 Start cooking</button>
      </div>`;
  }

  function openDetail(id) {
    if (!findRecipe(id)) return;
    detailId = id;
    renderDetail();
    if (!dlg.open) dlg.showModal();
  }

  /* ---------- AI recipe generation ---------- */
  function normAI(x) {
    if (!x || typeof x.title !== 'string' || !Array.isArray(x.ingredients) || !Array.isArray(x.steps)) return null;
    const ing = x.ingredients.filter((i) => i && i.name).slice(0, 20)
      .map((i) => [String(i.name).slice(0, 40), Number(i.qty) > 0 ? round2(Number(i.qty)) : 1, String(i.unit || 'pcs').slice(0, 8), i.sub ? String(i.sub).slice(0, 40) : '']);
    const steps = x.steps.filter((s) => s && (s.text || typeof s === 'string')).slice(0, 12)
      .map((s) => ({ t: String(s.text || s).slice(0, 300), m: Math.min(180, Math.max(0, Math.round(Number(s.minutes) || 0))) }));
    if (!ing.length || !steps.length) return null;
    const emoji = String(x.emoji || '');
    return {
      id: 'ai-' + uid(), title: x.title.slice(0, 60),
      emoji: /\p{Extended_Pictographic}/u.test(emoji) && emoji.length <= 8 ? emoji : '🍽️',
      cuisine: CUISINES.some((c) => c.id === String(x.cuisine).toLowerCase()) ? String(x.cuisine).toLowerCase() : 'continental',
      time: Math.min(180, Math.max(5, Math.round(Number(x.time) || 30))),
      diff: ['Easy', 'Medium', 'Hard'].find((d) => d.toLowerCase() === String(x.difficulty).toLowerCase()) || 'Medium',
      serves: Number(S().profile.household) || 2, blurb: String(x.blurb || '').slice(0, 160), ing, steps, src: 'ai'
    };
  }

  /* turn the AI reply into recipe objects, keeping only ones that respect the active filters */
  function parseRecipes(text) {
    let data;
    try { data = AI.extractJSON(text); }
    catch (e) { throw new AI.AIError('The AI reply wasn’t in the expected format.', 'format'); }
    if (!Array.isArray(data) && data && typeof data === 'object') {
      data = data.recipes || Object.values(data).find(Array.isArray) || [data];
    }
    const ok = (r) => (F.cuisine === 'any' || r.cuisine === F.cuisine)
      && (F.time === 'any' || r.time <= Number(F.time))
      && (F.diff === 'any' || r.diff === F.diff);
    const all = (Array.isArray(data) ? data : []).map(normAI).filter(Boolean);
    const list = all.filter(ok).slice(0, 4);
    if (!list.length) throw new AI.AIError(all.length ? 'filters' : 'The AI didn’t return usable recipes.', all.length ? 'filters' : 'format');
    return list;
  }

  async function generate() {
    if (gen.busy) return;
    if (!AI.hasKey()) { gen.error = { nokey: true }; return render(); }
    const pool = poolItems().filter((p) => level(p) !== 'expired')
      .sort((a, b) => window.Pantry.daysLeft(a.expiry) - window.Pantry.daysLeft(b.expiry)).slice(0, 25);
    if (!pool.length) return App.toast('Add some fresh ingredients first');

    const prof = S().profile;
    const lines = pool.map((p) => {
      const d = window.Pantry.daysLeft(p.expiry);
      return `- ${p.name}: ${p.qty} ${p.unit}, ${d <= 0 ? 'expires today' : d + ' days left'}`;
    }).join('\n');
    const diet = (DIETS.find((d) => d.id === prof.diet) || {}).label || 'No preference';
    const allergies = (prof.allergies || []).join(', ') || 'none';
    const likes = (prof.cuisines || []).join(', ') || 'any';
    const musts = [];
    if (F.cuisine !== 'any') musts.push(`Every recipe must be ${cuisineLabel(F.cuisine)} cuisine (set "cuisine" to "${F.cuisine}").`);
    if (F.time !== 'any') musts.push(`Every recipe must take ${F.time} minutes or less in total (the "time" number must be ${F.time} or lower).`);
    if (F.diff !== 'any') musts.push(`Every recipe must have difficulty "${F.diff}".`);

    const prompt =
`You are the recipe engine inside a food-waste-reduction app. Create 4 different home-cook recipes that mainly use the ingredients below, and prioritise the ones that expire soonest.
Ingredients the user has:
${lines}
Rules:
- Diet: ${diet}. Allergies to avoid completely (including hidden sources such as soy sauce for a soy allergy): ${allergies}. Favourite cuisines: ${likes}. Cooking for ${prof.household || 2} people.
${musts.map((m) => '- ' + m).join('\n')}
- For items from the list use the exact ingredient name given above. Add at most 3 extra ingredients (salt, pepper, oil and water do not count). For each extra ingredient add a "sub" field with one possible substitute.
- 4 to 8 short, clear steps. Set "minutes" on steps that need a timer, otherwise 0.
Reply with ONLY a JSON array of 4 recipe objects. Each object:
{"title": string, "emoji": one emoji, "cuisine": one of "indian","italian","chinese","mexican","mediterranean","thai","continental","american", "time": total minutes (number), "difficulty": "Easy" or "Medium" or "Hard", "blurb": one sentence, "ingredients": [{"name": string, "qty": number, "unit": "g","kg","ml","L","pcs","tsp","tbsp","cup" or "cloves", "sub": optional string}], "steps": [{"text": string, "minutes": number}]}`;

    gen.busy = true; gen.error = null; render();
    try {
      let fresh;
      for (let attempt = 0; attempt < 2; attempt++) {          // one automatic retry if the reply is malformed or ignores a filter
        try { fresh = parseRecipes(await AI.call([{ type: 'text', text: prompt }], 6000, { json: true })); break; }
        catch (e) { if ((e.code !== 'format' && e.code !== 'filters') || attempt === 1) throw e; }
      }
      S().aiRecipes = [...fresh, ...aiList()].slice(0, 12);
      gen.newIds = new Set(fresh.map((r) => r.id));
      App.save();
      gen.busy = false; render();
      App.toast(`✨ ${fresh.length} new recipes created`);
    } catch (e) {
      gen.busy = false;
      gen.error = { msg: e.code === 'filters'
        ? `The AI couldn’t make ${filterPhrase()} from these ingredients. Try loosening one filter.`
        : e.code === 'format' ? 'The AI had trouble with that request. Please try again.'
        : (e.message || 'Something went wrong while creating recipes.') };
      render();
    }
  }

  /* ---------- cooking mode ---------- */
  function unlockAudio() {
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) { /* ignore */ }
  }
  function beep() {
    try {
      unlockAudio();
      [0, 0.28, 0.56].forEach((t) => {
        const o = actx.createOscillator(), g = actx.createGain(), at = actx.currentTime + t;
        o.type = 'sine'; o.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(0.35, at + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
        o.connect(g); g.connect(actx.destination); o.start(at); o.stop(at + 0.24);
      });
    } catch (e) { /* ignore */ }
  }

  function startCook(id) {
    const r = findRecipe(id); if (!r) return;
    const a = analyse(r, P());
    cook = {
      r, a, i: 0, timers: {}, tick: null, lock: null, got: new Set(),
      steps: [{ k: 'gather' }, ...r.steps.map((s, i) => ({ k: 'step', n: i + 1, t: s.t, m: s.m })), { k: 'done' }],
      use: new Set(a.rows.filter((x) => x.item && !x.staple && x.item.cat !== 'spices').map((x) => x.item.id))
    };
    if (dlg.open) dlg.close();
    renderCook(true);
    cdlg.showModal();
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then((l) => { if (cook) cook.lock = l; else l.release(); }).catch(() => {}); } catch (e) { /* ignore */ }
  }

  function renderCook(focusMain = false) {
    const c = cook; if (!c) return;
    const s = c.steps[c.i], last = c.steps.length - 1;
    const pct = Math.max(4, Math.round((c.i / last) * 100));
    const label = s.k === 'gather' ? 'Prep' : s.k === 'done' ? 'All done' : `Step ${s.n} of ${last - 1}`;
    const keep = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.c : null;
    let body = '';

    if (s.k === 'gather') {
      body = `<div class="cook-step"><h2 class="cook-h">Gather your ingredients</h2>
        <p class="muted">Tick things off as you collect them.</p>
        <div class="check-list">${c.a.rows.map((x, i) => `<label class="check-row${c.got.has(i) ? ' done' : ''}">
          <input type="checkbox" data-got="${i}"${c.got.has(i) ? ' checked' : ''}>
          <span class="nm"><b>${esc(x.name)}</b> <span class="muted">${esc(String(x.qty))} ${esc(x.unit)}</span></span>
          ${!x.have && !x.staple ? '<span class="badge expired">not in pantry</span>' : ''}</label>`).join('')}</div></div>`;
    } else if (s.k === 'step') {
      let timer = '';
      if (s.m > 0) {
        const tm = c.timers[c.i] = c.timers[c.i] || { total: s.m * 60, left: s.m * 60, endAt: 0, running: false, done: false };
        timer = `<div class="timer${tm.running ? ' running' : ''}${tm.done ? ' done' : ''}">
          <span class="timer-time" id="timer-left" role="timer" aria-label="Time left">${fmtT(tm.left)}</span>
          <div class="actions">
            <button type="button" class="btn btn-primary" data-c="tstart"${tm.done ? ' disabled' : ''}>${tm.running ? 'Pause' : tm.done ? 'Time’s up ✓' : tm.left < tm.total ? 'Resume' : 'Start timer'}</button>
            <button type="button" class="btn btn-ghost" data-c="treset">Reset</button>
            <button type="button" class="btn btn-ghost" data-c="tplus">+1 min</button>
          </div></div>`;
      }
      body = `<div class="cook-step"><span class="cook-num" aria-hidden="true">${s.n}</span><p class="cook-text">${esc(s.t)}</p>${timer}</div>`;
    } else {
      const used = c.a.rows.filter((x) => x.item && !x.staple);
      body = `<div class="cook-step" style="text-align:center"><div class="empty-emoji" aria-hidden="true">🎉</div>
        <h2 class="cook-h">Nicely done!</h2><p class="lead">Enjoy your ${esc(c.r.title)}.</p>
        <p class="lbl" style="text-align:left">${used.length ? 'Used these up? We’ll remove them from your pantry and log the food you saved.' : 'None of your pantry items matched, so nothing to remove.'}</p>
        <div class="check-list" style="text-align:left">${used.map((x) => `<label class="check-row">
          <input type="checkbox" data-use="${x.item.id}"${c.use.has(x.item.id) ? ' checked' : ''}>
          <span class="nm">${esc(x.item.emoji)} <b>${esc(x.item.name)}</b> <span class="muted">${esc(String(x.item.qty))} ${esc(x.item.unit)}</span></span></label>`).join('')}</div></div>`;
    }

    const nextLabel = s.k === 'gather' ? 'Start cooking →' : s.k === 'done' ? 'Finish and log ✓' : (c.i === last - 1 ? 'Done cooking →' : 'Next step →');
    cdlg.innerHTML = `
      <div class="cook-head"><div style="flex:1;min-width:0"><span class="eyebrow">${label}</span><h2 id="cook-title">${esc(c.r.emoji)} ${esc(c.r.title)}</h2></div>
        <button type="button" class="btn btn-ghost btn-sm" data-c="close">Exit</button></div>
      <div class="cook-prog" role="progressbar" aria-label="Cooking progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><div style="width:${pct}%"></div></div>
      <div class="cook-body" id="cook-main" tabindex="-1">${body}</div>
      <div class="dlg-foot"><button type="button" class="btn btn-ghost" data-c="back"${c.i === 0 ? ' disabled' : ''}>← Back</button><span class="spacer"></span>
        <button type="button" class="btn btn-primary" data-c="${s.k === 'done' ? 'finish' : 'next'}">${nextLabel}</button></div>`;

    if (focusMain) $('#cook-main').focus({ preventScroll: true });
    else if (keep) { const el = $(`[data-c="${keep}"]`, cdlg); if (el && !el.disabled) el.focus({ preventScroll: true }); }
  }

  function ensureTick() { if (cook && !cook.tick) cook.tick = setInterval(tick, 250); }
  function tick() {
    if (!cook) return;
    let any = false;
    Object.entries(cook.timers).forEach(([i, tm]) => {
      if (!tm.running) return;
      tm.left = Math.max(0, Math.ceil((tm.endAt - Date.now()) / 1000));
      if (tm.left === 0) {
        tm.running = false; tm.done = true;
        beep();
        if (navigator.vibrate) navigator.vibrate([250, 120, 250]);
        App.toast(`⏰ Timer for step ${i} is finished`);
        if (Number(i) === cook.i) renderCook();
      } else any = true;
    });
    const cur = cook.timers[cook.i], el = $('#timer-left');
    if (el && cur) el.textContent = fmtT(cur.left);
    if (!any) { clearInterval(cook.tick); cook.tick = null; }
  }

  function timerAction(act) {
    const tm = cook.timers[cook.i]; if (!tm) return;
    if (act === 'tstart') {
      if (tm.done) return;
      if (tm.running) { tm.left = Math.max(0, Math.ceil((tm.endAt - Date.now()) / 1000)); tm.running = false; }
      else { tm.endAt = Date.now() + tm.left * 1000; tm.running = true; unlockAudio(); ensureTick(); }
    } else if (act === 'treset') {
      Object.assign(tm, { left: tm.total, running: false, done: false, endAt: 0 });
    } else if (act === 'tplus') {
      if (tm.done) { tm.done = false; tm.left = 60; }
      else { tm.left += 60; if (tm.running) tm.endAt += 60000; }
    }
    renderCook();
  }

  function finishCook() {
    const c = cook; if (!c) return;
    const items = P().filter((p) => c.use.has(p.id));
    S().history.unshift({
      id: uid(), rid: c.r.id, title: c.r.title, emoji: c.r.emoji, date: new Date().toISOString(),
      grams: Math.round(items.reduce((sum, p) => sum + grams(p), 0)),
      items: items.map((p) => ({ name: p.name, emoji: p.emoji, grams: Math.round(grams(p)), level: level(p) }))
    });
    if (S().history.length > 200) S().history.length = 200;
    App.save();
    const total = items.reduce((sum, p) => sum + grams(p), 0);
    if (items.length) window.Pantry.removeMany(items.map((p) => p.id));
    cdlg.close();
    App.toast(items.length ? `🎉 Logged! ${items.length} ingredient${items.length > 1 ? 's' : ''} used up (about ${fmtG(total)})` : '🎉 Meal logged!');
    render();
  }

  /* ---------- dialogs + events ---------- */
  function bind() {
    dlg = document.createElement('dialog');
    dlg.className = 'dlg dlg-wide';
    dlg.setAttribute('aria-labelledby', 'rd-title');
    document.body.appendChild(dlg);

    cdlg = document.createElement('dialog');
    cdlg.className = 'dlg cook';
    cdlg.setAttribute('aria-labelledby', 'cook-title');
    document.body.appendChild(cdlg);

    dlg.addEventListener('click', (e) => {
      if (e.target === dlg || e.target.closest('[data-close]')) return dlg.close();
      const b = e.target.closest('[data-d]'); if (!b) return;
      if (b.dataset.d === 'fav') toggleFav(detailId);
      else if (b.dataset.d === 'shop') addMissing(detailId);
      else if (b.dataset.d === 'cook') startCook(detailId);
    });

    cdlg.addEventListener('click', (e) => {
      if (!cook) return;
      const b = e.target.closest('[data-c]'); if (!b) return;
      const act = b.dataset.c;
      if (act === 'close') return cdlg.close();
      if (act === 'next') { cook.i = Math.min(cook.steps.length - 1, cook.i + 1); return renderCook(true); }
      if (act === 'back') { cook.i = Math.max(0, cook.i - 1); return renderCook(true); }
      if (act === 'finish') return finishCook();
      timerAction(act);
    });
    cdlg.addEventListener('change', (e) => {
      if (!cook) return;
      const t = e.target;
      if (t.dataset.got !== undefined) {
        const i = Number(t.dataset.got);
        if (t.checked) cook.got.add(i); else cook.got.delete(i);
        t.closest('.check-row').classList.toggle('done', t.checked);
      } else if (t.dataset.use) {
        if (t.checked) cook.use.add(t.dataset.use); else cook.use.delete(t.dataset.use);
      }
    });
    cdlg.addEventListener('keydown', (e) => {
      if (!cook || e.target.tagName === 'SELECT') return;
      if (e.key === 'ArrowRight' && cook.i < cook.steps.length - 1) { e.preventDefault(); cook.i++; renderCook(true); }
      else if (e.key === 'ArrowLeft' && cook.i > 0) { e.preventDefault(); cook.i--; renderCook(true); }
    });
    cdlg.addEventListener('close', () => {
      if (cook) { clearInterval(cook.tick); if (cook.lock) cook.lock.release().catch(() => {}); }
      cook = null;
    });

    root.addEventListener('click', (e) => {
      const open = e.target.closest('[data-open]'); if (open) return openDetail(open.dataset.open);
      const fav = e.target.closest('[data-fav]'); if (fav) return toggleFav(fav.dataset.fav);
      const src = e.target.closest('[data-src]'); if (src) { F.mode = src.dataset.src; gen.newIds = new Set(); return render(); }
      const a = e.target.closest('[data-act]'); if (!a) return;
      switch (a.dataset.act) {
        case 'gen': return generate();
        case 'reset': Object.assign(F, { cuisine: 'any', time: 'any', diff: 'any', safe: true }); gen.newIds = new Set(); return render();
        case 'goto-add': return App.navigate('add');
        case 'goto-pantry': return App.navigate('pantry');
      }
    });
    root.addEventListener('change', (e) => {
      const k = e.target.dataset.f; if (!k) return;
      if (k === 'nutri') { S().showNutrition = e.target.checked; App.save(); return render(); }
      F[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      gen.newIds = new Set();
      render();
    });
  }

  function init() {
    App = window.App; root = $('#recipes-root');
    if (!root || !App || !window.Pantry || !window.AI) return;
    CLASSIC = (typeof RECIPES !== 'undefined' ? RECIPES : []).map(fromData);
    bind();
    document.addEventListener('findrecipes', () => { F.mode = 'cart'; gen.newIds = new Set(); });
    document.addEventListener('screenchange', (e) => { if (e.detail === 'recipes') render(); });
    render();
  }

  window.Recipes = { open: (id) => { if (!F.mode) ensureMode(); openDetail(id); }, isFav, toggleFav, cook: startCook, find: findRecipe };
  document.addEventListener('DOMContentLoaded', init);
})();