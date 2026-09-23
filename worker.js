/**
 * Cloudflare Worker — AI food estimator for the nutrition dashboard.
 *
 * Uses the Google Gemini API (free tier, no credit card needed).
 * Keeps the API key server-side so it never ships in the public page.
 *
 * Setup:
 *   1. Get a key at https://aistudio.google.com/apikey
 *   2. Deploy this worker at https://workers.cloudflare.com
 *   3. Worker → Settings → Variables → add secret GEMINI_API_KEY
 *   4. Paste the worker URL into AI_WORKER_URL in nutrition_dashboard.html
 */

// Tried in order; first one that isn't a 404 wins. Google retires model names
// periodically, so keep a couple of fallbacks here.
const MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.5-flash'];

const ALLOWED_ORIGINS = [
  'https://memmedovsr99-alt.github.io',
  'http://localhost:8099',
  'http://127.0.0.1:8099',
];

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Late Night', 'Pre-workout', 'Post-workout'];

const SYSTEM_PROMPT = `You estimate calories and macros for food descriptions, for a nutrition tracking app used by two people cutting weight.

Break the description into individual food items and give each one calories, protein, carbs and fat in grams. Round to whole numbers.

ESTIMATION RULES — these come from months of calibration with this user, follow them:

Weights
- If a weight is given, use it exactly. Note whether it is raw or cooked and use the right density.
- Raw boneless skinless chicken breast ~120 cal/100g (22g protein). Cooked ~165 cal/100g (31g protein).
- Cooked white rice ~130 cal/100g. Raw pasta ~350 cal/100g; cooked pasta ~157 cal/100g. Raw potato ~77 cal/100g.
- Bone-in meat: subtract bone before counting. Wings are ~40% bone, thigh+leg ~25-35%, lamb chops ~30%.
- "Trimmed of fat" means use a lean cut value, not the packaged label.

Portions
- Restaurant and street food is oilier and larger than home cooking; err upward for it and downward for home-cooked.
- When a dish is shared, apply the stated fraction to the whole dish, not to a single serving.
- Foods these users eat often, per piece: lahmacun ~220, midye dolma ~28, ceyrek kokorec ~225,
  tavuk pilav portion ~400, adana portion ~400, icli kofte ~130, small baklava ~125, regular baklava ~180-220,
  pogaca ~120, gozleme piece ~165, serpme kahvalti spread 700-1000 total, dovga bowl ~160, ayran glass ~70.
- Alcohol: beer 330ml ~150, beer 500ml ~220, double spirit 50ml ~120.

Style
- Be realistic, not punitive. Do not pad estimates "to be safe" — this user checks the numbers and pushes back
  when something is inflated.
- Sauces and dressings are easy to miss: if mayo or a heavy dressing is mentioned, count it separately (~90 cal/tbsp).
- Cooking oil counts: 1 tsp olive oil ~40 cal. "Minimal oil" is 1-2 tsp, "oily" is 3-4 tsp, but only if oil is mentioned.

Each item needs a "meal", which must be exactly one of:
Breakfast, Lunch, Dinner, Snacks, Late Night, Pre-workout, Post-workout.
Use the meal the user names; if they name none, infer it from context, else use the meal hint provided.

Keep item names short and specific, including the weight when one was given (e.g. "Chicken breast 252g cooked").
Only fill "note" if an assumption is genuinely worth flagging — one short sentence, otherwise leave it empty.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name:     { type: 'string' },
          meal:     { type: 'string' },
          calories: { type: 'integer' },
          protein:  { type: 'integer' },
          carbs:    { type: 'integer' },
          fat:      { type: 'integer' },
        },
        required: ['name', 'meal', 'calories', 'protein', 'carbs', 'fat'],
      },
    },
    note: { type: 'string' },
  },
  required: ['items'],
};

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

// Ask Google which models this key can actually use. Model names get retired,
// so discovery beats hardcoding. Prefers flash (fast + generous free tier).
async function discoverModels(key) {
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', {
    headers: { 'x-goog-api-key': key },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const usable = (data.models || [])
    .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map(m => String(m.name || '').replace(/^models\//, ''))
    .filter(n => n && !n.includes('embedding') && !n.includes('vision') && !n.includes('tts'));
  const flash = usable.filter(n => n.includes('flash'));
  return [...flash, ...usable.filter(n => !flash.includes(n))];
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405, cors);

    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return json({ error: 'Origin not allowed' }, 403, cors);
    }
    if (!env.GEMINI_API_KEY) {
      return json({ error: 'GEMINI_API_KEY secret is not set on the worker' }, 500, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400, cors);
    }

    if (body.debug === 'models') {
      return json({ models: await discoverModels(env.GEMINI_API_KEY) }, 200, cors);
    }

    const description = String(body.description || '').trim();
    const mealHint = MEALS.includes(body.meal) ? body.meal : 'Snacks';

    if (!description) return json({ error: 'Describe what you ate first' }, 400, cors);
    if (description.length > 2000) return json({ error: 'Description too long' }, 400, cors);

    const payload = JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{
        role: 'user',
        parts: [{ text: `Meal hint if none is stated: ${mealHint}\n\nWhat I ate:\n${description}` }],
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.3,
        maxOutputTokens: 3000,
      },
    });

    // 404 = model retired, 429/503 = busy. All are worth another attempt;
    // anything else (bad key, bad request) will fail identically next time.
    const RETRYABLE = [404, 429, 503];
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    let res = null;
    let lastErr = '';

    outer:
    for (const model of MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          res = await fetch(url, {
            method: 'POST',
            headers: {
              'x-goog-api-key': env.GEMINI_API_KEY,
              'Content-Type': 'application/json',
            },
            body: payload,
          });
        } catch (e) {
          lastErr = `Could not reach Gemini: ${e.message}`;
          res = null;
          break;
        }

        if (res.ok) break outer;

        const status = res.status;
        lastErr = `Gemini ${status} on ${model}: ${(await res.text()).slice(0, 200)}`;
        res = null;

        if (!RETRYABLE.includes(status)) break outer;
        // A retired model will never come back; move straight to the next name.
        if (status === 404) break;
        if (attempt === 0) await sleep(700);
      }
    }

    // Hardcoded names all failed — ask the API what it actually offers.
    if (!res) {
      let discovered = [];
      try { discovered = await discoverModels(env.GEMINI_API_KEY); } catch (e) { /* keep lastErr */ }

      for (const model of discovered.slice(0, 4)) {
        if (MODELS.includes(model)) continue;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        try {
          const r = await fetch(url, {
            method: 'POST',
            headers: {
              'x-goog-api-key': env.GEMINI_API_KEY,
              'Content-Type': 'application/json',
            },
            body: payload,
          });
          if (r.ok) { res = r; break; }
          lastErr = `Gemini ${r.status} on ${model}: ${(await r.text()).slice(0, 200)}`;
        } catch (e) {
          lastErr = `Could not reach Gemini: ${e.message}`;
        }
      }
    }

    if (!res) {
      const busy = lastErr.includes('503') || lastErr.includes('429');
      return json({
        error: busy ? 'Gemini is busy right now — try again in a few seconds' : lastErr,
      }, 502, cors);
    }

    const data = await res.json();

    const blocked = data.promptFeedback && data.promptFeedback.blockReason;
    if (blocked) return json({ error: `Request blocked: ${blocked}` }, 502, cors);

    const text = (((data.candidates || [])[0] || {}).content || {}).parts
      ?.map(p => p.text || '').join('').trim() || '';

    if (!text) return json({ error: 'Gemini returned an empty response — try rewording it' }, 502, cors);

    let parsed;
    try {
      parsed = JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
    } catch {
      return json({ error: 'Could not parse the estimate — try rewording it' }, 502, cors);
    }

    const items = (parsed.items || []).map(i => ({
      name:     String(i.name || 'Food').slice(0, 120),
      meal:     MEALS.includes(i.meal) ? i.meal : mealHint,
      calories: Math.max(0, Math.round(Number(i.calories) || 0)),
      protein:  Math.max(0, Math.round(Number(i.protein)  || 0)),
      carbs:    Math.max(0, Math.round(Number(i.carbs)    || 0)),
      fat:      Math.max(0, Math.round(Number(i.fat)      || 0)),
    }));

    if (!items.length) return json({ error: 'No food items recognised' }, 502, cors);

    return json({ items, note: String(parsed.note || '') }, 200, cors);
  },
};
