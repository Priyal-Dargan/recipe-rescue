/* =========================================================
   settings.js - Settings dialog
   Profiles (local multi-user), preferences, appearance, AI connection,
   data export / import, reset.   Exposes window.Settings.open()
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let App, dlg;
  let confirming = false;   // reset confirmation showing
  let delId = null;         // profile waiting for delete confirmation
  let imp = null;           // import preview or error
  const S = () => App.state;

  const UNITS = ['pcs', 'g', 'kg', 'ml', 'L', 'packs'];
  const arr = (x) => (Array.isArray(x) ? x : []);
  const str = (x, n) => String(x == null ? '' : x).slice(0, n);
  const num = (x, d = 0) => { const n = Number(x); return Number.isFinite(n) ? n : d; };
  const uid = () => 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const fmtDate = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); };

  const I = {
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>'
  };
  const svg = (n, cls = 'icon icon-sm') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;

  /* ---------- clean + validate an imported file (never trust it) ---------- */
  function cleanItem(p) {
    if (!p || typeof p !== 'object' || !p.name || !/^\d{4}-\d{2}-\d{2}$/.test(String(p.expiry))) return null;
    return {
      id: str(p.id || uid(), 40), name: str(p.name, 40), emoji: str(p.emoji || '🥫', 16),
      cat: CATEGORIES.some((c) => c.id === p.cat) ? p.cat : 'other',
      qty: Math.min(9999, Math.max(0.1, num(p.qty, 1))), unit: UNITS.includes(p.unit) ? p.unit : 'pcs', expiry: p.expiry
    };
  }
  function cleanRecipe(r) {
    if (!r || typeof r !== 'object' || !r.id || !r.title) return null;
    const ing = arr(r.ing).filter((i) => Array.isArray(i) && typeof i[0] === 'string' && i[0]).slice(0, 30)
      .map((i) => [str(i[0], 40), num(i[1], 1), str(i[2] || 'pcs', 10), i[3] ? str(i[3], 40) : '']);
    const steps = arr(r.steps).filter((s) => s && typeof s.t === 'string').slice(0, 20)
      .map((s) => ({ t: str(s.t, 400), m: Math.min(180, Math.max(0, Math.round(num(s.m, 0)))) }));
    if (!ing.length || !steps.length) return null;
    return {
      id: str(r.id, 60), title: str(r.title, 70), emoji: str(r.emoji || '🍽️', 16),
      cuisine: CUISINES.some((c) => c.id === r.cuisine) ? r.cuisine : 'continental',
      time: Math.min(300, Math.max(1, Math.round(num(r.time, 30)))),
      diff: ['Easy', 'Medium', 'Hard'].includes(r.diff) ? r.diff : 'Medium',
      serves: Math.min(20, Math.max(1, Math.round(num(r.serves, 2)))),
      blurb: str(r.blurb, 200), ing, steps, src: r.src === 'ai' ? 'ai' : 'classic'
    };
  }
  function cleanHist(h) {
    if (!h || typeof h !== 'object' || !h.title) return null;
    const d = new Date(h.date); if (isNaN(d)) return null;
    return {
      id: str(h.id || uid(), 40), rid: str(h.rid, 60), title: str(h.title, 70), emoji: str(h.emoji || '🍽️', 16),
      date: d.toISOString(), grams: Math.max(0, Math.round(num(h.grams, 0))), demo: !!h.demo,
      items: arr(h.items).slice(0, 30).filter((i) => i && i.name).map((i) => ({
        name: str(i.name, 40), emoji: str(i.emoji || '🥫', 16), grams: Math.max(0, Math.round(num(i.grams, 0))),
        level: ['fresh', 'soon', 'expired'].includes(i.level) ? i.level : 'fresh' }))
    };
  }
  function cleanShop(x) {
    if (!x || typeof x !== 'object' || !x.name) return null;
    return { id: str(x.id || uid(), 40), name: str(x.name, 40), qty: Math.max(0.1, num(x.qty, 1)), unit: str(x.unit || 'pcs', 10), done: !!x.done, from: str(x.from, 70) };
  }
  function cleanImport(data) {
    if (!data || typeof data !== 'object' || data.app !== 'Recipe Rescue') throw new Error('NOT_EXPORT');
    const pr = data.profile && typeof data.profile === 'object' ? data.profile : {};
    const seen = new Set();
    return {
      profile: {
        name: str(pr.name, 24), diet: DIETS.some((d) => d.id === pr.diet) ? pr.diet : 'none',
        allergies: arr(pr.allergies).filter((a) => ALLERGIES.some((x) => x.id === a)),
        cuisines: arr(pr.cuisines).filter((c) => CUISINES.some((x) => x.id === c)),
        household: Math.min(10, Math.max(1, Math.round(num(pr.household, 2)))), onboarded: true
      },
      pantry: arr(data.pantry).map(cleanItem).filter((p) => p && !seen.has(p.id) && seen.add(p.id)).slice(0, 500),
      cart: [],
      favorites: arr(data.favorites).map(cleanRecipe).filter(Boolean).slice(0, 100),
      history: arr(data.history).map(cleanHist).filter(Boolean).slice(0, 200),
      shopping: arr(data.shopping).map(cleanShop).filter(Boolean).slice(0, 200),
      aiRecipes: arr(data.aiRecipes).map(cleanRecipe).filter(Boolean).slice(0, 12),
      showNutrition: data.showNutrition !== false
    };
  }

  /* ---------- small helpers for the profile list ---------- */
  function peek(key) {
    try {
      const s = JSON.parse(localStorage.getItem(key));
      return s ? { pantry: arr(s.pantry).length, meals: arr(s.history).length } : { pantry: 0, meals: 0 };
    } catch (e) { return { pantry: 0, meals: 0 }; }
  }
  const hueOf = (id) => [...id].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

  function importHTML(full) {
    if (!imp) return '';
    if (imp.error) return `<div class="notice error" role="alert"><span aria-hidden="true">⚠️</span><div>${esc(imp.error)}</div></div>`;
    const c = imp.counts;
    const summary = `${plural(c.pantry, 'ingredient')}, ${plural(c.favorites, 'saved recipe')}, ${plural(c.history, 'cooked meal')} and ${plural(c.shopping, 'shopping item')}`;
    if (imp.confirm) return `<div class="danger-zone" role="alert">
        <h4>Replace this profile’s data?</h4>
        <p>This overwrites the ingredients, saved recipes, history and shopping list in <b>${esc(S().profile.name.trim() || 'this profile')}</b> with the contents of the file. It can’t be undone.</p>
        <div class="set-row"><button type="button" class="btn btn-ghost" id="imp-unconfirm" data-act="imp-unconfirm">Cancel</button>
        <button type="button" class="btn btn-danger-solid" data-act="imp-replace-go">Yes, replace</button></div></div>`;
    return `<div class="set-card" role="status">
        <h4>Ready to import${imp.label ? ` “${esc(imp.label)}”` : ''}</h4>
        <p>${summary}${imp.when ? `. Exported ${esc(imp.when)}` : ''}.</p>
        <div class="set-row">
          <button type="button" class="btn btn-primary btn-sm" data-act="imp-new"${full ? ' disabled' : ''}>${svg('plus')} Add as new profile</button>
          <button type="button" class="btn btn-ghost btn-sm" data-act="imp-replace">Replace this profile’s data…</button>
          <button type="button" class="btn btn-ghost btn-sm" data-act="imp-cancel">Cancel</button>
        </div>
        ${full ? '<p class="field-hint">You’ve reached the profile limit. Delete one to add another.</p>' : ''}</div>`;
  }

  /* ---------- render ---------- */
  function render(focusSel) {
    const s = S(), p = s.profile, ai = AI.hasKey();
    const P = App.profiles();
    const full = P.list.length >= P.max;
    const diet = DIETS.find((d) => d.id === p.diet);
    const allergies = (p.allergies || []).map((id) => ALLERGIES.find((a) => a.id === id)).filter(Boolean);
    const cuisines = (p.cuisines || []).map((id) => CUISINES.find((c) => c.id === id)).filter(Boolean);
    const pill = (x) => `<span class="badge">${x.emoji} ${esc(x.label)}</span>`;
    const none = '<span class="muted">None</span>';
    const theme = s.theme || 'auto';
    const n = { pantry: s.pantry.length, saved: s.favorites.length, meals: s.history.length, shop: s.shopping.filter((x) => !x.done).length };
    const model = AI.model();

    const labelOf = (x) => (x.active ? (p.name.trim() || 'New profile') : (x.name || 'New profile'));
    const rows = P.list.map((x) => {
      const info = x.active ? { pantry: n.pantry, meals: n.meals } : peek(x.key);
      const label = labelOf(x);
      return `<li class="prof-row${x.active ? ' active' : ''}" style="--h:${hueOf(x.id)}">
        <span class="avatar" aria-hidden="true">${esc(label.charAt(0).toUpperCase())}</span>
        <div class="prof-main"><b>${esc(label)}</b>${x.active ? ' <span class="badge fresh">Active</span>' : ''}
          <small>${plural(info.pantry, 'ingredient')} · ${plural(info.meals, 'meal')} cooked</small></div>
        <div class="prof-actions">
          ${x.active ? '' : `<button type="button" class="btn btn-ghost btn-sm" data-switch="${x.id}">Switch</button>`}
          ${P.list.length > 1 ? `<button type="button" class="icon-btn" data-delprof="${x.id}" aria-label="Delete profile ${esc(label)}">${svg('trash')}</button>` : ''}
        </div></li>`;
    }).join('');
    const del = delId && P.list.find((x) => x.id === delId);

    dlg.innerHTML = `
      <div class="dlg-head"><h2 id="set-title">Settings</h2>
        <button type="button" class="btn-icon" data-close aria-label="Close settings">${svg('x', 'icon')}</button></div>
      <div class="dlg-body">

        <h3 class="cat-title">Profiles</h3>
        <ul class="prof-list" aria-label="Profiles on this device">${rows}</ul>
        ${del ? `<div class="danger-zone" role="alert">
            <h4>Delete “${esc(labelOf(del))}”?</h4>
            <p>This permanently deletes this profile’s ingredients, saved recipes, history and shopping list. Download their data first if you might need it later.</p>
            <div class="set-row"><button type="button" class="btn btn-ghost" id="del-cancel" data-act="del-cancel">Cancel</button>
            <button type="button" class="btn btn-danger-solid" data-act="del-go">Yes, delete profile</button></div></div>` : ''}
        <div class="set-row"><button type="button" class="btn btn-ghost btn-sm" data-act="add-prof"${full ? ' disabled' : ''}>${svg('plus')} Add profile</button></div>
        <p class="field-hint" style="margin-top:8px">Up to ${P.max} profiles. Each has its own pantry, recipes, history and preferences, saved on this device. The AI key is shared.</p>

        <h3 class="cat-title">Preferences</h3>
        <div class="set-card">
          <div class="set-line"><span>Name</span><b>${p.name.trim() ? esc(p.name) : '<span class="muted">Not set</span>'}</b></div>
          <div class="set-line"><span>Diet</span>${diet ? pill(diet) : none}</div>
          <div class="set-line"><span>Allergies</span>${allergies.length ? allergies.map(pill).join('') : none}</div>
          <div class="set-line"><span>Cuisines</span>${cuisines.length ? cuisines.map(pill).join('') : none}</div>
          <div class="set-line"><span>Cooking for</span><b>${p.household} ${p.household === 1 ? 'person' : 'people'}</b></div>
        </div>
        <div class="set-row"><button type="button" class="btn btn-ghost btn-sm" data-act="prefs">${svg('edit')} Edit preferences</button></div>

        <h3 class="cat-title">Appearance</h3>
        <div class="seg" role="group" aria-label="Colour theme">
          ${[['auto', 'Match device'], ['light', 'Light'], ['dark', 'Dark']]
            .map(([v, l]) => `<button type="button" data-theme-set="${v}" aria-pressed="${theme === v}">${l}</button>`).join('')}
        </div>

        <h3 class="cat-title">AI connection</h3>
        <div class="set-card">
          <div class="set-line"><span>Status</span>
            <span class="badge ${ai ? 'fresh' : 'soon'}">${ai ? '● AI mode on' : '● Demo mode'}</span>
            ${ai && model ? `<span class="muted">${esc(model)}</span>` : ''}</div>
          <p class="muted">${ai ? 'Photo scans and recipe ideas use real AI.' : 'Photo scans return sample ingredients and AI recipes are off. The built-in recipes still work.'}</p>
        </div>
        <div class="set-row"><button type="button" class="btn btn-ghost btn-sm" data-act="ai">${svg('spark')} ${ai ? 'Manage AI connection' : 'Connect AI'}</button></div>

        <h3 class="cat-title">This profile’s data</h3>
        <div class="set-card">
          <p>Stored only in this browser: <b>${plural(n.pantry, 'ingredient')}</b>, <b>${plural(n.saved, 'saved recipe')}</b>,
             <b>${plural(n.meals, 'cooked meal')}</b> and <b>${plural(n.shop, 'shopping item')}</b> on your list.</p>
        </div>
        <div class="set-row">
          <button type="button" class="btn btn-ghost btn-sm" data-act="export">${svg('download')} Download my data</button>
          <button type="button" class="btn btn-ghost btn-sm" data-act="import">${svg('upload')} Import data…</button>
          ${confirming ? '' : `<button type="button" class="btn btn-danger btn-sm" data-act="reset">${svg('trash')} Reset this profile…</button>`}
        </div>
        <input type="file" id="imp-file" class="sr-only" accept=".json,application/json" tabindex="-1" aria-label="Choose a Recipe Rescue data file">
        <p class="field-hint" style="margin-top:8px">Download and import let you back up a profile or move it to another device. Your API key is never included.</p>
        <div id="imp-area" style="margin-top:12px">${importHTML(full)}</div>
        ${confirming ? `
          <div class="danger-zone" role="alert">
            <h4>Delete everything in this profile and start over?</h4>
            <p>This permanently deletes your <b>${plural(n.pantry, 'ingredient')}</b>, <b>${plural(n.saved, 'saved recipe')}</b>,
               <b>${plural(n.meals, 'cooked meal')}</b>, your shopping list and your preferences. Other profiles aren’t affected. It can’t be undone.</p>
            ${ai ? '<label class="switch"><input type="checkbox" id="reset-key"> Also remove my saved API key (shared by all profiles)</label>' : ''}
            <div class="set-row">
              <button type="button" class="btn btn-ghost" id="reset-cancel" data-act="reset-cancel">Cancel</button>
              <button type="button" class="btn btn-danger-solid" data-act="reset-go">Yes, delete everything</button>
            </div>
          </div>` : ''}
      </div>
      <div class="dlg-foot"><span class="spacer"></span><button type="button" class="btn btn-primary" data-close>Done</button></div>`;

    if (focusSel) { const el = $(focusSel, dlg); if (el) el.focus(); }
  }

  /* ---------- actions ---------- */
  function exportData() {
    const s = S();
    const data = {
      app: 'Recipe Rescue', version: 1, exportedAt: new Date().toISOString(),
      profile: s.profile, pantry: s.pantry, favorites: s.favorites, history: s.history,
      shopping: s.shopping, aiRecipes: s.aiRecipes || [], showNutrition: s.showNutrition !== false
    };
    const slug = (s.profile.name || 'profile').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'profile';
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `recipe-rescue-${slug}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    App.toast('💾 Data downloaded');
  }

  async function readImport(file) {
    imp = null;
    if (file.size > 2 * 1024 * 1024) { imp = { error: 'That file is too large (2 MB max).' }; return render('[data-act="import"]'); }
    try {
      const raw = JSON.parse(await file.text());
      const clean = cleanImport(raw);
      imp = {
        clean, label: clean.profile.name, when: fmtDate(raw.exportedAt),
        counts: { pantry: clean.pantry.length, favorites: clean.favorites.length, history: clean.history.length, shopping: clean.shopping.length }
      };
      render('[data-act="imp-new"]');
    } catch (err) {
      imp = { error: err && err.message === 'NOT_EXPORT' ? 'That file isn’t a Recipe Rescue data file.' : 'We couldn’t read that file. Choose a Recipe Rescue data file (.json).' };
      render('[data-act="import"]');
    }
  }

  function replaceData() {
    const next = { ...imp.clean, theme: S().theme, sidebarCollapsed: S().sidebarCollapsed };
    try { localStorage.setItem(App.storageKey, JSON.stringify(next)); }
    catch (e) { return App.toast('Couldn’t save the imported data (browser storage is full)'); }
    history.replaceState(null, '', location.pathname + location.search);
    location.reload();
  }

  function resetAll() {
    const alsoKey = $('#reset-key') && $('#reset-key').checked;
    try {
      localStorage.removeItem(App.storageKey);
      if (alsoKey) AI.clearKey();
    } catch (e) { /* ignore */ }
    history.replaceState(null, '', location.pathname + location.search);
    location.reload();
  }

  function open() {
    confirming = false; delId = null; imp = null;
    render();
    if (!dlg.open) dlg.showModal();
  }

  function init() {
    App = window.App;
    if (!App || !window.AI) return;
    dlg = document.createElement('dialog');
    dlg.className = 'dlg';
    dlg.setAttribute('aria-labelledby', 'set-title');
    document.body.appendChild(dlg);

    dlg.addEventListener('close', () => { confirming = false; delId = null; imp = null; });

    dlg.addEventListener('change', (e) => {
      if (e.target.id !== 'imp-file') return;
      const file = e.target.files[0];
      e.target.value = '';
      if (file) readImport(file);
    });

    dlg.addEventListener('click', (e) => {
      if (e.target === dlg || e.target.closest('[data-close]')) return dlg.close();

      const t = e.target.closest('[data-theme-set]');
      if (t) {
        const v = t.dataset.themeSet;
        S().theme = v === 'auto' ? null : v;
        App.save(); App.applyTheme();
        return render(`[data-theme-set="${v}"]`);
      }
      const sw = e.target.closest('[data-switch]');
      if (sw) return App.switchProfile(sw.dataset.switch);
      const dp = e.target.closest('[data-delprof]');
      if (dp) { delId = dp.dataset.delprof; return render('#del-cancel'); }

      const a = e.target.closest('[data-act]'); if (!a) return;
      switch (a.dataset.act) {
        case 'prefs': dlg.close(); return App.openOnboarding();
        case 'ai': dlg.close(); return window.AddScreen ? window.AddScreen.openAISettings() : undefined;
        case 'export': return exportData();
        case 'import': return $('#imp-file').click();
        case 'imp-cancel': imp = null; return render('[data-act="import"]');
        case 'imp-replace': imp.confirm = true; return render('#imp-unconfirm');
        case 'imp-unconfirm': imp.confirm = false; return render('[data-act="imp-new"]');
        case 'imp-replace-go': return replaceData();
        case 'imp-new':
          if (!App.addProfile({ ...imp.clean })) App.toast('Couldn’t add the profile (limit reached or storage full)');
          return;
        case 'add-prof':
          if (!App.addProfile()) App.toast('You’ve reached the profile limit');
          return;
        case 'del-cancel': delId = null; return render('[data-act="add-prof"]');
        case 'del-go': {
          const id = delId; delId = null;
          if (App.deleteProfile(id)) { App.toast('Profile deleted'); render('[data-act="add-prof"]'); }
          return;
        }
        case 'reset': confirming = true; return render('#reset-cancel');
        case 'reset-cancel': confirming = false; return render('[data-act="reset"]');
        case 'reset-go': return resetAll();
      }
    });
  }

  window.Settings = { open };
  document.addEventListener('DOMContentLoaded', init);
})();