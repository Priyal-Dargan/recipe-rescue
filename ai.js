/* =========================================================
   ai.js - talks to the Gemini API (or runs Demo mode)
   - Key is stored in this browser's localStorage, NOT in the code
   - Models are auto-detected; if one is busy or retired, the next is tried
   Exposes window.AI
   ========================================================= */
(() => {
  'use strict';

  const KEY_STORAGE = 'recipeRescue_apiKey';
  const MODEL_STORAGE = 'recipeRescue_model';     // last model that worked
  const LIST_STORAGE = 'recipeRescue_models';     // usable models for this key
  const BASE = 'https://generativelanguage.googleapis.com/v1beta';
  const PREFERRED = ['gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite', 'gemini-2.5-flash'];
  const NOT_TEXT = /(tts|live|image|audio|embedding|robotics|computer|research|veo|lyria|imagen|omni|learnlm|gemma|translate|pro)/i;
  const MAX_TRIES = 5;

  class AIError extends Error { constructor(m, code) { super(m); this.code = code; } }

  const store = {
    get: (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } },
    set: (k, v) => { try { localStorage.setItem(k, String(v)); } catch (e) { /* ignore */ } },
    del: (k) => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const getKey = () => store.get(KEY_STORAGE);
  const setKey = (k) => { store.set(KEY_STORAGE, String(k).trim()); store.del(MODEL_STORAGE); store.del(LIST_STORAGE); };
  const clearKey = () => { store.del(KEY_STORAGE); store.del(MODEL_STORAGE); store.del(LIST_STORAGE); };
  const hasKey = () => getKey().length > 20;

  /* every text model this key can use, best first */
  async function listModels(key) {
    try {
      const cached = JSON.parse(store.get(LIST_STORAGE));
      if (Array.isArray(cached) && cached.length) return cached;
    } catch (e) { /* ignore */ }
    try {
      const res = await fetch(`${BASE}/models?pageSize=200`, { headers: { 'x-goog-api-key': key } });
      if (res.ok) {
        const data = await res.json();
        const rank = (n) => { const i = PREFERRED.indexOf(n); return i === -1 ? 99 : i; };
        const ok = [...new Set((data.models || [])
          .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
          .map((m) => m.name.replace('models/', ''))
          .filter((n) => /^gemini-/i.test(n) && !NOT_TEXT.test(n) && (PREFERRED.includes(n) || /flash/i.test(n))))]
          .sort((a, b) => rank(a) - rank(b));
        if (ok.length) { store.set(LIST_STORAGE, JSON.stringify(ok)); return ok; }
      }
    } catch (e) { /* fall through to the defaults */ }
    return PREFERRED;
  }

  async function send(key, model, parts, maxTokens, json) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60000);
    try {
      return await fetch(`${BASE}/models/${model}:generateContent`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { maxOutputTokens: Math.max(maxTokens, 4096), ...(json ? { responseMimeType: 'application/json' } : {}) }
        })
      });
    } catch (e) {
      if (e.name === 'AbortError') throw new AIError('The AI took too long to respond. Please try again.', 'timeout');
      throw new AIError('Couldn’t reach the AI service. Check your internet connection.', 'network');
    } finally { clearTimeout(timer); }
  }

  async function failure(res) {
    let detail = '';
    try { detail = (await res.json()).error.message || ''; } catch (e) { /* ignore */ }
    const rejected = res.status === 400 && /api key/i.test(detail);
    const msg = rejected ? 'Your API key was rejected. Open AI settings and check it.' : ({
      403: 'This API key isn’t allowed to use that model. Check the key in AI Studio.',
      404: 'No compatible AI model was found for this key. Open AI Studio and check that the key works there.',
      413: 'That image is too large. Try a smaller photo.',
      429: 'Too many requests right now (free-tier limit). Wait a minute and try again.',
      500: 'The AI service had a hiccup. Please try again.',
      503: 'The AI service is busy. Please try again in a moment.'
    }[res.status] || `The AI service returned an error (${res.status}). ${detail}`);
    return new AIError(msg, rejected ? 'key' : '');
  }

  /* One reusable function for every AI request.
     Input: [{type:'text',text}, {type:'image',source:{media_type,data}}] */
  async function call(content, maxTokens = 1024, opts = {}) {
    const key = getKey();
    if (!key) throw new AIError('No API key set. Open AI settings to add one.');
    const parts = content.map((b) => b.type === 'image'
      ? { inline_data: { mime_type: b.source.media_type, data: b.source.data } }
      : { text: b.text });

    let models = await listModels(key);
    const lastOk = store.get(MODEL_STORAGE);
    if (lastOk && models.includes(lastOk)) models = [lastOk, ...models.filter((m) => m !== lastOk)];
    const queue = [...models, ...models];
    const dead = new Set();
    let err = null, tries = 0;

    for (let i = 0; i < queue.length && tries < MAX_TRIES; i++) {
      const m = queue[i];
      if (dead.has(m)) continue;
      tries++;
      let res;
      try { res = await send(key, m, parts, maxTokens, opts.json); }
      catch (e) { err = e; if (e.code === 'timeout') continue; throw e; }
      if (res.ok) {
        store.set(MODEL_STORAGE, m);
        const data = await res.json();
        const out = ((data.candidates || [])[0] || {}).content;
        return ((out && out.parts) || []).map((p) => p.text || '').join('\n').trim();
      }
      err = await failure(res);
      if (res.status === 404) {                       // retired for this key: remember and skip it from now on
        dead.add(m); tries--;
        store.set(LIST_STORAGE, JSON.stringify(models.filter((x) => !dead.has(x))));
        continue;
      }
      if (![429, 500, 503].includes(res.status)) throw err;   // key or request problems: other models won't help
      await sleep(600 * tries);
    }
    throw err || new AIError('The AI service is busy. Please try again in a moment.');
  }

  /* pull JSON out of a reply even if the model wrapped it in ``` fences */
  function extractJSON(text) {
    const s = String(text).replace(/```json|```/gi, '').trim();
    const start = s.search(/[\[{]/);
    const end = Math.max(s.lastIndexOf(']'), s.lastIndexOf('}'));
    if (start === -1 || end < start) throw new AIError('The AI reply wasn’t in the expected format. Please try again.');
    try { return JSON.parse(s.slice(start, end + 1)); }
    catch (e) { throw new AIError('The AI reply wasn’t in the expected format. Please try again.'); }
  }

  /* shrink the photo before upload: faster, cheaper, and under the size limit */
  function imageToBase64(file, max = 1280) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.85).split(',')[1]);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new AIError('We couldn’t read that image. Try a JPG or PNG photo.')); };
      img.src = url;
    });
  }

  const DEMO_POOL = [
    { name: 'Tomato', qty: 4, unit: 'pcs' }, { name: 'Onion', qty: 3, unit: 'pcs' },
    { name: 'Capsicum', qty: 2, unit: 'pcs' }, { name: 'Paneer', qty: 1, unit: 'packs' },
    { name: 'Milk', qty: 1, unit: 'L' }, { name: 'Egg', qty: 6, unit: 'pcs' },
    { name: 'Spinach', qty: 200, unit: 'g' }, { name: 'Carrot', qty: 3, unit: 'pcs' },
    { name: 'Cheese', qty: 1, unit: 'packs' }, { name: 'Butter', qty: 1, unit: 'packs' },
    { name: 'Lemon', qty: 2, unit: 'pcs' }, { name: 'Curd', qty: 400, unit: 'g' }
  ];

  async function scanPhoto(file) {
    /* Demo mode: no key, so return believable sample results */
    if (!hasKey()) {
      await new Promise((r) => setTimeout(r, 1900));
      const items = [...DEMO_POOL].sort(() => Math.random() - 0.5).slice(0, 6);
      return { items, demo: true };
    }

    const data = await imageToBase64(file);
    const names = (typeof INGREDIENTS !== 'undefined') ? INGREDIENTS.map((i) => i.name).join(', ') : '';
    const prompt =
`You are the ingredient detector inside a kitchen app. Look at this photo of a fridge, pantry or groceries and list every distinct edible ingredient you can clearly see.
Reply with ONLY a JSON array (no markdown, no commentary). Each element:
{"name": common English name, singular, e.g. "Tomato", "qty": estimated number, "unit": one of "pcs","g","kg","ml","L","packs", "category": one of "veggies","fruits","dairy","grains","proteins","spices","other", "shelfDays": typical days it stays fresh after purchase}
When an item matches one of these names, use that exact spelling: ${names}.
If you see no food, reply with [].`;

    const text = await call([
      { type: 'image', source: { media_type: 'image/jpeg', data } },
      { type: 'text', text: prompt }
    ], 1500);

    const arr = extractJSON(text);
    if (!Array.isArray(arr)) throw new AIError('The AI reply wasn’t in the expected format. Please try again.');
    const items = arr
      .filter((x) => x && typeof x.name === 'string' && x.name.trim())
      .slice(0, 30)
      .map((x) => ({ name: x.name, qty: x.qty, unit: x.unit, cat: x.category, shelf: x.shelfDays }));
    return { items, demo: false };
  }

  window.AI = { model: () => store.get(MODEL_STORAGE), hasKey, getKey, setKey, clearKey, call, extractJSON, scanPhoto, AIError };
})();