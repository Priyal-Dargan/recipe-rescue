/* =========================================================
   app.js - core: state, storage, navigation, theme, onboarding
   Other files (pantry.js, recipes.js, ai.js) will use window.App
   ========================================================= */
(() => {
  'use strict';

  /* ---------- helpers ---------- */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ---------- state + persistence ---------- */
  /* ---------- profiles: each person gets their own saved data ---------- */
  const PROFILES_KEY = 'recipeRescue_profiles';
  function readRegistry() {
    try {
      const r = JSON.parse(localStorage.getItem(PROFILES_KEY));
      if (r && Array.isArray(r.list) && r.list.length && r.list.some(p => p.id === r.active)) return r;
    } catch (e) { /* ignore */ }
    return { active: 'main', list: [{ id: 'main', name: '' }] };   // 'main' = your existing data
  }
  const registry = readRegistry();
  const keyFor = (id) => (id === 'main' ? 'recipeRescue_v1' : 'recipeRescue_v1_' + id);
  const STORAGE_KEY = keyFor(registry.active);
  function saveRegistry() { try { localStorage.setItem(PROFILES_KEY, JSON.stringify(registry)); } catch (e) { /* ignore */ } }

  const defaultState = () => ({
    profile: { name: '', diet: 'none', allergies: [], cuisines: [], household: 2, onboarded: false },
    pantry: [],      // Stage 2
    cart: [],        // Stage 2
    favorites: [],   // Stage 5
    history: [],     // Stage 5
    shopping: [],    // Stage 5
    theme: null
  });

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...defaultState(), ...JSON.parse(raw) } : defaultState();
    } catch (e) { return defaultState(); }
  }

  const state = load();

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { console.warn('Could not save', e); }
    const me = registry.list.find(p => p.id === registry.active);     // keep the profile's label in sync with the name
    const nm = (state.profile.name || '').trim();
    if (me && nm && me.name !== nm) { me.name = nm; saveRegistry(); }
  }

  /* ---------- icons (inline SVG, feather-style) ---------- */
  const ICON_PATHS = {
    pantry:    '<path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/>',
    add:       '<circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>',
    recipes:   '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    dashboard: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
    shopping:  '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>',
    favorites: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
    moon:      '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    sun:       '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>',
    user:      '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    settings:  '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'
  };
  const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICON_PATHS[name]}</svg>`;

  /* ---------- toast ---------- */
  function toast(message) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    $('#toast-region').appendChild(el);
    setTimeout(() => el.remove(), 3100);
  }

  /* ---------- theme ---------- */
  function applyTheme() {
    const theme = state.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    const meta = document.getElementById('theme-meta'); if (meta) meta.content = theme === 'dark' ? '#1B1511' : '#FFF8EF';
    $$('.js-theme').forEach(btn => {
      const dark = theme === 'dark';
      const isSidebar = btn.classList.contains('btn');
      btn.innerHTML = icon(dark ? 'sun' : 'moon') + (isSidebar ? `<span>${dark ? 'Light mode' : 'Dark mode'}</span>` : '');
      btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      btn.title = dark ? 'Light mode' : 'Dark mode';
    });
  }
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    state.theme = current === 'dark' ? 'light' : 'dark';
    save(); applyTheme();
  }

  /* ---------- navigation ---------- */
  const NAV = [
    { id: 'pantry',    label: 'Pantry' },
    { id: 'add',       label: 'Add' },
    { id: 'recipes',   label: 'Recipes' },
    { id: 'dashboard', label: 'Impact' },
    { id: 'shopping',  label: 'Shopping' },
    { id: 'favorites', label: 'Saved' }
  ];

  function buildNav() {
    $('#side-nav').innerHTML = NAV.map(n =>
      `<a class="nav-link" href="#${n.id}" data-nav="${n.id}" title="${n.label}">${icon(n.id)}<span>${n.label}</span></a>`).join('');
    $('#tabbar').innerHTML = NAV.map(n =>
      `<a class="tab" href="#${n.id}" data-nav="${n.id}">${icon(n.id)}<span>${n.label}</span></a>`).join('');
    $$('.js-prefs').forEach(btn => {
      const isSidebar = btn.classList.contains('btn');
      btn.innerHTML = icon('settings') + (isSidebar ? '<span>Settings</span>' : '');
      btn.title = 'Settings';
    });
  }

  function route() {
    let id = location.hash.slice(1);
    if (!NAV.some(n => n.id === id)) id = 'pantry';
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === `screen-${id}`));
    $$('[data-nav]').forEach(a => {
      if (a.dataset.nav === id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    window.scrollTo({ top: 0 });
    document.dispatchEvent(new CustomEvent('screenchange', { detail: id }));
  }

  function navigate(id) {
    if (location.hash === `#${id}`) route(); else location.hash = id;
  }

  function updateGreeting() {
    const h = new Date().getHours();
    const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    const name = state.profile.name.trim();
    $('#greeting').textContent = name ? `${part}, ${name}` : part;
  }

  /* ---------- onboarding ---------- */
  const ob = { step: 0, draft: null, total: 3 };
  const chip = (group, item, selected) =>
    `<button type="button" class="chip" data-group="${group}" data-value="${item.id}" aria-pressed="${selected}">
       <span aria-hidden="true">${item.emoji}</span>${item.label}</button>`;

  function stepHTML(i) {
    const d = ob.draft;
    if (i === 0) return `
      <span class="eyebrow">Step 1 of 3 · Welcome</span>
      <h1 id="ob-title" tabindex="-1">Let's rescue your leftovers 🍅</h1>
      <p class="lead">Turn the odds and ends in your kitchen into real meals and keep good food out of the bin.</p>
      <div class="field">
        <label for="ob-name">What should we call you?</label>
        <input id="ob-name" type="text" maxlength="24" placeholder="e.g. Aarav" value="${d.name.replace(/"/g, '&quot;')}" autocomplete="given-name">
      </div>`;
    if (i === 1) return `
      <span class="eyebrow">Step 2 of 3 · Food preferences</span>
      <h1 id="ob-title" tabindex="-1">How do you eat?</h1>
      <div class="field" style="margin-top:14px">
        <span class="field-label" id="diet-label">Diet</span>
        <div class="chip-group" role="group" aria-labelledby="diet-label">
          ${DIETS.map(x => chip('diet', x, d.diet === x.id)).join('')}
        </div>
      </div>
      <div class="field" style="margin-top:18px">
        <span class="field-label" id="allergy-label">Any allergies? <span class="field-hint">(we'll keep these out of recipes)</span></span>
        <div class="chip-group" role="group" aria-labelledby="allergy-label">
          ${ALLERGIES.map(x => chip('allergies', x, d.allergies.includes(x.id))).join('')}
        </div>
      </div>`;
    return `
      <span class="eyebrow">Step 3 of 3 · Your kitchen</span>
      <h1 id="ob-title" tabindex="-1">Almost there!</h1>
      <div class="field" style="margin-top:14px">
        <span class="field-label" id="cuisine-label">Cuisines you love <span class="field-hint">(pick any)</span></span>
        <div class="chip-group" role="group" aria-labelledby="cuisine-label">
          ${CUISINES.map(x => chip('cuisines', x, d.cuisines.includes(x.id))).join('')}
        </div>
      </div>
      <div class="field" style="margin-top:20px">
        <span class="field-label" id="hh-label">How many people do you cook for?</span>
        <div class="stepper" role="group" aria-labelledby="hh-label">
          <button type="button" class="stepper-btn" data-step="-1" aria-label="Decrease household size">−</button>
          <output id="ob-household" aria-live="polite">${d.household}<small>${d.household === 1 ? 'person' : 'people'}</small></output>
          <button type="button" class="stepper-btn" data-step="1" aria-label="Increase household size">+</button>
        </div>
      </div>`;
  }

  function renderOb(dir = 'forward') {
    $('#ob-body').innerHTML = `<div class="ob-step ${dir}">${stepHTML(ob.step)}</div>`;
    $('#ob-fill').style.width = `${((ob.step + 1) / ob.total) * 100}%`;
    $('.progress').setAttribute('aria-valuenow', ob.step + 1);
    $('#ob-back').style.visibility = ob.step === 0 ? 'hidden' : 'visible';
    $('#ob-next').textContent = ob.step === ob.total - 1 ? 'Start cooking 🍳' : 'Continue';
    const title = $('#ob-title'); if (title) title.focus({ preventScroll: true });
  }

  function openOnboarding() {
    ob.step = 0;
    $('#ob-skip').textContent = state.profile.onboarded ? 'Cancel' : 'Skip for now';
    ob.draft = JSON.parse(JSON.stringify(state.profile));
    $('#app').hidden = true;
    const el = $('#onboarding');
    el.classList.remove('leaving');
    el.hidden = false;
    renderOb('forward');
  }

  function finishOnboarding(skipped = false) {
    const wasSetUp = state.profile.onboarded;
    if (!skipped) Object.assign(state.profile, ob.draft);
    state.profile.onboarded = true;
    save();
    const el = $('#onboarding');
    el.classList.add('leaving');
    const msg = skipped ? (wasSetUp ? 'No changes made' : 'You can set preferences any time')
                        : (wasSetUp ? 'Preferences updated ✓' : `Welcome, ${state.profile.name || 'chef'}! 🎉`);
    setTimeout(() => { el.hidden = true; showApp(); toast(msg); }, 420);
  }

  function bindOnboarding() {
    const root = $('#onboarding');

    root.addEventListener('click', (e) => {
      const c = e.target.closest('.chip');
      if (c) {
        const g = c.dataset.group, v = c.dataset.value;
        if (g === 'diet') {
          ob.draft.diet = v;
          $$('.chip[data-group="diet"]', root).forEach(x => x.setAttribute('aria-pressed', x === c));
        } else {
          const arr = ob.draft[g], idx = arr.indexOf(v);
          idx > -1 ? arr.splice(idx, 1) : arr.push(v);
          c.setAttribute('aria-pressed', idx === -1);
        }
        return;
      }
      const s = e.target.closest('.stepper-btn');
      if (s) {
        ob.draft.household = Math.min(10, Math.max(1, ob.draft.household + Number(s.dataset.step)));
        const n = ob.draft.household;
        $('#ob-household').innerHTML = `${n}<small>${n === 1 ? 'person' : 'people'}</small>`;
      }
    });

    root.addEventListener('input', (e) => {
      if (e.target.id === 'ob-name') ob.draft.name = e.target.value;
    });

    root.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.id === 'ob-name') $('#ob-next').click();
    });

    $('#ob-next').addEventListener('click', () => {
      if (ob.step < ob.total - 1) { ob.step++; renderOb('forward'); }
      else finishOnboarding(false);
    });
    $('#ob-back').addEventListener('click', () => { if (ob.step > 0) { ob.step--; renderOb('back'); } });
    $('#ob-skip').addEventListener('click', () => finishOnboarding(true));
  }

  /* ---------- collapsible sidebar ---------- */
  function applySidebar() {
    const collapsed = !!state.sidebarCollapsed;
    $('#app').classList.toggle('collapsed', collapsed);
    const t = $('#side-toggle');
    const label = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
    t.setAttribute('aria-expanded', String(!collapsed));
    t.setAttribute('aria-label', label);
    t.title = label;
  }
  function toggleSidebar() {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    save(); applySidebar();
  }
  
  /* ---------- boot ---------- */
  function showApp() {
    $('#app').hidden = false;
    updateGreeting();
    route();
  }

  function init() {
    buildNav();
    applyTheme();
    bindOnboarding();
    $('#side-toggle').addEventListener('click', toggleSidebar);
    applySidebar();
    $$('.js-theme').forEach(b => b.addEventListener('click', toggleTheme));
    $$('.js-prefs').forEach(b => b.addEventListener('click', () => (window.Settings ? window.Settings.open() : openOnboarding())));
    window.addEventListener('hashchange', route);
    state.profile.onboarded ? showApp() : openOnboarding();
  }

  /* ---------- profile management ---------- */
  const MAX_PROFILES = 5;
  const profiles = () => ({
    active: registry.active, max: MAX_PROFILES,
    list: registry.list.map(p => ({ id: p.id, name: p.name, key: keyFor(p.id), active: p.id === registry.active }))
  });
  function reloadApp() { history.replaceState(null, '', location.pathname + location.search); location.reload(); }
  function switchProfile(id) {
    if (id === registry.active || !registry.list.some(p => p.id === id)) return;
    registry.active = id; saveRegistry(); reloadApp();
  }
  function addProfile(data) {                    // data (optional) = starting state, used by Import
    if (registry.list.length >= MAX_PROFILES) return false;
    const id = 'u' + Date.now().toString(36);
    if (data) { try { localStorage.setItem(keyFor(id), JSON.stringify(data)); } catch (e) { return false; } }
    registry.list.push({ id, name: data && data.profile ? data.profile.name : '' });
    registry.active = id; saveRegistry(); reloadApp();
    return true;
  }
  function deleteProfile(id) {
    if (registry.list.length < 2 || !registry.list.some(p => p.id === id)) return false;
    try { localStorage.removeItem(keyFor(id)); } catch (e) { /* ignore */ }
    const wasActive = id === registry.active;
    registry.list = registry.list.filter(p => p.id !== id);
    if (wasActive) registry.active = registry.list[0].id;
    saveRegistry();
    if (wasActive) reloadApp();
    return true;
  }

  /* shared API for the other files */
  window.App = { state, save, toast, navigate, icon, $, $$, openOnboarding, applyTheme, storageKey: STORAGE_KEY, profiles, switchProfile, addProfile, deleteProfile };

  document.addEventListener('DOMContentLoaded', init);
})();