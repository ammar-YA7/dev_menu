// =====================================================================
// DEV MENU — الباقات المدفوعة مسبقاً (ضمن بطاقة الولاء)
// الزبون يدفع في الكاشير ثمن باقة (مثلاً 30 وجبة)، وتطلع له بطاقة في المحفظة برصيده.
// الكاشير يمسح كود البطاقة (DMP1.<رقم>.<توقيع>) وينقص واحد، والبطاقة تتحدث على طول.
// =====================================================================
const crypto = require('crypto');
const { rest, rpc, ApiError, storeLink } = require('./core');
const wallet = require('./wallet');
const { tr } = require('./i18n');
const { normalizeLoyalty } = require('./loyalty');

const SECRET = `devmenu-pkg:${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`;
const sign = (storeId, id) => crypto.createHmac('sha256', SECRET).update(`${storeId}:${id}`).digest('base64url').slice(0, 10);
const pkgQr = (c) => `DMP1.${c.id}.${sign(c.client_id, c.id)}`;
const isPkgQr = (v) => /^DMP1\./.test(String(v || '').trim());
// storeIds: المحل الرئيسي وفروعه
function parsePkgQr(storeIds, value) {
  const m = String(value || '').trim().match(/^DMP1\.(\d{1,12})\.([A-Za-z0-9_-]{10})$/);
  if (!m) return null;
  const id = Number(m[1]);
  return [].concat(storeIds).some(s => crypto.timingSafeEqual(Buffer.from(m[2]), Buffer.from(sign(s, id)))) ? id : null;
}

const pageUrl = (store, c) => { const u = storeLink(store.client_slug, 'package'); return `${u}${u.includes('?') ? '&' : '?'}t=${encodeURIComponent(c.token)}`; };
const expired = (c) => !!c.expires_at && Date.parse(c.expires_at) <= Date.now();
const dateText = (iso) => new Date(iso).toLocaleDateString('ar-SA-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Riyadh' });

// اللي يشوفه الزبون والكاشير (بدون الرقم السري للبطاقة)
const cardView = (c) => ({
  id: c.id, plan_name: c.plan_name, name: c.name, total: c.total, remaining: c.remaining,
  expires_at: c.expires_at || null, expired: expired(c), last_used_at: c.last_used_at || null, created_at: c.created_at,
  qr: pkgQr(c), in_wallet: !!c.wallet_url, member: !!c.loyalty_card_id, pending: c.status === 'pending'
});

// تصميم بطاقة الاشتراكات: الخاص فيها، وإلا لون وشعار بطاقة الأختام
const designOf = (store, settings) => {
  const own = store.subs_design || {}, ly = (settings && settings.design) || {};
  return { color: own.color || ly.color || null, logo: own.logo || ly.logo || store.logo_url || null, strip: own.strip || null };
};
function passBody(store, settings, c, notice) {
  const L = (t) => tr(c.lang, t);
  const d = designOf(store, settings);
  const body = {
    logoText: String(store.name || 'DEV MENU').slice(0, 40),
    organizationName: String(store.name || 'DEV MENU').slice(0, 64),
    description: L(`باقة ${c.plan_name}: ${store.name || ''}`).slice(0, 120),
    colorPreset: 'green',
    // إشعار واحد بس لكل تحديث: الرسالة لو فيه، وإلا تغيّر الرصيد
    headerFields: c.status === 'pending'
      ? [{ label: L('الحالة'), value: L('بانتظار التفعيل') }]
      : [{ label: L('المتبقي'), value: `${c.remaining} / ${c.total}`, ...(String(notice || '').trim() ? {} : { changeMessage: L('رصيد باقتك صار %@') }) }],
    secondaryFields: [{ label: L('الباقة'), value: String(c.plan_name).slice(0, 40) }, { label: L('الاسم'), value: String(c.name).slice(0, 40) }],
    auxiliaryFields: c.expires_at ? [{ label: L('تنتهي'), value: dateText(c.expires_at) }] : [],
    backFields: [
      { label: L('طريقة الاستخدام'), value: L('اعرض الكود للكاشير كل ما تستخدم الباقة، وينقص الرصيد واحد.') },
      { label: L('افتح باقتك'), value: pageUrl(store, c) }
    ],
    barcodeValue: pkgQr(c), barcodeFormat: 'QR', barcodeAltText: L(`باقة #${c.id}`),
    sharingProhibited: true,
    ...(String(notice || '').trim() ? { notification: String(notice).slice(0, 250) } : {})
  };
  if (d.color) { body.color = d.color; delete body.colorPreset; }
  if (d.logo && /^https:\/\//.test(d.logo)) body.logoURL = d.logo;
  if (d.strip && /^https:\/\//.test(d.strip)) body.stripURL = d.strip;
  return body;
}

async function storeFor(storeId) {
  const store = (await rest(`clients?id=eq.${storeId}&select=id,name,client_slug,logo_url,loyalty_settings,subs_design`))[0];
  if (!store) throw new ApiError(404, 'المحل غير موجود');
  return { store, settings: normalizeLoyalty(store.loyalty_settings) };
}

// إشعار حسب الرصيد بعد الاستخدام
// رسالة كل خصم: وش انخصم، وكم باقي، وتنبيه لما تقرب تخلص
function useNotice(c) {
  const L = (t) => tr(c.lang, t);
  if (c.remaining <= 0) return L(`خلصت باقتك «${c.plan_name}» 🙏 حيّاك تجددها من الكاشير متى ما بغيت`);
  if (c.remaining <= 2) return L(`✅ بالعافية! باقي لك ${c.remaining} بس من باقتك، جدّدها قبل ما تخلص 😉`);
  return L(`✅ بالعافية! انخصمت مرة، وباقي لك ${c.remaining} من ${c.total}`);
}

async function pushCard(storeId, cardId, notice = '') {
  const c = (await rest(`loyalty_pkg_cards?id=eq.${cardId}&select=*`))[0];
  if (!c) return null;
  // مربوطة بعضوية: الرصيد يطلع في بطاقة الولاء نفسها
  if (c.loyalty_card_id) await require('./loyalty-assistant').pushWalletCards(storeId, { cardIds: [c.loyalty_card_id], notice: notice || null }).catch(() => 0);
  if (!c.wallet_serial) return null;
  const { store, settings } = await storeFor(storeId);
  const err = await wallet.updateRaw(c.wallet_serial, passBody(store, settings, c, notice));
  await rest(`loyalty_pkg_cards?id=eq.${c.id}`, { method: 'PATCH', body: { wallet_error: err } }).catch(() => {});
  return err;
}

async function createWallet(storeId, c, req) {
  if (c.wallet_url) return c.wallet_url;
  const { store, settings } = await storeFor(storeId);
  const pass = await wallet.createRaw(passBody(store, settings, c, tr(c.lang, `أهلاً ${c.name}، باقتك جاهزة`)));
  await rest(`loyalty_pkg_cards?id=eq.${c.id}`, { method: 'PATCH', body: { wallet_serial: pass.serialNumber, wallet_url: pass.shareUrl, wallet_error: null, wallet_platform: wallet.walletPlatform(req) } });
  return pass.shareUrl;
}

// استخدام واحد من الرصيد
async function useCard(storeId, cardId, branchId) {
  const r = await rpc('server_pkg_use', { p_card: cardId, p_branch: branchId || null });
  if (r.ok) {
    const c = (await rest(`loyalty_pkg_cards?id=eq.${cardId}&select=*`))[0];
    pushCard(storeId, cardId, useNotice(c)).catch(e => console.error('PKG_WALLET', e.message));
  }
  return r;
}

module.exports = { designOf, storeFor, pkgQr, isPkgQr, parsePkgQr, pageUrl, cardView, expired, passBody, pushCard, createWallet, useCard };
