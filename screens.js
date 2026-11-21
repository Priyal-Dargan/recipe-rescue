/* =========================================================
   screens.js - Stage 5
   1. Impact dashboard (SVG charts)   2. Shopping list
   3. Saved recipes + cooking history
   Reads App.state: history, shopping, favorites, pantry
   ========================================================= */
(() => {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let App;
  const S = () => App.state;
  const uid = () => 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const fmtG = (g) => (g >= 1000 ? `${(Math.round(g / 100) / 10).toFixed(1)} kg` : `${Math.round(g)} g`);
  const level = (p) => window.Pantry.freshness(p).level;

  const VALUE_PER_KG = 100;   // rough rupee value of 1 kg of groceries (change if you like)
  const PANTRY_UNITS = ['pcs', 'g', 'kg', 'ml', 'L', 'packs'];
  const UNIT_G = { g: 1, kg: 1000, ml: 1, L: 1000, pcs: 100, packs: 250, tsp: 5, tbsp: 15, cloves: 5, slices: 30, cup: 200 };
  const HUE = { indian: 28, italian: 135, chinese: 350, mexican: 45, mediterranean: 200, thai: 165, continental: 265, american: 12 };
  const cuisineLabel = (id) => { const c = CUISINES.find((x) => x.id === id); return c ? c.label : 'Other'; };

  const I = {
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    box: '<path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/>',
    redo: '<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 15-6.7L21 13"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>'
  };
  const svg = (n) => `<svg class="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;

  const catOf = (name) => {
    const n = String(name).toLowerCase();
    const b = INGREDIENTS.find((i) => i.name.toLowerCase() === n || i.name.toLowerCase() + 's' === n || i.name.toLowerCase() === n + 's');
    return b ? b.cat : 'other';
  };
  const gramsOf = (name, qty, unit) => Math.round(qty * (/egg/i.test(name) && unit === 'pcs' ? 50 : (UNIT_G[unit] || 100)));

  const notice = (type, html, extra = '') =>
    `<div class="notice ${type}" role="${type === 'error' ? 'alert' : 'status'}"><span aria-hidden="true">${type === 'error' ? '⚠️' : type === 'ok' ? '✅' : 'ℹ️'}</span><div>${html}${extra}</div></div>`;

  /* =======================================================
     1. DASHBOARD
     ======================================================= */
  const dash = { range: 7 };

  function series(days, offset = 0) {
    const map = {};
    S().history.forEach((h) => { const k = dayKey(new Date(h.date)); map[k] = (map[k] || 0) + (h.grams || 0); });
    const t = startOfDay(), out = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(t); d.setDate(t.getDate() - offset - i);
      out.push({ d, v: map[dayKey(d)] || 0 });
    }
    return out;
  }

  function niceMax(max) {
    if (max <= 0) return 500;
    const mag = Math.pow(10, Math.floor(Math.log10(max)));
    const n = max / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  }

  function chartSVG(data) {
    const W = 640, Ht = 240, L = 46, R = 8, T = 18, B = 30;
    const iw = W - L - R, ih = Ht - T - B;
    const top = niceMax(Math.max(...data.map((x) => x.v)));
    const step = iw / data.length, bw = Math.min(38, step * 0.62);
    const yOf = (v) => T + ih - (v / top) * ih;
    const total = data.reduce((s, x) => s + x.v, 0);
    let g = '';
    [0, 0.5, 1].forEach((f) => {
      const yy = yOf(top * f);
      g += `<line class="grid-line" x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}"/><text class="axis-t" x="${L - 8}" y="${yy + 4}" text-anchor="end">${fmtG(top * f)}</text>`;
    });
    data.forEach((p, i) => {
      const cx = L + step * i + step / 2;
      const h = p.v ? Math.max(3, (p.v / top) * ih) : 3, yy = T + ih - h;
      const label = p.d.toLocaleDateString('en-IN', { weekday: 'short' });
      const full = p.d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
      g += `<rect class="bar${p.v ? '' : ' zero'}" style="--i:${i}" x="${cx - bw / 2}" y="${yy}" width="${bw}" height="${h}" rx="6"><title>${full}: ${p.v ? fmtG(p.v) : 'nothing logged'}</title></rect>`;
      if (data.length <= 7 && p.v) g += `<text class="val-t" x="${cx}" y="${yy - 6}" text-anchor="middle">${fmtG(p.v)}</text>`;
      const show = data.length <= 7 || (data.length - 1 - i) % 5 === 0;
      if (show) g += `<text class="axis-t${i === data.length - 1 ? ' now' : ''}" x="${cx}" y="${Ht - 9}" text-anchor="middle">${data.length <= 7 ? label : p.d.getDate() + ' ' + p.d.toLocaleDateString('en-IN', { month: 'short' })}</text>`;
    });
    return `<svg class="chart" viewBox="0 0 ${W} ${Ht}" role="img" aria-label="Bar chart of food saved per day over the last ${data.length} days. Total ${fmtG(total)}.">${g}</svg>`;
  }

  function renderDash() {
    const root = $('#dashboard-root'); if (!root) return;
    const H = S().history, P = S().pantry;
    const total = H.reduce((s, h) => s + (h.grams || 0), 0);
    const rescued = H.reduce((s, h) => s + (h.items || []).filter((i) => i.level && i.level !== 'fresh').length, 0);
    const cur = series(dash.range), prev = series(dash.range, dash.range);
    const curSum = cur.reduce((s, x) => s + x.v, 0), prevSum = prev.reduce((s, x) => s + x.v, 0);
    let trend = '';
    if (curSum > 0 && prevSum > 0) {
      const p = Math.round(((curSum - prevSum) / prevSum) * 100);
      trend = p >= 0 ? `<span class="trend up">▲ ${p}% vs previous ${dash.range} days</span>` : `<span class="trend down">▼ ${-p}% vs previous ${dash.range} days</span>`;
    }

    const agg = {};
    H.forEach((h) => (h.items || []).forEach((i) => {
      const a = agg[i.name] = agg[i.name] || { name: i.name, emoji: i.emoji, g: 0 };
      a.g += i.grams || 0;
    }));
    const top = Object.values(agg).sort((a, b) => b.g - a.g).slice(0, 5);
    const topMax = top.length ? top[0].g : 1;

    const counts = { fresh: 0, soon: 0, expired: 0 };
    P.forEach((p) => { counts[level(p)]++; });
    const n = P.length;
    const a = n ? (counts.fresh / n) * 100 : 0, b = n ? a + (counts.soon / n) * 100 : 0;
    const urgent = P.filter((p) => level(p) !== 'fresh').sort((x, y) => window.Pantry.daysLeft(x.expiry) - window.Pantry.daysLeft(y.expiry)).slice(0, 5);
    const hasDemo = H.some((h) => h.demo);

    let html = '';
    if (!H.length) {
      html += notice('info', '<b>No meals logged yet.</b> Cook a recipe and press “Finish and log” to start tracking the food you save. Presenting soon? Fill this page with sample data.',
        '<div class="actions"><button type="button" class="btn btn-primary btn-sm" data-act="demo">Load demo history</button></div>');
    }
    html += `<div class="stats dash-stats">
        <div class="stat good"><b>${fmtG(total)}</b><span>Food saved from the bin</span></div>
        <div class="stat"><b>${H.length}</b><span>Meals cooked</span></div>
        <div class="stat soon"><b>${rescued}</b><span>Items rescued before expiry</span></div>
        <div class="stat"><b>₹${Math.round((total / 1000) * VALUE_PER_KG)}</b><span>Estimated value saved</span></div>
      </div>
      <div class="dash-grid">
        <section class="panel" aria-labelledby="ch-title">
          <div class="panel-head"><h2 id="ch-title">Food saved per day</h2>
            <div class="seg" role="group" aria-label="Time range">
              <button type="button" data-range="7" aria-pressed="${dash.range === 7}">7 days</button>
              <button type="button" data-range="30" aria-pressed="${dash.range === 30}">30 days</button>
            </div></div>
          ${trend ? `<p>${trend}</p>` : ''}
          ${curSum > 0 ? chartSVG(cur) : `<div class="chart-empty"><div class="empty-emoji" aria-hidden="true">📊</div><b>Nothing logged in the last ${dash.range} days</b><span>Finish a cooking session to see your bars grow.</span></div>`}
          <p class="foot-note">Weights are estimates based on the quantities in your pantry. Value assumes about ₹${VALUE_PER_KG} per kg.</p>
        </section>

        <section class="panel" aria-labelledby="ph-title">
          <div class="panel-head"><h2 id="ph-title">Pantry health</h2></div>
          ${n ? `<div class="donut-wrap">
              <div class="donut" style="background:conic-gradient(var(--fresh) 0 ${a}%, var(--soon) ${a}% ${b}%, var(--expired) ${b}% 100%)" role="img"
                   aria-label="${counts.fresh} fresh, ${counts.soon} use soon, ${counts.expired} expired"><div class="donut-c"><b>${n}</b><span>items</span></div></div>
              <ul class="dl"><li><span class="dot fresh"></span>Fresh <b>${counts.fresh}</b></li>
                <li><span class="dot soon"></span>Use soon <b>${counts.soon}</b></li>
                <li><span class="dot expired"></span>Expired <b>${counts.expired}</b></li></ul></div>`
            : '<p class="muted">Your pantry is empty. Add ingredients to see its health.</p>'}
          ${urgent.length ? `<ul class="exp-list" aria-label="Items to use first">${urgent.map((p) => { const f = window.Pantry.freshness(p);
              return `<li><span aria-hidden="true">${esc(p.emoji)}</span><span class="nm"><b>${esc(p.name)}</b></span><span class="badge ${f.level}">${f.icon} ${esc(f.label)}</span></li>`; }).join('')}</ul>
            <div class="actions"><button type="button" class="btn btn-primary btn-sm" data-act="recipes">Find recipes to rescue them</button></div>` : ''}
        </section>
      </div>
      <section class="panel" style="margin-top:16px" aria-labelledby="top-title">
        <div class="panel-head"><h2 id="top-title">Most rescued ingredients</h2></div>
        ${top.length ? top.map((t) => `<div class="hbar-row"><span><span aria-hidden="true">${esc(t.emoji)}</span> <b>${esc(t.name)}</b></span>
            <div class="hbar-track" aria-hidden="true"><div class="hbar-fill" style="width:${Math.max(6, (t.g / topMax) * 100)}%"></div></div><b>${fmtG(t.g)}</b></div>`).join('')
          : '<p class="muted">Cook and log a recipe to see which ingredients you use up most.</p>'}
      </section>
      ${hasDemo ? '<div class="actions" style="margin-top:16px"><button type="button" class="btn btn-ghost btn-sm" data-act="clear-demo">Remove demo data</button></div>' : ''}`;
    root.innerHTML = html;
  }

  function loadDemo() {
    const skip = ['spices', 'other'];
    const usable = RECIPES.filter((r) => r.ing.some(([nm]) => INGREDIENTS.some((i) => i.name === nm && !skip.includes(i.cat))));
    const days = [0, 1, 2, 4, 5, 7, 8, 10, 12, 13];
    const entries = days.map((d, k) => {
      const r = usable[(k * 3 + 1) % usable.length];
      const when = new Date(); when.setDate(when.getDate() - d); when.setHours(12 + (k % 8), (k * 13) % 60, 0, 0);
      const items = r.ing.map(([nm, q, u]) => ({ b: INGREDIENTS.find((i) => i.name === nm), q, u, nm }))
        .filter((x) => x.b && !skip.includes(x.b.cat)).slice(0, 4)
        .map((x, j) => ({ name: x.b.name, emoji: x.b.emoji, grams: gramsOf(x.nm, x.q, x.u), level: (k + j) % 3 === 0 ? 'soon' : 'fresh' }));
      return { id: uid(), rid: r.id, title: r.t, emoji: r.e, date: when.toISOString(), grams: items.reduce((s, i) => s + i.grams, 0), items, demo: true };
    });
    S().history = [...entries, ...S().history].sort((a, b) => new Date(b.date) - new Date(a.date));
    App.save();
    App.toast('Demo history loaded 📊');
    refreshActive();
  }

  /* =======================================================
     2. SHOPPING LIST
     ======================================================= */
  const canon = (name) => {
    const n = name.trim().replace(/\s+/g, ' ');
    const b = INGREDIENTS.find((i) => i.name.toLowerCase() === n.toLowerCase());
    return b ? b.name : n.charAt(0).toUpperCase() + n.slice(1);
  };

  const shopTodo = () => S().shopping.filter((x) => !x.done);
  const dateStr = () => new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  function shopText() {
    const todo = shopTodo();
    const lines = [`🛒 Shopping list · ${dateStr()}`, `${todo.length} item${todo.length === 1 ? '' : 's'}`];
    CATEGORIES.forEach((c) => {
      const items = todo.filter((x) => catOf(x.name) === c.id);
      if (!items.length) return;
      lines.push('', `${c.emoji} ${c.label}`);
      items.forEach((x) => lines.push(`☐ ${x.name} - ${x.qty} ${x.unit}`));
    });
    lines.push('', 'Made with Recipe Rescue 🍅');
    return lines.join('\n');
  }

  function shareList() {
    if (!shopTodo().length) return App.toast('Add some items first');
    if (!navigator.share) return copyShop();               // no share menu on this browser: copy instead
    navigator.share({ title: 'Shopping list', text: shopText() })
      .catch((e) => { if (e && e.name !== 'AbortError') App.toast('Couldn’t open the share menu'); });
  }

  function copyShop() {
    if (!S().shopping.some((x) => !x.done)) return App.toast('Nothing to copy yet');
    const text = shopText();
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* ignore */ }
      ta.remove();
      App.toast(ok ? '📋 List copied' : 'Couldn’t copy. Select the text manually');
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => App.toast('📋 List copied. Paste it into any chat'), fallback);
    } else fallback();
  }

  function renderShop() {
    const root = $('#shopping-root'); if (!root) return;
    const a = document.activeElement;
    const keep = a && root.contains(a) && a.dataset.check ? `[data-check="${a.dataset.check}"]` : null;
    const list = S().shopping;
    const todo = list.filter((x) => !x.done), done = list.filter((x) => x.done);
    const groups = CATEGORIES.map((c) => ({ c, items: todo.filter((x) => catOf(x.name) === c.id) })).filter((g) => g.items.length);
    const row = (x) => `<li class="shop-row${x.done ? ' done' : ''}">
      <label class="check-row${x.done ? ' done' : ''}"><input type="checkbox" data-check="${x.id}"${x.done ? ' checked' : ''}>
        <span class="nm"><b>${esc(x.name)}</b> <span class="muted">${esc(String(x.qty))} ${esc(x.unit)}</span>${x.from ? ` <span class="badge">for ${esc(x.from)}</span>` : ''}</span></label>
      <button type="button" class="icon-btn" data-del="${x.id}" aria-label="Remove ${esc(x.name)}">${svg('x')}</button></li>`;

    let html = `<form class="shop-add" id="shop-form" novalidate>
        <label class="sr-only" for="shop-name">Item name</label>
        <input class="input" id="shop-name" type="text" list="shop-ing" maxlength="30" autocomplete="off" placeholder="Add an item, e.g. Tomato">
        <datalist id="shop-ing">${INGREDIENTS.map((i) => `<option value="${esc(i.name)}"></option>`).join('')}</datalist>
        <label class="sr-only" for="shop-qty">Quantity</label>
        <input class="input" id="shop-qty" type="number" min="0.1" step="any" value="1">
        <label class="sr-only" for="shop-unit">Unit</label>
        <select class="input" id="shop-unit">${PANTRY_UNITS.map((u) => `<option>${u}</option>`).join('')}</select>
        <button type="submit" class="btn btn-primary">${svg('plus')} Add</button>
      </form>
      <p class="form-error" id="shop-err" role="alert"></p>`;

    if (!list.length) {
      html += `<div class="shop-actions"><span class="muted" role="status">${todo.length} to buy · ${done.length} in basket</span><span class="spacer"></span>
          ${navigator.share ? `<button type="button" class="btn btn-primary btn-sm" data-act="share"${todo.length ? '' : ' disabled'}>${svg('share')} Share</button>` : ''}
          <button type="button" class="btn btn-ghost btn-sm" data-act="copy"${todo.length ? '' : ' disabled'}>${svg('copy')} Copy list</button>
          <button type="button" class="btn btn-ghost btn-sm" data-act="clear-done"${done.length ? '' : ' disabled'}>Clear bought</button></div>`;
    } else {
      html += `<div class="shop-actions"><span class="muted" role="status">${todo.length} to buy · ${done.length} in basket</span><span class="spacer"></span>
          <button type="button" class="btn btn-ghost btn-sm" data-act="copy"${todo.length ? '' : ' disabled'}>${svg('copy')} Copy list</button>
          <button type="button" class="btn btn-ghost btn-sm" data-act="clear-done"${done.length ? '' : ' disabled'}>Clear bought</button></div>`;
      groups.forEach((g) => { html += `<h2 class="cat-title">${g.c.emoji} ${g.c.label}</h2><ul class="shop-list">${g.items.map(row).join('')}</ul>`; });
      if (!todo.length) html += '<p class="muted" style="margin-top:18px">Everything is in your basket. 🎉</p>';
      if (done.length) {
        html += `<h2 class="cat-title">✅ In basket</h2><ul class="shop-list">${done.map(row).join('')}</ul>
          <div class="actions"><button type="button" class="btn btn-primary" data-act="move">${svg('box')} Move ${done.length} bought item${done.length > 1 ? 's' : ''} to pantry</button></div>`;
      }
    }
    root.innerHTML = html;
    if (keep) { const el = $(keep, root); if (el) el.focus({ preventScroll: true }); }
  }

  function addShopItem() {
    const nameEl = $('#shop-name'), err = $('#shop-err');
    const raw = nameEl.value.trim();
    if (!raw) { err.textContent = 'Type an item name first.'; nameEl.focus(); return; }
    err.textContent = '';
    const qty = parseFloat($('#shop-qty').value) > 0 ? Math.round(parseFloat($('#shop-qty').value) * 100) / 100 : 1;
    const unit = $('#shop-unit').value, name = canon(raw);
    const ex = S().shopping.find((x) => !x.done && x.name.toLowerCase() === name.toLowerCase() && x.unit === unit);
    if (ex) ex.qty = Math.round((ex.qty + qty) * 100) / 100;
    else S().shopping.push({ id: uid(), name, qty, unit, done: false, from: '' });
    App.save(); renderShop();
    App.toast(`🛒 ${name} added`);
    $('#shop-name').focus();
  }

  function moveBought() {
    const bought = S().shopping.filter((x) => x.done);
    if (!bought.length) return;
    window.Pantry.addMany(bought.map((x) => {
      const o = { name: x.name, qty: x.qty };
      if (PANTRY_UNITS.includes(x.unit)) o.unit = x.unit; else o.qty = 1;
      return o;
    }));
    S().shopping = S().shopping.filter((x) => !x.done);
    App.save();
    App.toast(`🧺 ${bought.length} item${bought.length > 1 ? 's' : ''} moved to your pantry`);
    App.navigate('pantry');
  }

  function updateBadge() {
    const n = S().shopping.filter((x) => !x.done).length;
    $$('[data-nav="shopping"]').forEach((link) => {
      let b = $('.nav-badge', link);
      if (!n) { if (b) b.remove(); link.removeAttribute('aria-label'); return; }
      if (!b) { b = document.createElement('span'); b.className = 'nav-badge'; b.setAttribute('aria-hidden', 'true'); link.appendChild(b); }
      b.textContent = n > 9 ? '9+' : n;
      link.setAttribute('aria-label', `Shopping, ${n} item${n > 1 ? 's' : ''} to buy`);
    });
  }

  /* =======================================================
     3. SAVED + HISTORY
     ======================================================= */
  const sh = { tab: 'saved' };

  const dayLabel = (iso) => {
    const x = startOfDay(new Date(iso)), diff = Math.round((startOfDay() - x) / 86400000);
    return diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : x.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
  };

  function savedCard(r) {
    return `<article class="rcard" style="--h:${HUE[r.cuisine] ?? 30}">
      <button type="button" class="rcard-main" data-open="${r.id}" aria-label="Open ${esc(r.title)}, ${r.time} minutes">
        <div class="rc-top"><span class="rc-emoji" aria-hidden="true">${esc(r.emoji)}</span>${r.src === 'ai' ? '<span class="badge ai">✨ AI</span>' : ''}</div>
        <h3>${esc(r.title)}</h3>
        <p class="rc-meta">⏱ ${r.time} min · ${esc(r.diff)} · ${esc(cuisineLabel(r.cuisine))}</p>
        <div class="rc-tags"><span class="badge">Serves ${r.serves}</span></div>
      </button>
      <button type="button" class="fav-btn on" data-unfav="${r.id}" aria-label="Remove ${esc(r.title)} from saved">${App.icon('favorites')}</button>
    </article>`;
  }

  function histRow(h) {
    const time = new Date(h.date).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
    const chips = (h.items || []).map((i) => `<span class="badge ${i.level && i.level !== 'fresh' ? 'soon' : ''}">${esc(i.emoji)} ${esc(i.name)}${i.level && i.level !== 'fresh' ? ' ⏳' : ''}</span>`).join('');
    return `<li class="hist-row">
      <span class="hist-emoji" aria-hidden="true">${esc(h.emoji)}</span>
      <div class="hist-main"><b>${esc(h.title)}</b> <span class="muted">· ${time}</span>
        ${chips ? `<div class="rc-tags">${chips}</div>` : ''}</div>
      <div class="hist-side"><div><b>${h.grams ? fmtG(h.grams) : '-'}</b><small>saved</small></div>
        <div class="actions"><button type="button" class="btn btn-ghost btn-sm" data-cook="${esc(h.rid || '')}">${svg('redo')} Cook again</button>
        <button type="button" class="icon-btn" data-hdel="${h.id}" aria-label="Delete ${esc(h.title)} from history">${svg('x')}</button></div></div>
    </li>`;
  }

  function renderSaved() {
    const root = $('#favorites-root'); if (!root) return;
    const fav = S().favorites;
    const hist = [...S().history].sort((a, b) => new Date(b.date) - new Date(a.date));
    let html = `<div class="add-bar"><div class="seg" role="group" aria-label="View">
        <button type="button" data-tab="saved" aria-pressed="${sh.tab === 'saved'}">♥ Saved (${fav.length})</button>
        <button type="button" data-tab="history" aria-pressed="${sh.tab === 'history'}">🕑 History (${hist.length})</button></div>
        ${sh.tab === 'history' && hist.length ? '<button type="button" class="btn btn-ghost btn-sm" data-act="clear-hist">Clear history</button>' : ''}</div>`;

    if (sh.tab === 'saved') {
      html += fav.length ? `<div class="rgrid" style="margin-top:18px">${fav.map(savedCard).join('')}</div>`
        : `<div class="empty-state"><div class="empty-emoji" aria-hidden="true">💛</div><h2>No saved recipes yet</h2>
           <p>Tap the heart on any recipe to keep it here.</p>
           <div class="empty-actions"><button type="button" class="btn btn-primary" data-act="recipes">Browse recipes</button></div></div>`;
    } else if (!hist.length) {
      html += `<div class="empty-state"><div class="empty-emoji" aria-hidden="true">🍳</div><h2>Nothing cooked yet</h2>
        <p>Finish a recipe in cooking mode and it will show up here.</p>
        <div class="empty-actions"><button type="button" class="btn btn-primary" data-act="recipes">Browse recipes</button>
        <button type="button" class="btn btn-ghost" data-act="demo">Load demo history</button></div></div>`;
    } else {
      const groups = [];
      hist.forEach((h) => {
        const lab = dayLabel(h.date), g = groups[groups.length - 1];
        if (g && g.lab === lab) g.items.push(h); else groups.push({ lab, items: [h] });
      });
      html += groups.map((g) => `<h2 class="hist-day">${esc(g.lab)}</h2><ul class="hist-list">${g.items.map(histRow).join('')}</ul>`).join('');
    }
    root.innerHTML = html;
  }

  /* =======================================================
     wiring
     ======================================================= */
  function isActive(id) { const el = $('#screen-' + id); return !!el && el.classList.contains('active'); }
  function refreshActive() {
    if (isActive('dashboard')) renderDash();
    if (isActive('shopping')) renderShop();
    if (isActive('favorites')) renderSaved();
  }

  function bind() {
    const dRoot = $('#dashboard-root'), sRoot = $('#shopping-root'), fRoot = $('#favorites-root');

    dRoot.addEventListener('click', (e) => {
      const r = e.target.closest('[data-range]');
      if (r) { dash.range = Number(r.dataset.range); return renderDash(); }
      const a = e.target.closest('[data-act]'); if (!a) return;
      if (a.dataset.act === 'demo') loadDemo();
      else if (a.dataset.act === 'recipes') App.navigate('recipes');
      else if (a.dataset.act === 'clear-demo') { S().history = S().history.filter((h) => !h.demo); App.save(); renderDash(); App.toast('Demo data removed'); }
    });

    sRoot.addEventListener('submit', (e) => { if (e.target.id === 'shop-form') { e.preventDefault(); addShopItem(); } });
    sRoot.addEventListener('change', (e) => {
      const id = e.target.dataset.check; if (!id) return;
      const it = S().shopping.find((x) => x.id === id);
      if (it) { it.done = e.target.checked; App.save(); renderShop(); }
    });
    sRoot.addEventListener('click', (e) => {
      const del = e.target.closest('[data-del]');
      if (del) { S().shopping = S().shopping.filter((x) => x.id !== del.dataset.del); App.save(); renderShop(); return; }
      const a = e.target.closest('[data-act]'); if (!a) return;
      switch (a.dataset.act) {
        case 'copy': return copyShop();
        case 'share': return shareList();
        case 'move': return moveBought();
        case 'recipes': return App.navigate('recipes');
        case 'clear-done': S().shopping = S().shopping.filter((x) => !x.done); App.save(); renderShop(); return App.toast('Bought items cleared');
      }
    });

    fRoot.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-tab]'); if (tab) { sh.tab = tab.dataset.tab; return renderSaved(); }
      const open = e.target.closest('[data-open]'); if (open) return window.Recipes.open(open.dataset.open);
      const unfav = e.target.closest('[data-unfav]'); if (unfav) { window.Recipes.toggleFav(unfav.dataset.unfav); return renderSaved(); }
      const cook = e.target.closest('[data-cook]');
      if (cook) return window.Recipes.find(cook.dataset.cook) ? window.Recipes.cook(cook.dataset.cook) : App.toast('That recipe isn’t available any more');
      const hdel = e.target.closest('[data-hdel]');
      if (hdel) { S().history = S().history.filter((h) => h.id !== hdel.dataset.hdel); App.save(); renderSaved(); return App.toast('Removed from history'); }
      const a = e.target.closest('[data-act]'); if (!a) return;
      if (a.dataset.act === 'recipes') App.navigate('recipes');
      else if (a.dataset.act === 'demo') { loadDemo(); renderSaved(); }
      else if (a.dataset.act === 'clear-hist' && window.confirm('Clear your whole cooking history? This also resets your dashboard.')) {
        S().history = []; App.save(); renderSaved(); App.toast('History cleared');
      }
    });
  }

  function init() {
    App = window.App;
    if (!App || !window.Pantry || !window.Recipes) return;
    bind();

    /* keep screens + the shopping badge fresh whenever any file saves data */
    const origSave = App.save;
    App.save = function () { origSave.apply(this, arguments); updateBadge(); refreshActive(); };

    document.addEventListener('screenchange', (e) => {
      updateBadge();
      if (e.detail === 'dashboard') renderDash();
      else if (e.detail === 'shopping') renderShop();
      else if (e.detail === 'favorites') renderSaved();
    });
    renderDash(); renderShop(); renderSaved();
    setTimeout(updateBadge, 0);
  }
  document.addEventListener('DOMContentLoaded', init);
})();