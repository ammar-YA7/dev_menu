// =====================================================================
// DEV MENU — ربط واتساب خارجي لمحل معيّن (مو لكل المحلات)
//   المدير العام يضيف مزوّد المحل ومفتاحه من لوحته (api/admin.js ← wa-*)
//   المحل المربوط: صفحة البيجر تطلب جوال العميل (اختياري)، ولما يضغط الكاشير «جاهز» توصله رسالة واتساب
//   المحل اللي ما عنده ربط: ما يتغير عنده شي
//   المزوّدين: Meta الرسمي (قالب معتمد) و UltraMsg و Green API و WasenderAPI
//   أو خادم خاص بالمحل (custom): رابطهم ومفتاحهم وشكل الطلب اللي يقبله خادمهم
//   المفتاح ينحفظ مشفّر في client_whatsapp، وما يرجع للمتصفح أبداً
// =====================================================================
const crypto = require('crypto');
const { rest, ApiError } = require('./core');

const PROVIDERS = ['meta', 'ultramsg', 'greenapi', 'wasender', 'custom'];
const AUTH_STYLES = ['bearer', 'supabase', 'header'];
const DEFAULT_BODY = '{"phone": "{phone}", "message": "{message}"}';
const DEFAULT_MESSAGE = 'طلبك رقم {number} جاهز، تفضّل استلمه من {store}';

// ─── التشفير: المفتاح من INTEGRATIONS_KEY، ولو ما انضاف من مفتاح الخادم ───
// لو تغيّر المفتاح اللي يتشفّر فيه، يدخّل المدير العام مفتاح الواتساب من جديد
function secret() {
  const base = process.env.INTEGRATIONS_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!base) throw new ApiError(500, 'الخادم غير مهيأ للتشفير', 'NOT_CONFIGURED');
  return crypto.createHash('sha256').update(`dm-whatsapp:${base}`).digest();
}
function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', secret(), iv);
  const enc = Buffer.concat([c.update(String(text), 'utf8'), c.final()]);
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), enc.toString('base64url')].join(':');
}
function decrypt(value) {
  const [v, iv, tag, enc] = String(value || '').split(':');
  if (v !== 'v1' || !iv || !tag || !enc) return null;
  try {
    const d = crypto.createDecipheriv('aes-256-gcm', secret(), Buffer.from(iv, 'base64url'));
    d.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([d.update(Buffer.from(enc, 'base64url')), d.final()]).toString('utf8');
  } catch { return null; }
}

// ─── رقم الجوال بالصيغة الدولية بدون + (05xxxxxxxx ← 9665xxxxxxxx) ───
function intlPhone(raw) {
  let d = String(raw || '').replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (/^05\d{8}$/.test(d)) d = '966' + d.slice(1);
  else if (/^5\d{8}$/.test(d)) d = '966' + d;
  return /^[1-9]\d{9,14}$/.test(d) ? d : null;
}
const maskPhone = (p) => (p ? `•••${String(p).slice(-4)}` : null);

// ─── إعدادات المحل: الفرع ياخذ ربطه، ولو ما له ربط ياخذ ربط المحل الرئيسي ───
const cache = new Map();   // دقيقة: صفحة البيجر تسأل كل ثواني
async function configFor(storeId) {
  const hit = cache.get(storeId);
  if (hit && hit.at > Date.now() - 60e3) return hit.cfg;
  const own = (await rest(`client_whatsapp?client_id=eq.${Number(storeId)}&enabled=eq.true&select=*`).catch(() => []))[0];
  let cfg = own || null;
  if (!cfg) {
    const parent = ((await rest(`clients?id=eq.${Number(storeId)}&select=parent_id`).catch(() => []))[0] || {}).parent_id;
    if (parent) cfg = (await rest(`client_whatsapp?client_id=eq.${Number(parent)}&enabled=eq.true&select=*`).catch(() => []))[0] || null;
  }
  cache.set(storeId, { at: Date.now(), cfg });
  return cfg;
}
const linked = async (storeId) => !!(await configFor(storeId));
const forget = () => cache.clear();

// شكل طلب الخادم الخاص: القيم تنحط داخل JSON بشكل آمن (علامات التنصيص والأسطر)
function fillBody(tpl, vals) {
  const out = String(tpl || DEFAULT_BODY).replace(/\{(phone_plus|phone|message|number|store)\}/g, (_, k) => JSON.stringify(String(vals[k] ?? '')).slice(1, -1));
  try { const v = JSON.parse(out); return v && typeof v === 'object' ? JSON.stringify(v) : null; } catch { return null; }
}
const validBody = (tpl) => fillBody(tpl, { phone: '966500000000', phone_plus: '+966500000000', message: 'x', number: '1', store: 'x' }) !== null;

const fill = (tpl, vars) => String(tpl || DEFAULT_MESSAGE).replace(/\{number\}/g, vars.number ?? '').replace(/\{store\}/g, vars.store ?? '');

// ─── الإرسال حسب المزوّد. يرجّع { ok, error } ───
async function send(cfg, to, vars) {
  const token = decrypt(cfg.token_enc);
  if (!token) return { ok: false, error: 'المفتاح ما ينقرأ، أدخله من جديد' };
  const phone = intlPhone(to);
  if (!phone) return { ok: false, error: 'رقم الجوال غير صحيح' };
  let url, init;
  if (cfg.provider === 'meta') {
    const params = cfg.template_vars === 'none' ? [] : cfg.template_vars === 'number' ? [vars.number] : [vars.number, vars.store];
    url = `https://graph.facebook.com/v21.0/${encodeURIComponent(cfg.instance)}/messages`;
    init = { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({
      messaging_product: 'whatsapp', to: phone, type: 'template',
      template: { name: cfg.template, language: { code: cfg.template_lang || 'ar' },
        ...(params.length ? { components: [{ type: 'body', parameters: params.map(p => ({ type: 'text', text: String(p ?? '') })) }] } : {}) }
    }) };
  } else if (cfg.provider === 'ultramsg') {
    url = `https://api.ultramsg.com/${encodeURIComponent(cfg.instance)}/messages/chat`;
    init = { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token, to: `+${phone}`, body: fill(cfg.message, vars) }).toString() };
  } else if (cfg.provider === 'greenapi') {
    const base = (cfg.api_url || 'https://api.green-api.com').replace(/\/+$/, '');
    url = `${base}/waInstance${encodeURIComponent(cfg.instance)}/sendMessage/${encodeURIComponent(token)}`;
    init = { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chatId: `${phone}@c.us`, message: fill(cfg.message, vars) }) };
  } else if (cfg.provider === 'wasender') {
    url = 'https://www.wasenderapi.com/api/send-message';
    init = { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ to: `+${phone}`, text: fill(cfg.message, vars) }) };
  } else if (cfg.provider === 'custom') {
    if (!/^https:\/\//i.test(cfg.api_url || '')) return { ok: false, error: 'رابط الخادم غير صحيح' };
    const body = fillBody(cfg.body_tpl, { phone, phone_plus: `+${phone}`, message: fill(cfg.message, vars), number: vars.number, store: vars.store });
    if (!body) return { ok: false, error: 'شكل الطلب (JSON) غير صحيح' };
    const headers = { 'Content-Type': 'application/json' };
    if (cfg.auth_style === 'header' && cfg.auth_header) headers[cfg.auth_header] = token;
    else if (cfg.auth_style === 'supabase') Object.assign(headers, { apikey: token, Authorization: `Bearer ${token}` });
    else headers.Authorization = `Bearer ${token}`;
    url = cfg.api_url; init = { headers, body };
  } else return { ok: false, error: 'مزوّد غير معروف' };
  return post(url, init, cfg.provider === 'wasender');
}

// الطلب نفسه. Wasender: الحد مشترك على الرقم، فلو رد «انتظر» (retry_after) ننتظر ونعيد مرة وحدة إذا الانتظار قصير
async function post(url, init, canWait, tried = false) {
  try {
    const r = await fetch(url, { method: 'POST', ...init, signal: AbortSignal.timeout(15000) });
    const text = await r.text();
    let data = null; try { data = JSON.parse(text); } catch {}
    const wait = Number(data && data.retry_after);
    if (canWait && !tried && wait > 0 && wait <= 8) { await new Promise(res => setTimeout(res, wait * 1000 + 300)); return post(url, init, canWait, true); }
    // UltraMsg يرجّع 200 حتى مع الخطأ، والخطأ يكون في error
    const err = !r.ok ? ((data && (data.error && (data.error.message || data.error))) || data && data.message || `HTTP ${r.status}`)
      : data && data.error ? (data.error.message || data.error)
      : data && data.success === false ? (data.message || 'المزوّد رفض الرسالة') : null;
    return err ? { ok: false, error: String(typeof err === 'string' ? err : JSON.stringify(err)).slice(0, 200) } : { ok: true };
  } catch (e) {
    return { ok: false, error: e && (e.name === 'TimeoutError' || e.name === 'AbortError') ? 'المزوّد ما رد خلال 15 ثانية' : String(e.message || e).slice(0, 200) };
  }
}

// ─── «طلبك جاهز» لرقم بيجر عنده جوال ───
async function pagerReady(store, ticket) {
  if (!ticket || !ticket.wa_phone) return 'off';
  const cfg = await configFor(store.id);
  if (!cfg) return 'off';
  const r = await send(cfg, ticket.wa_phone, { number: ticket.number, store: store.display_name || store.name || '' });
  const now = new Date().toISOString();
  await Promise.all([
    rest(`pager_tickets?id=eq.${ticket.id}`, { method: 'PATCH', body: { wa_status: r.ok ? `sent ${now.slice(11, 19)}` : `failed: ${r.error}`.slice(0, 200) } }).catch(() => {}),
    rest(`client_whatsapp?client_id=eq.${cfg.client_id}`, { method: 'PATCH', body: r.ok ? { last_sent_at: now, last_error: null } : { last_error: `${now.slice(0, 16)} ${r.error}`.slice(0, 220) } }).catch(() => {})
  ]);
  console.log('PAGER_WA', store.id, ticket.id, r.ok ? 'sent' : r.error);
  return r.ok ? 'sent' : 'failed';
}

module.exports = { PROVIDERS, AUTH_STYLES, DEFAULT_BODY, validBody, DEFAULT_MESSAGE, encrypt, decrypt, intlPhone, maskPhone, configFor, linked, forget, send, pagerReady };
