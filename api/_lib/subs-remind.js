// =====================================================================
// DEV MENU — تذكيرات بطاقة الاشتراكات (الباقات المدفوعة مسبقاً)
//   ثلاث رسائل تلقائية على بطاقة العميل في المحفظة، صاحب المحل يشغّل اللي يبيه منها:
//   away   غاب وعنده رصيد: «باقي لك 12 مرة في باقتك»، مرة لكل غيبة (ترجع لو استخدم وغاب مرة ثانية)
//   expiry باقته قربت تنتهي وفيها رصيد: قبل الانتهاء بأيام، مرة وحدة للباقة
//   renew  خلصت باقته أو انتهت وما جدّد: بعد أيام، مرة وحدة للباقة
//   يشغّلها loyalty-cron كل يوم العصر
// =====================================================================
const { rest, q, storeHasFeature } = require('./core');
const wallet = require('./wallet');

const DAY = 864e5;
const BATCH = 40;          // لكل محل كل يوم، والباقي ياخذ دوره بكرة
const AWAY_MAX = 120;      // غاب أكثر من كذا: غالباً حذف البطاقة، فما نبدأ معه
const RENEW_MAX = 45;      // خلصت من زمان: ما نذكّره بالتجديد
const KINDS = ['away', 'expiry', 'renew'];
const OPTIONS = { away: [7, 14, 21, 30], expiry: [3, 7, 14], renew: [1, 3, 7] };
const DEFAULTS = {
  away: { on: false, days: 14, text: 'وحشتنا يا {name}! باقي لك {left} في باقتك «{plan}» عند {store}، حيّاك' },
  expiry: { on: false, days: 7, text: 'باقتك «{plan}» تنتهي {date}، وباقي لك فيها {left}. لا تفوّتها!' },
  renew: { on: false, days: 3, text: 'خلصت باقتك «{plan}» يا {name}، جدّدها من الكاشير وكمّل معنا' }
};

function normalize(r) {
  const src = r && typeof r === 'object' ? r : {};
  const out = {};
  for (const k of KINDS) {
    const s = src[k] && typeof src[k] === 'object' ? src[k] : {};
    const days = Number(s.days);
    const text = String(s.text || '').trim().slice(0, 180);
    out[k] = { on: !!s.on, days: OPTIONS[k].includes(days) ? days : DEFAULTS[k].days, text: text || DEFAULTS[k].text };
  }
  return out;
}

const times = (n) => n === 1 ? 'مرة وحدة' : n === 2 ? 'مرتين' : n <= 10 ? `${n} مرات` : `${n} مرة`;
const dateText = (iso) => new Date(iso).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'long', timeZone: 'Asia/Riyadh' });

// نص الرسالة لهالعميل
function fill(text, c, store) {
  const first = String(c.name || '').trim().split(/\s+/)[0] || '';
  let t = String(text);
  if (!first || first === 'عضو') t = t.replace(/\s*يا\s*\{name\}/g, '').replace(/\{name\}\s*،?\s*/g, '');
  return t.replace(/\{name\}/g, first).replace(/\{store\}/g, String(store.name || '').trim())
    .replace(/\{plan\}/g, String(c.plan_name || '').trim()).replace(/\{left\}/g, times(Math.max(0, Number(c.remaining || 0))))
    .replace(/\{date\}/g, c.expires_at ? dateText(c.expires_at) : '')
    .replace(/\s{2,}/g, ' ').replace(/^[\s،!]+/, '').trim().slice(0, 200);
}

// مين عليه الدور اليوم؟ يرجّع [{card, kind}]، رسالة وحدة بالكثير لكل باقة ولكل عميل
function dueCards(cards, cfg, now = Date.now()) {
  const out = [], seen = new Set();
  const who = (c) => c.loyalty_card_id ? `m${c.loyalty_card_id}` : c.phone ? `p${c.phone}` : `c${c.id}`;
  // جدّد؟ فيه باقة أحدث لنفس العميل (سارية أو بانتظار الدفع)
  const renewed = (c) => cards.some(o => o.id !== c.id && who(o) === who(c) && Date.parse(o.created_at) > Date.parse(c.created_at) && (o.status === 'pending' || o.remaining > 0));
  for (const c of cards) {
    if (c.status !== 'active' || seen.has(who(c))) continue;
    const exp = c.expires_at ? Date.parse(c.expires_at) : null;
    const expired = exp !== null && exp <= now;
    let kind = null;
    if (c.remaining <= 0 || expired) {
      const end = c.remaining <= 0 ? Date.parse(c.last_used_at || c.created_at) : exp;
      const since = (now - end) / DAY;
      if (cfg.renew.on && !c.remind_renew_at && since >= cfg.renew.days && since <= RENEW_MAX && !renewed(c)) kind = 'renew';
    } else {
      const active = Math.max(Date.parse(c.created_at), c.last_used_at ? Date.parse(c.last_used_at) : 0);
      const away = (now - active) / DAY;
      if (cfg.expiry.on && exp !== null && !c.remind_expiry_at && (exp - now) / DAY <= cfg.expiry.days) kind = 'expiry';
      else if (cfg.away.on && away >= cfg.away.days && away <= AWAY_MAX && (!c.remind_away_at || Date.parse(c.remind_away_at) < active)) kind = 'away';
    }
    if (!kind) continue;
    seen.add(who(c));
    out.push({ card: c, kind });
  }
  return out;
}

async function runSubsRemind(storeId, { limitMs = 20e3 } = {}) {
  const started = Date.now();
  const store = (await rest(`clients?id=eq.${storeId}&select=id,name,parent_id,is_active,subs_remind`))[0];
  if (!store || store.parent_id || !store.is_active) return { skipped: 'off' };
  const cfg = normalize(store.subs_remind);
  if (!KINDS.some(k => cfg[k].on) || !wallet.configured()) return { skipped: 'off' };
  if (!(await storeHasFeature(storeId, 'subs'))) return { skipped: 'plan' };
  const now = Date.now();
  const cards = await rest(`loyalty_pkg_cards?client_id=eq.${storeId}&status=in.(active,pending)&created_at=gt.${q(new Date(now - 400 * DAY).toISOString())}&select=id,name,phone,plan_name,total,remaining,expires_at,status,created_at,last_used_at,wallet_serial,loyalty_card_id,remind_away_at,remind_expiry_at,remind_renew_at&order=created_at.desc&limit=3000`);
  // البطاقة في محفظته؟ (بطاقة الباقة نفسها، أو بطاقة الولاء المربوطة فيها)
  const linked = [...new Set(cards.filter(c => c.loyalty_card_id && !c.wallet_serial).map(c => c.loyalty_card_id))];
  const inWallet = new Set();
  for (let i = 0; i < linked.length; i += 200) {
    (await rest(`loyalty_cards?id=in.(${linked.slice(i, i + 200).join(',')})&wallet_serial=not.is.null&select=id`)).forEach(r => inWallet.add(r.id));
  }
  const reachable = cards.filter(c => c.wallet_serial || inWallet.has(c.loyalty_card_id));
  // نمرر كل الباقات (حتى اللي مو في المحفظة) عشان نعرف مين جدّد
  const due = dueCards(cards, cfg, now).filter(d => reachable.includes(d.card)).slice(0, BATCH);
  const P = require('./packages');
  const sent = { away: 0, expiry: 0, renew: 0 };
  for (const { card, kind } of due) {
    if (Date.now() - started > limitMs) break;
    // نعلّمها قبل الإرسال: لو انقطع الشغل بالنص ما تتكرر الرسالة بكرة
    await rest(`loyalty_pkg_cards?id=eq.${card.id}`, { method: 'PATCH', body: { [`remind_${kind}_at`]: new Date().toISOString() } });
    await P.pushCard(storeId, card.id, fill(cfg[kind].text, card, store)).catch(e => console.error('SUBS_REMIND_PUSH', e.message));
    sent[kind]++;
  }
  return { sent, due: due.length };
}

// أرقام آخر 90 يوم للوحة: كم وصلته، وكم رجع (استخدم بعد التذكير)، وكم جدّد
async function stats(storeId) {
  const since = new Date(Date.now() - 90 * DAY).toISOString();
  const rows = await rest(`loyalty_pkg_cards?client_id=eq.${storeId}&or=(remind_away_at.gt.${since},remind_expiry_at.gt.${since},remind_renew_at.gt.${since})&select=id,phone,loyalty_card_id,created_at,last_used_at,remind_away_at,remind_expiry_at,remind_renew_at&limit=3000`).catch(() => []);
  const after = (a, b) => a && b && Date.parse(a) > Date.parse(b);
  const away = rows.filter(r => after(r.remind_away_at, since));
  const exp = rows.filter(r => after(r.remind_expiry_at, since));
  const renew = rows.filter(r => after(r.remind_renew_at, since));
  let renewed = 0;
  if (renew.length) {
    const newer = await rest(`loyalty_pkg_cards?client_id=eq.${storeId}&created_at=gt.${q(since)}&select=id,phone,loyalty_card_id,created_at&limit=3000`).catch(() => []);
    renewed = renew.filter(r => newer.some(n => n.id !== r.id && Date.parse(n.created_at) > Date.parse(r.remind_renew_at) &&
      ((r.loyalty_card_id && n.loyalty_card_id === r.loyalty_card_id) || (r.phone && n.phone === r.phone)))).length;
  }
  return {
    away: { sent: away.length, back: away.filter(r => after(r.last_used_at, r.remind_away_at)).length },
    expiry: { sent: exp.length, back: exp.filter(r => after(r.last_used_at, r.remind_expiry_at)).length },
    renew: { sent: renew.length, back: renewed }
  };
}

module.exports = { runSubsRemind, normalize, dueCards, fill, stats, DEFAULTS, OPTIONS, KINDS };
