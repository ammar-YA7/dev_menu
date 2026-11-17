// =====================================================================
// DEV MENU — استرجاع العميل اللي غاب (بطاقة الأختام)
//   صاحب المحل يكتب 3 رسائل مرة وحدة (أو يخلي الجاهزة). تنرسل على بطاقة المحفظة:
//   الأولى بعد عدد الأيام اللي يختاره من آخر ختم، والثانية بعدها بأسبوع، والثالثة بعدها بأسبوع
//   والثالثة تعطيه ختم هدية ينضاف له أول ما يرجع (لو مفعّلة)
//   أول ما يرجع ويختم تقف السلسلة (server_comeback_return)، وتبدأ من جديد لو غاب مرة ثانية
//   يشغّلها loyalty-cron كل يوم العصر
// =====================================================================
const { rest, q, rpc, storeHasFeature } = require('./core');
const { normalizeLoyalty, COMEBACK_DEFAULTS } = require('./loyalty');
const wallet = require('./wallet');

const DAY = 864e5;
const STEP_GAP = 7;          // أيام بين الرسالة والثانية
const MAX_AGE = 150;         // اللي غاب أكثر من كذا غالباً حذف البطاقة، فما نبدأ معه
const BATCH = 60;            // لكل محل كل يوم، والباقي ياخذ دوره بكرة
const NO_GIFT_LAST = 'آخر تذكير من {store}: بطاقتك وأختامك محفوظة، ننتظرك';

// نص الرسالة لهالزبون: الاسم والمحل والباقي على المكافأة
function fill(text, { card, store, settings }) {
  const first = String(card.name || '').trim().split(/\s+/)[0] || '';
  const left = Math.max(0, settings.needed - Math.min(Number(card.stamps || 0), settings.needed));
  let t = String(text);
  if (!first) t = t.replace(/\s*يا\s*\{name\}/g, '').replace(/\{name\}\s*،?\s*/g, '');
  return t.replace(/\{name\}/g, first).replace(/\{store\}/g, String(store.name || '').trim())
    .replace(/\{left\}/g, left === 1 ? 'ختم واحد' : left === 2 ? 'ختمين' : left <= 10 ? `${left} أختام` : `${left} ختم`).replace(/\{reward\}/g, settings.reward)
    .replace(/\s{2,}/g, ' ').replace(/^[\s،!]+/, '').trim().slice(0, 180);
}

// نص الخطوة (1..3) حسب الإعداد
function stepText(cb, step) {
  const t = cb.steps[step - 1];
  if (step === 3 && !cb.gift && t === COMEBACK_DEFAULTS[2]) return NO_GIFT_LAST;
  return t;
}

// مين عليه الدور اليوم؟ يرجّع [{card, step}]
function dueCards(cards, cb, now = Date.now()) {
  const out = [];
  for (const c of cards) {
    if (!c.last_stamp_at || !c.wallet_serial) continue;
    const away = (now - Date.parse(c.last_stamp_at)) / DAY;
    let step = Number(c.comeback_step || 0);
    // رجع من طريق ما وقّف السلسلة (ختم بعد آخر رسالة): نعتبرها غيبة جديدة
    if (step && c.comeback_at && Date.parse(c.last_stamp_at) > Date.parse(c.comeback_at)) step = 0;
    if (step >= 3) continue;
    if (step === 0) { if (away >= cb.days && away <= MAX_AGE) out.push({ card: c, step: 1 }); continue; }
    if (c.comeback_at && (now - Date.parse(c.comeback_at)) / DAY >= STEP_GAP) out.push({ card: c, step: step + 1 });
  }
  return out.sort((a, b) => b.card.visits - a.card.visits);
}

async function runComeback(storeId) {
  const store = (await rest(`clients?id=eq.${storeId}&select=id,name,business_type,business_label,loyalty_enabled,loyalty_settings,parent_id`))[0];
  if (!store || !store.loyalty_enabled || store.parent_id) return { skipped: 'off' };
  const settings = normalizeLoyalty(store.loyalty_settings, store);
  const cb = settings.comeback;
  if (!cb.enabled || !wallet.configured()) return { skipped: 'off' };
  if (!(await storeHasFeature(storeId, 'loyalty'))) return { skipped: 'plan' };
  const now = Date.now();
  const cards = await rest(`loyalty_cards?client_id=eq.${storeId}&wallet_serial=not.is.null&last_stamp_at=lt.${q(new Date(now - cb.days * DAY).toISOString())}&select=id,name,lang,stamps,visits,last_stamp_at,wallet_serial,wallet_platform,comeback_step,comeback_at&order=last_stamp_at.desc&limit=3000`);
  const due = dueCards(cards, cb, now).slice(0, BATCH);
  if (!due.length) return { sent: 0 };
  const bodies = {}, rows = [];
  // المساعد يكتبها: رسالة مختلفة لكل عميل باسمه (ولو تعطّل الذكاء نرجع للنص الجاهز)
  const ready = (card, step) => step === 1 && card.stamps >= settings.needed;
  const ai = cb.mode === 'ai' ? await require('./ai').remindMessages({
    storeName: store.name, businessType: require('./sectors').label(store), reward: settings.reward, needed: settings.needed,
    guests: due.map(({ card, step }) => ({ ref: String(card.id), kind: ready(card, step) ? 'comeback_ready' : `comeback_${step}`, name: card.name, lang: card.lang,
      left: Math.max(0, settings.needed - Math.min(Number(card.stamps || 0), settings.needed)), days_since: Math.round((now - Date.parse(card.last_stamp_at)) / DAY), gift: step === 3 && cb.gift }))
  }).catch(e => { console.error('COMEBACK_AI', e.message); return {}; }) : {};
  for (const { card, step } of due) {
    let text = stepText(cb, step);
    // مكافأته جاهزة وما أخذها: الرسالة الأولى تذكّره فيها بدل "باقي لك"
    if (ready(card, step)) text = `مكافأتك (${settings.reward}) جاهزة في {store}، تعال خذها`;
    const body = ai[String(card.id)] || fill(text, { card, store, settings });
    bodies[card.id] = body;
    rows.push({ client_id: storeId, card_id: card.id, body, source: 'owner', kind: 'comeback' });
  }
  await rest('loyalty_messages', { method: 'POST', body: rows });
  const at = new Date().toISOString();
  // نعلّم كل بطاقة بخطوتها (الخطوات مختلفة، فكل خطوة لحالها)
  for (const step of [1, 2, 3]) {
    const ids = due.filter(d => d.step === step).map(d => d.card.id);
    if (!ids.length) continue;
    await rest(`loyalty_cards?id=in.(${ids.join(',')})`, { method: 'PATCH', body: { comeback_step: step, comeback_at: at, ...(step === 3 && cb.gift ? { comeback_bonus: true } : {}) } });
  }
  const queued = await require('./notify-queue').enqueueLoyalty(storeId, 'loyalty_comeback', due.map(d => d.card), { bodies });
  return { sent: rows.length, queued, steps: [1, 2, 3].map(s => due.filter(d => d.step === s).length) };
}

// رجع وانختم له: توقف السلسلة، وختم الهدية لو له. يرجّع { returned, bonus }
async function comebackReturn(cardId, settings) {
  const r = await rpc('server_comeback_return', { p_card: Number(cardId), p_needed: settings.needed }).catch(e => { console.error('COMEBACK_RETURN', e.message); return null; });
  return r && r.returned ? { returned: true, bonus: !!r.bonus } : { returned: false, bonus: false };
}

module.exports = { runComeback, comebackReturn, dueCards, fill, stepText, STEP_GAP };
