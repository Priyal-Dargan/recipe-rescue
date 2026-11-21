/* =========================================================
   add.js - Stage 3: Add Ingredients screen
   Photo / Type / Voice  ->  review list  ->  Pantry.addMany()
   ========================================================= */
(() => {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const UNITS = ['pcs', 'g', 'kg', 'ml', 'L', 'packs'];
  const UNIT_BY_CAT = { veggies: 'pcs', fruits: 'pcs', dairy: 'packs', grains: 'packs', proteins: 'pcs', spices: 'packs', other: 'packs' };
  const UNIT_WORDS = {
    kg: 'kg', kgs: 'kg', kilo: 'kg', kilos: 'kg', kilogram: 'kg', kilograms: 'kg',
    g: 'g', gm: 'g', gms: 'g', gram: 'g', grams: 'g',
    ml: 'ml', millilitre: 'ml', millilitres: 'ml', milliliter: 'ml', milliliters: 'ml',
    l: 'L', litre: 'L', litres: 'L', liter: 'L', liters: 'L',
    pc: 'pcs', pcs: 'pcs', piece: 'pcs', pieces: 'pcs',
    pack: 'packs', packs: 'packs', packet: 'packs', packets: 'packs'
  };
  const NUM_WORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, half: 0.5 };
  /* keys are SINGULAR, lowercase */
  const ALIASES = {
    chili: 'Green Chilli', chilli: 'Green Chilli', chilly: 'Green Chilli', chily: 'Green Chilli',
    'green chili': 'Green Chilli', 'green chilly': 'Green Chilli', 'green chily': 'Green Chilli',
    dal: 'Lentils (Dal)', daal: 'Lentils (Dal)', lentil: 'Lentils (Dal)',
    atta: 'Wheat Flour', flour: 'Wheat Flour',
    yogurt: 'Curd', yoghurt: 'Curd', dahi: 'Curd',
    'bell pepper': 'Capsicum', brinjal: 'Eggplant', aubergine: 'Eggplant',
    'cottage cheese': 'Paneer', chana: 'Chickpeas', chickpea: 'Chickpeas',
    jeera: 'Cumin', haldi: 'Turmeric', 'soya sauce': 'Soy Sauce'
  };
  const QUICK = ['Tomato', 'Onion', 'Potato', 'Garlic', 'Egg', 'Milk', 'Paneer', 'Rice', 'Bread', 'Chicken', 'Carrot', 'Spinach', 'Cheese', 'Butter'];
  const SOURCE = { photo: '📷 Photo', type: '⌨️ Typed', voice: '🎤 Voice' };
  const VOICE_ERRORS = {
    'not-allowed': 'Microphone access is blocked. Allow it in the browser’s address bar, or use the Type tab.',
    'service-not-allowed': 'Microphone access is blocked. Allow it in the browser’s address bar, or use the Type tab.',
    'no-speech': 'We didn’t hear anything. Tap the mic and try again.',
    'audio-capture': 'No microphone was found on this device.',
    'network': 'Voice recognition needs an internet connection.'
  };
  const X_ICON = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  const MIC = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v4M8 23h8"/></svg>';

  let App, root, methodEl, reviewEl, fabEl, keyDlg;
  let tab = 'photo';
  let photo = emptyPhoto();
  const voice = { rec: null, listening: false, final: '', interim: '', error: null, note: null,
                  supported: !!(window.SpeechRecognition || window.webkitSpeechRecognition) };
  const staged = [];
  let reviewVisible = false;

  function emptyPhoto() { return { file: null, url: null, busy: false, error: null, note: null }; }
  const sid = () => 's' + Math.random().toString(36).slice(2, 9);
  const round2 = (n) => Math.round(n * 100) / 100;
  const clampQty = (q) => { const n = parseFloat(q); return n > 0 ? Math.min(9999, round2(n)) : 1; };
  const titleCase = (s) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  const catEmoji = (id) => (CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1]).emoji;

  function singular(w) {
    if (w.endsWith('oes')) return w.slice(0, -2);
    if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
    if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
    return w;
  }

  /* match free text to the catalog (emoji, category, shelf life) */
  function resolve(raw) {
    const clean = raw.trim().replace(/\s+/g, ' ');
    const key = singular(clean.toLowerCase());
    const target = ALIASES[key];
    const base = target
      ? INGREDIENTS.find((i) => i.name === target)
      : INGREDIENTS.find((i) => singular(i.name.toLowerCase()) === key);
    if (base) return { name: base.name, emoji: base.emoji, cat: base.cat, shelf: base.shelf, known: true };
    return { name: titleCase(clean), emoji: '🥫', cat: 'other', shelf: 7, known: false };
  }

  /* "2 tomatoes, 200g paneer and onion"  ->  [{name, qty, unit}] */
  function parseList(text) {
    const chunks = text.toLowerCase()
      .replace(/\b(i have|i've got|i got|we have|there is|there are|there's|i also have|also|some|a few|few|my|the|please|add)\b/g, ' ')
      .split(/,|;|\n|\band\b|\bplus\b|\bwith\b|&/)
      .map((s) => s.trim()).filter(Boolean);
    const out = [];
    chunks.forEach((chunk) => {
      let qty = 1, unit = null, name = chunk;
      const m = chunk.match(/^(?:(\d+(?:\.\d+)?)\s*|(a|an|one|two|three|four|five|six|seven|eight|nine|ten|twelve|half)\s+)(.*)$/);
      if (m) {
        qty = m[1] ? parseFloat(m[1]) : NUM_WORDS[m[2]];
        const rest = m[3].replace(/^(a|an)\s+/, '');
        const um = rest.match(/^([a-z]+)\s*(?:of\s+)?(.*)$/);
        if (um && UNIT_WORDS[um[1]] && um[2]) { unit = UNIT_WORDS[um[1]]; name = um[2]; }
        else name = rest;
      }
      name = name.replace(/^of\s+/, '').trim().slice(0, 30);
      if (!name || UNIT_WORDS[name] || /^\d+$/.test(name)) return;
      out.push({ name, qty, unit });
    });
    return out;
  }

  /* put items in the review list (merging duplicates). returns the names added */
  function stage(list, src) {
    const names = [];
    list.forEach((it) => {
      const r = resolve(it.name);
      const cat = r.known ? r.cat : (CATEGORIES.some((c) => c.id === it.cat) ? it.cat : r.cat);
      const shelf = r.known ? r.shelf : (Number(it.shelf) > 0 ? Math.min(Number(it.shelf), 730) : r.shelf);
      const unit = UNITS.includes(it.unit) ? it.unit : (UNIT_BY_CAT[cat] || 'pcs');
      const qty = clampQty(it.qty);
      const emoji = r.known ? r.emoji : catEmoji(cat);
      const ex = staged.find((s) => s.name.toLowerCase() === r.name.toLowerCase() && s.unit === unit);
      if (ex) ex.qty = round2(ex.qty + qty);
      else staged.push({ sid: sid(), name: r.name, emoji, cat, shelf, qty, unit, src });
      names.push(r.name);
    });
    renderReview();
    return names;
  }

  const notice = (type, html, extra = '') =>
    `<div class="notice ${type}" role="${type === 'error' ? 'alert' : 'status'}"><span aria-hidden="true">${type === 'error' ? '⚠️' : type === 'ok' ? '✅' : 'ℹ️'}</span><div>${html}${extra}</div></div>`;

  /* ---------- layout ---------- */
  function build() {
    root.innerHTML = `
      <div class="add-bar">
        <div class="seg" role="tablist" aria-label="Input method">
          <button type="button" role="tab" id="tab-photo" data-tab="photo" aria-controls="method"><span aria-hidden="true">📷</span> Photo</button>
          <button type="button" role="tab" id="tab-type"  data-tab="type"  aria-controls="method"><span aria-hidden="true">⌨️</span> Type</button>
          <button type="button" role="tab" id="tab-voice" data-tab="voice" aria-controls="method"><span aria-hidden="true">🎤</span> Voice</button>
        </div>
        <button type="button" id="mode-btn" data-act="settings"></button>
      </div>
      <div class="add-layout">
        <div class="method" id="method" role="tabpanel"></div>
        <aside class="review-panel" id="review" aria-labelledby="rev-title"></aside>
      </div>
      <button type="button" class="btn btn-primary review-fab" id="rev-fab">Review &amp; add</button>`;
    methodEl = $('#method'); reviewEl = $('#review'); fabEl = $('#rev-fab');
    renderMode(); setTab(tab); renderReview();

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => { reviewVisible = en.isIntersecting; updateFab(); }).observe(reviewEl);
    }
  }

  function renderMode() {
    const b = $('#mode-btn'); const ai = AI.hasKey();
    b.className = 'mode ' + (ai ? 'ai' : 'demo');
    b.innerHTML = `<span aria-hidden="true">●</span> ${ai ? 'AI mode on' : 'Demo mode · set up AI'}`;
    b.setAttribute('aria-label', ai ? 'AI mode is on. Open AI settings' : 'Demo mode. Open AI settings to connect AI');
  }

  function setTab(t) {
    if (voice.rec) voice.rec.stop();
    tab = t;
    $$('.seg button').forEach((b) => { const on = b.dataset.tab === t; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    renderMethod();
  }

  function renderMethod() {
    methodEl.setAttribute('aria-labelledby', 'tab-' + tab);
    methodEl.innerHTML = tab === 'photo' ? photoHTML() : tab === 'type' ? typeHTML() : voiceHTML();
  }

  /* ---------- PHOTO ---------- */
  function photoHTML() {
    const note = AI.hasKey() ? '' : notice('info',
      '<b>Demo mode:</b> scans return sample ingredients. Add an API key in <button type="button" class="link-btn" data-act="settings">AI settings</button> to analyse real photos.');
    const err = photo.error ? notice('error', esc(photo.error),
      `<div class="actions">${photo.file ? '<button type="button" class="btn btn-ghost btn-sm" data-act="scan">Try again</button>' : ''}
       <button type="button" class="btn btn-ghost btn-sm" data-act="goto-type">Type instead</button></div>`) : '';
    if (!photo.url) return `
      <label class="dropzone" id="dz" for="photo-file">
        <span class="dz-emoji" aria-hidden="true">📸</span>
        <strong>Drop a photo of your fridge or pantry</strong>
        <span class="muted">or tap here to take / choose a picture</span>
        <input class="sr-only" type="file" id="photo-file" accept="image/*">
      </label>${err}${note}`;
    return `
      <div class="preview${photo.busy ? ' scanning' : ''}"><img src="${photo.url}" alt="Photo you uploaded"></div>
      <div class="actions">
        <button type="button" class="btn btn-primary" data-act="scan" ${photo.busy ? 'disabled' : ''}>${photo.busy ? 'Scanning…' : '✨ Scan ingredients'}</button>
        <button type="button" class="btn btn-ghost" data-act="photo-reset" ${photo.busy ? 'disabled' : ''}>Choose another</button>
      </div>
      ${photo.busy ? '<p class="muted scan-text" role="status">Looking for ingredients…</p>' : ''}
      ${photo.note ? notice('ok', esc(photo.note)) : ''}${err}${note}`;
  }

  function setPhoto(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { photo.error = 'That file isn’t an image. Please choose a JPG or PNG photo.'; return renderMethod(); }
    if (file.size > 15 * 1024 * 1024) { photo.error = 'That photo is too large (15 MB max). Try a smaller one.'; return renderMethod(); }
    if (photo.url) URL.revokeObjectURL(photo.url);
    photo = { file, url: URL.createObjectURL(file), busy: false, error: null, note: null };
    renderMethod();
  }

  function resetPhoto() {
    if (photo.url) URL.revokeObjectURL(photo.url);
    photo = emptyPhoto(); renderMethod();
  }

  async function scan() {
    if (!photo.file || photo.busy) return;
    photo.busy = true; photo.error = null; photo.note = null; renderMethod();
    try {
      const res = await AI.scanPhoto(photo.file);
      photo.busy = false;
      if (!res.items.length) {
        photo.error = 'We couldn’t spot any ingredients in this photo. Try a closer, brighter shot, or type them in.';
      } else {
        const names = stage(res.items, 'photo');
        photo.note = `Found ${names.length} ingredient${names.length > 1 ? 's' : ''}${res.demo ? ' (demo results)' : ''}. Check the list and fix anything we got wrong.`;
        App.toast(`✨ ${names.length} ingredients detected`);
      }
    } catch (e) {
      photo.busy = false;
      photo.error = e.message || 'Something went wrong while scanning. Please try again.';
    }
    renderMethod();
  }

  /* ---------- TYPE ---------- */
  function typeHTML() {
    const chips = QUICK.map((n) => { const b = INGREDIENTS.find((i) => i.name === n);
      return `<button type="button" class="chip" data-quick="${esc(n)}"><span aria-hidden="true">${b.emoji}</span>${esc(n)}</button>`; }).join('');
    return `
      <label class="lbl" for="type-input" style="margin-top:0">What do you have?</label>
      <div class="type-row">
        <input class="input" id="type-input" type="text" list="ing-list" autocomplete="off" maxlength="200" placeholder="e.g. 2 tomatoes, 200g paneer, onion">
        <button type="button" class="btn btn-primary" data-act="type-add">Add</button>
      </div>
      <datalist id="ing-list">${INGREDIENTS.map((i) => `<option value="${esc(i.name)}"></option>`).join('')}</datalist>
      <p class="field-hint" style="margin-top:8px">Tip: separate items with commas or “and”. Press Enter to add.</p>
      <p class="form-error" id="type-err" role="alert"></p>
      <p class="dlg-status" id="type-status" role="status"></p>
      <p class="lbl">Quick picks</p>
      <div class="chip-group" style="margin-top:0">${chips}</div>`;
  }

  function typeAdd() {
    const input = $('#type-input'); if (!input) return;
    $('#type-err').textContent = ''; $('#type-status').textContent = '';
    const items = parseList(input.value);
    if (!items.length) { $('#type-err').textContent = 'Type an ingredient name first, e.g. “2 tomatoes”.'; input.focus(); return; }
    const names = stage(items, 'type');
    input.value = ''; input.focus();
    $('#type-status').textContent = `Added: ${names.join(', ')} ✓`;
  }

  function quickAdd(name) {
    const names = stage([{ name }], 'type');
    const st = $('#type-status'); if (st) st.textContent = `Added: ${names.join(', ')} ✓`;
  }

  /* ---------- VOICE ---------- */
  const transcriptHTML = () => {
    const f = esc(voice.final.replace(/,\s*$/, '')), i = esc(voice.interim);
    return (f || i) ? `${f} <span class="interim">${i}</span>` : '<span class="interim">Your words will appear here…</span>';
  };

  function voiceHTML() {
    if (!voice.supported) return notice('info', 'Voice input isn’t supported in this browser. Chrome, Edge and Safari support it, or use the <b>Type</b> tab.');
    const live = voice.listening;
    return `
      <div class="mic-wrap">
        <button type="button" class="mic${live ? ' live' : ''}" data-act="mic" aria-pressed="${live}" aria-label="${live ? 'Stop listening' : 'Start listening'}">${MIC}</button>
        <p class="mic-label" role="status">${live ? 'Listening… tap to stop' : 'Tap the mic and say what you have'}</p>
      </div>
      <div class="transcript" id="transcript">${transcriptHTML()}</div>
      <p class="field-hint" style="margin-top:10px">Try: “two tomatoes, 200 grams of paneer and some spinach”</p>
      ${voice.note ? notice('ok', voice.note) : ''}${voice.error ? notice('error', esc(voice.error)) : ''}`;
  }

  function toggleVoice() {
    if (voice.listening && voice.rec) return voice.rec.stop();
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'en-IN'; rec.continuous = true; rec.interimResults = true;
    voice.final = ''; voice.interim = ''; voice.error = null; voice.note = null;

    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) voice.final += r[0].transcript + ', '; else interim += r[0].transcript;
      }
      voice.interim = interim;
      const t = $('#transcript'); if (t) t.innerHTML = transcriptHTML();
    };
    rec.onerror = (e) => { if (e.error !== 'aborted') voice.error = VOICE_ERRORS[e.error] || 'Voice input stopped unexpectedly. Please try again.'; };
    rec.onend = () => {
      voice.listening = false; voice.rec = null;
      const text = (voice.final + ' ' + voice.interim).trim().replace(/^,+|,+$/g, '').trim();
      voice.final = ''; voice.interim = '';
      if (text) {
        const items = parseList(text);
        if (items.length) {
          const names = stage(items, 'voice');
          voice.error = null;
          voice.note = `Heard “${esc(text)}”. Added ${names.length} item${names.length > 1 ? 's' : ''} to your list.`;
        } else voice.error = 'We heard you, but couldn’t pick out any ingredients. Try again, or use the Type tab.';
      }
      renderMethod();
    };
    try { rec.start(); voice.rec = rec; voice.listening = true; renderMethod(); }
    catch (err) { voice.error = 'Couldn’t start the microphone. Please try again.'; renderMethod(); }
  }

  /* ---------- REVIEW LIST ---------- */
  function rowHTML(s) {
    return `<li class="rev-row" data-sid="${s.sid}">
      <span class="rev-emoji" aria-hidden="true">${esc(s.emoji)}</span>
      <div class="rev-fields">
        <input class="input rev-name" type="text" maxlength="30" value="${esc(s.name)}" aria-label="Ingredient name">
        <div class="rev-qty">
          <input class="input rev-n" type="number" min="0.1" step="any" value="${s.qty}" aria-label="Quantity of ${esc(s.name)}">
          <select class="input rev-u" aria-label="Unit for ${esc(s.name)}">${UNITS.map((u) => `<option ${u === s.unit ? 'selected' : ''}>${u}</option>`).join('')}</select>
        </div>
        <span class="rev-src">${SOURCE[s.src] || ''}</span>
      </div>
      <button type="button" class="icon-btn" data-act="rev-remove" data-sid="${s.sid}" aria-label="Remove ${esc(s.name)}">${X_ICON}</button>
    </li>`;
  }

  function renderReview() {
    const n = staged.length;
    reviewEl.classList.toggle('has', n > 0);
    reviewEl.innerHTML = `
      <div class="cart-head">
        <h2 id="rev-title" tabindex="-1">Ready to add</h2>
        <span class="cart-count" aria-live="polite">${n}</span><span class="spacer"></span>
        <button type="button" class="btn btn-ghost btn-sm" data-act="rev-clear" ${n ? '' : 'disabled'}>Clear</button>
      </div>
      <p class="cart-hint">Check names and amounts. Fix anything we got wrong.</p>
      <ul class="review-list" data-empty="Nothing here yet. Scan, type or speak.">${staged.map(rowHTML).join('')}</ul>
      <button type="button" class="btn btn-primary btn-wide" data-act="rev-commit" ${n ? '' : 'disabled'}>Add ${n || ''} to pantry</button>`;
    updateFab();
  }

  function updateFab() {
    if (!fabEl) return;
    const n = staged.length;
    fabEl.textContent = `Review & add (${n})`;
    fabEl.classList.toggle('show', n > 0 && !reviewVisible);
  }

  function commit() {
    const valid = staged.filter((s) => s.name.trim() && s.qty > 0);
    if (!valid.length || !window.Pantry) return;
    window.Pantry.addMany(valid.map((s) => ({ name: s.name.trim(), qty: s.qty, unit: s.unit, cat: s.cat, emoji: s.emoji, shelf: s.shelf })));
    staged.length = 0; renderReview();
    App.toast(`🧺 ${valid.length} ingredient${valid.length > 1 ? 's' : ''} added to your pantry`);
    App.navigate('pantry');
  }

  /* ---------- AI settings dialog ---------- */
  function openSettings() {
    const has = AI.hasKey();
    keyDlg.innerHTML = `
      <form class="dlg-form" id="key-form" novalidate>
        <div class="dlg-head"><h2 id="key-title">Connect AI</h2>
          <button type="button" class="btn-icon" data-close aria-label="Close">${X_ICON}</button></div>
        <div class="dlg-body">
          <p>Without a key the app runs in <b>Demo mode</b>: photo scans return sample ingredients, so you can still present it. With a key, real photos are analysed by AI.</p>
          <h3 class="cat-title">How to get your key (free)</h3>
          <ol class="key-steps">
            <li>Go to <a class="link" href="https://aistudio.google.com" target="_blank" rel="noopener">aistudio.google.com</a> and sign in with your Google account.</li>
            <li>Click <b>Get API key</b>, then <b>Create API key</b>. No payment details needed.</li>
            <li>Copy the whole key, paste it below and press <b>Save &amp; test</b>.</li>
          </ol>
          <label class="lbl" for="key-input">API key</label>
          <input class="input" id="key-input" type="password" autocomplete="off" spellcheck="false" placeholder="${has ? '•••••••• (a key is saved)' : 'Paste your key here'}">
          <p class="field-hint" style="margin-top:8px">Saved only in this browser, not inside your code files. Each teammate adds their own key on their own computer.</p>
          <p class="form-error" id="key-err" role="alert"></p>
        </div>
        <div class="dlg-foot">
          ${has ? '<button type="button" class="btn btn-danger" data-remove>Remove key</button>' : ''}
          <span class="spacer"></span>
          <button type="button" class="btn btn-ghost" data-close>Cancel</button>
          <button type="submit" class="btn btn-primary" id="key-save">Save &amp; test</button>
        </div>
      </form>`;
    keyDlg.showModal();
    $('#key-input').focus();
  }

  async function saveKey() {
    const v = $('#key-input').value.trim(), err = $('#key-err'), btn = $('#key-save');
    if (v.length < 20 || /\s/.test(v)) { err.textContent = 'That doesn’t look like a complete API key. Copy the whole key from AI Studio, with no spaces.'; return; }
    btn.disabled = true; btn.textContent = 'Testing…'; err.textContent = '';
    const prev = AI.getKey();
    AI.setKey(v);
    try {
      await AI.call([{ type: 'text', text: 'Reply with the single word OK.' }], 10);
      keyDlg.close(); renderMode(); renderMethod();
      App.toast('AI connected ✨');
    } catch (e) {
      if (e.code === 'key') {                       // Google rejected the key itself
        if (prev) AI.setKey(prev); else AI.clearKey();
        err.textContent = e.message;
        btn.disabled = false; btn.textContent = 'Save & test';
        return;
      }
      keyDlg.close(); renderMode(); renderMethod();  // key is fine, the test just failed (timeout, busy, etc.)
      App.toast('Key saved, but the test failed: ' + e.message);
    }
  }

  function bindSettings() {
    keyDlg = document.createElement('dialog');
    keyDlg.className = 'dlg';
    keyDlg.setAttribute('aria-labelledby', 'key-title');
    document.body.appendChild(keyDlg);
    keyDlg.addEventListener('click', (e) => {
      if (e.target === keyDlg || e.target.closest('[data-close]')) return keyDlg.close();
      if (e.target.closest('[data-remove]')) {
        AI.clearKey(); keyDlg.close(); renderMode(); renderMethod(); App.toast('API key removed. Back to demo mode');
      }
    });
    keyDlg.addEventListener('submit', (e) => { e.preventDefault(); saveKey(); });
  }

  /* ---------- events ---------- */
  function act(name, el) {
    switch (name) {
      case 'settings': return openSettings();
      case 'scan': return scan();
      case 'photo-reset': return resetPhoto();
      case 'goto-type': setTab('type'); { const i = $('#type-input'); if (i) i.focus(); } return;
      case 'type-add': return typeAdd();
      case 'mic': return toggleVoice();
      case 'rev-clear': staged.length = 0; return renderReview();
      case 'rev-remove': {
        const i = staged.findIndex((s) => s.sid === el.dataset.sid);
        if (i > -1) staged.splice(i, 1);
        renderReview(); return $('#rev-title').focus();
      }
      case 'rev-commit': return commit();
    }
  }

  function bind() {
    root.addEventListener('click', (e) => {
      const q = e.target.closest('[data-quick]'); if (q) return quickAdd(q.dataset.quick);
      const t = e.target.closest('[data-tab]'); if (t) return setTab(t.dataset.tab);
      const b = e.target.closest('[data-act]'); if (b) act(b.dataset.act, b);
    });

    /* arrow keys move between tabs */
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.id === 'type-input') { e.preventDefault(); return typeAdd(); }
      const tabBtn = e.target.closest('[role="tab"]');
      if (tabBtn && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        const order = ['photo', 'type', 'voice'];
        const next = order[(order.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : 2)) % 3];
        setTab(next); $('#tab-' + next).focus();
      }
    });

    /* photo picking + drag and drop */
    root.addEventListener('change', (e) => { if (e.target.id === 'photo-file') setPhoto(e.target.files[0]); });
    root.addEventListener('dragover', (e) => { const dz = e.target.closest('#dz'); if (dz) { e.preventDefault(); dz.classList.add('over'); } });
    root.addEventListener('dragleave', (e) => { const dz = e.target.closest('#dz'); if (dz) dz.classList.remove('over'); });
    root.addEventListener('drop', (e) => {
      const dz = e.target.closest('#dz');
      if (dz) { e.preventDefault(); dz.classList.remove('over'); setPhoto(e.dataTransfer.files[0]); }
    });

    /* edit rows in the review list (update data without redrawing, so typing isn't interrupted) */
    const rowOf = (el) => { const r = el.closest('.rev-row'); return r && staged.find((s) => s.sid === r.dataset.sid); };
    reviewEl.addEventListener('input', (e) => {
      const s = rowOf(e.target); if (!s) return;
      if (e.target.classList.contains('rev-name')) s.name = e.target.value;
      if (e.target.classList.contains('rev-n')) { const v = parseFloat(e.target.value); if (v > 0) s.qty = v; }
    });
    reviewEl.addEventListener('change', (e) => {
      const s = rowOf(e.target); if (!s) return;
      const t = e.target;
      if (t.classList.contains('rev-name')) {
        const v = t.value.trim();
        if (!v) { t.value = s.name; return; }
        const r = resolve(v);
        s.name = r.name;
        if (r.known) { s.emoji = r.emoji; s.cat = r.cat; s.shelf = r.shelf; }
        t.value = s.name;
        t.closest('.rev-row').querySelector('.rev-emoji').textContent = s.emoji;
      } else if (t.classList.contains('rev-n')) {
        s.qty = clampQty(t.value); t.value = s.qty;
      } else if (t.classList.contains('rev-u')) s.unit = t.value;
    });
    fabEl.addEventListener('click', () => reviewEl.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function init() {
    App = window.App; root = $('#add-root');
    if (!root || !App || !window.AI) return;
    bindSettings();
    build();
    bind();
  }
  window.AddScreen = { openAISettings: () => { if (keyDlg) openSettings(); } };
  document.addEventListener('DOMContentLoaded', init);
})();