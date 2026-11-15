// =====================================================================
// DEV MENU — API صاحب المتجر والكاشير: الباقات المدفوعة مسبقاً (ضمن بطاقة الولاء)
//   GET  loyalty-pkg            الباقات المعرّفة وباقات الزبائن
//   POST loyalty-pkg-plan       إضافة/تعديل باقة          (صاحب المحل)
//   POST loyalty-pkg-plan-off   إيقاف باقة                (صاحب المحل)
//   POST loyalty-pkg-sell       باقة لزبون بعد ما يدفع    (الكاشير أو صاحب المحل)
//   POST loyalty-pkg-use        مسح كود الباقة: ينقص واحد (الكاشير أو صاحب المحل)
//   POST loyalty-pkg-undo       تراجع عن مسح بالغلط
//   POST loyalty-pkg-edit       تعديل الرصيد أو الانتهاء  (صاحب المحل)
//   POST loyalty-pkg-delete     حذف باقة زبون             (صاحب المحل)
// =====================================================================
const crypto = require('crypto');
const { rest, rpc, ApiError, str, int, waNumber, context, familyIds, poke, topic, PLANS, parseMemberQr, pushWalletCards } = require('./shared');
const NEXT = require('./next');
const P = require('../packages');
const wallet = require('../wallet');

const MAX_PLANS = 20;
const cleanName = (v, field, min = 2, max = 40) => {
  const s = str(v, max, field).replace(/\s+/g, ' ');
  if (s.length < min) throw new ApiError(400, `اكتب ${field}`);
  return s;
};
const plansOf = (sid) => rest(`loyalty_pkg_plans?client_id=eq.${sid}&active=is.true&select=id,name,uses,days,price&order=id.asc`);

module.exports.pre = async function pre(action, req) {
  if (action === 'loyalty-pkg' && req.method === 'GET') {
    const { store, desk } = await context(req);
    if (!PLANS.has(store, 'loyalty')) throw new ApiError(403, 'الباقات ضمن بطاقة الولاء، وهي مو ضمن باقتك', 'ADDON_OFF');
    const [plans, cards] = await Promise.all([
      plansOf(store.id),
      // الكاشير يحتاج الباقات بس (يبيع ويمسح)، والقائمة الكاملة لصاحب المحل
      desk ? Promise.resolve([]) : rest(`loyalty_pkg_cards?client_id=eq.${store.id}&select=*&order=created_at.desc&limit=300`)
    ]);
    return { plans, cards: cards.map(c => ({ ...P.cardView(c), phone: c.phone || null })) };
  }
  return NEXT;
};

module.exports.post = async function post(action, req, b, env) {
  if (!String(action || '').startsWith('loyalty-pkg')) return NEXT;
  const { store, here, sid } = env;
  const desk = !!req.headers['x-dm-desk'];
  const ownerOnly = () => { if (desk) throw new ApiError(403, 'هذي من صلاحيات صاحب المحل', 'OWNER_ONLY'); };

  if (action === 'loyalty-pkg-plan') {
    ownerOnly();
    const name = cleanName(b.name, 'اسم الباقة');
    const uses = int(b.uses);
    if (!Number.isInteger(uses) || uses < 1 || uses > 1000) throw new ApiError(400, 'اكتب عدد مرات الاستخدام (من 1 إلى 1000)');
    const days = b.days === '' || b.days == null ? null : int(b.days);
    if (days !== null && (!Number.isInteger(days) || days < 1 || days > 3650)) throw new ApiError(400, 'مدة الباقة بالأيام غير صحيحة');
    const price = b.price === '' || b.price == null ? null : Number(b.price);
    if (price !== null && (!Number.isFinite(price) || price < 0 || price > 100000)) throw new ApiError(400, 'سعر الباقة غير صحيح');
    const body = { name, uses, days, price };
    const id = b.id == null ? null : int(b.id);
    if (id) {
      const rows = await rest(`loyalty_pkg_plans?id=eq.${id}&client_id=eq.${sid}`, { method: 'PATCH', body, prefer: 'return=representation' });
      if (!rows.length) throw new ApiError(404, 'الباقة غير موجودة');
    } else {
      if ((await plansOf(sid)).length >= MAX_PLANS) throw new ApiError(400, `الحد ${MAX_PLANS} باقة`);
      await rest('loyalty_pkg_plans', { method: 'POST', body: { client_id: sid, ...body } });
    }
    return { plans: await plansOf(sid) };
  }

  if (action === 'loyalty-pkg-plan-off') {
    ownerOnly();
    await rest(`loyalty_pkg_plans?id=eq.${int(b.id)}&client_id=eq.${sid}`, { method: 'PATCH', body: { active: false } });
    return { plans: await plansOf(sid) };
  }

  if (action === 'loyalty-pkg-sell') {
    const plan = (await rest(`loyalty_pkg_plans?id=eq.${int(b.plan_id)}&client_id=eq.${sid}&active=is.true&select=*`))[0];
    if (!plan) throw new ApiError(404, 'اختر باقة');
    // الطريقة الأساسية: الكاشير يمسح كود بطاقة الولاء حق الزبون، فتنسجل الباقة على عضويته (اسمه وجواله منها)
    let member = null;
    if (b.member_qr || b.member_no) {
      const mid = b.member_qr ? parseMemberQr(await familyIds(store), b.member_qr) : null;
      const no = b.member_qr ? null : parseInt(String(b.member_no).replace(/[^\d]/g, ''), 10);
      member = mid ? (await rest(`loyalty_cards?id=eq.${mid}&client_id=eq.${sid}&select=*`))[0]
        : Number.isInteger(no) ? (await rest(`loyalty_cards?member_no=eq.${no}&client_id=eq.${sid}&select=*`))[0] : null;
      if (!member) throw new ApiError(404, b.member_qr ? 'هذا مو كود بطاقة من محلنا' : 'ما لقينا عضو بهذا الرقم', 'NO_MEMBER');
    }
    const name = member ? (member.name || `عضو #${member.member_no}`) : cleanName(b.name, 'اسم الزبون');
    let phone = member ? (member.phone || null) : null;
    if (!member && String(b.phone || '').trim()) { try { phone = waNumber(b.phone); } catch { throw new ApiError(400, 'رقم الجوال غير صحيح'); } }
    const card = (await rest('loyalty_pkg_cards', {
      method: 'POST', prefer: 'return=representation',
      body: {
        client_id: sid, plan_id: plan.id, plan_name: plan.name, name, phone, total: plan.uses, remaining: plan.uses,
        expires_at: plan.days ? new Date(Date.now() + plan.days * 864e5).toISOString() : null,
        token: crypto.randomBytes(18).toString('base64url'), branch_id: here.id, lang: member ? (member.lang || 'ar') : (b.lang === 'en' ? 'en' : 'ar'),
        loyalty_card_id: member ? member.id : null
      }
    }))[0];
    poke(topic('owner', sid), 'loyalty').catch(() => {});
    // عضو عنده بطاقة في المحفظة: الباقة تطلع فيها على طول، وما يحتاج بطاقة ثانية
    if (member && member.wallet_serial) await pushWalletCards(sid, { cardIds: [member.id], notice: `انضافت لك باقة ${card.plan_name}: ${card.total} مرة` }).catch(() => 0);
    return { card: P.cardView(card), url: P.pageUrl(store, card), phone, member: member ? { no: member.member_no, in_wallet: !!member.wallet_serial } : null };
  }

  if (action === 'loyalty-pkg-use') {
    let id = null;
    if (b.qr) { id = P.parsePkgQr(await familyIds(store), b.qr); if (!id) throw new ApiError(400, 'هذا مو كود باقة من محلنا', 'BAD_QR'); }
    else id = int(b.card_id);
    const card = Number.isInteger(id) ? (await rest(`loyalty_pkg_cards?id=eq.${id}&client_id=eq.${sid}&select=*`))[0] : null;
    if (!card) throw new ApiError(404, 'ما لقينا الباقة', 'NO_PKG');
    const r = await P.useCard(sid, card.id, here.id);
    const fresh = (await rest(`loyalty_pkg_cards?id=eq.${card.id}&select=*`))[0];
    const note = r.ok ? null : r.reason === 'EMPTY' ? 'الباقة خلصت، ما باقي فيها رصيد' : r.reason === 'EXPIRED' ? 'الباقة منتهية' : 'ما انخصمت';
    return { ok: !!r.ok, use_id: r.use_id || null, reason: r.reason || null, note, card: P.cardView(fresh) };
  }

  if (action === 'loyalty-pkg-undo') {
    const r = await rpc('server_pkg_undo', { p_use: int(b.use_id), p_client: sid });
    if (!r.ok) throw new ApiError(409, 'ما نقدر نتراجع عنها (مرّ عليها أكثر من 10 دقائق)', 'UNDO_LATE');
    P.pushCard(sid, r.card_id).catch(() => {});
    const fresh = (await rest(`loyalty_pkg_cards?id=eq.${r.card_id}&select=*`))[0];
    return { card: P.cardView(fresh) };
  }

  if (action === 'loyalty-pkg-edit') {
    ownerOnly();
    const card = (await rest(`loyalty_pkg_cards?id=eq.${int(b.id)}&client_id=eq.${sid}&select=*`))[0];
    if (!card) throw new ApiError(404, 'الباقة غير موجودة');
    const patch = {};
    if (b.remaining !== undefined) {
      const n = int(b.remaining);
      if (!Number.isInteger(n) || n < 0 || n > 1000) throw new ApiError(400, 'الرصيد غير صحيح');
      patch.remaining = n; if (n > card.total) patch.total = n;
    }
    if (b.expires_at !== undefined) {
      if (b.expires_at === null || b.expires_at === '') patch.expires_at = null;
      else { const t = Date.parse(b.expires_at); if (!Number.isFinite(t)) throw new ApiError(400, 'تاريخ الانتهاء غير صحيح'); patch.expires_at = new Date(t).toISOString(); }
    }
    if (patch.remaining !== undefined && patch.remaining !== card.remaining) {
      await rest('loyalty_pkg_uses', { method: 'POST', body: { client_id: sid, card_id: card.id, branch_id: here.id, delta: patch.remaining - card.remaining } }).catch(() => {});
    }
    const fresh = (await rest(`loyalty_pkg_cards?id=eq.${card.id}`, { method: 'PATCH', body: patch, prefer: 'return=representation' }))[0];
    P.pushCard(sid, card.id).catch(() => {});
    return { card: P.cardView(fresh) };
  }

  if (action === 'loyalty-pkg-delete') {
    ownerOnly();
    const card = (await rest(`loyalty_pkg_cards?id=eq.${int(b.id)}&client_id=eq.${sid}&select=id,wallet_serial`))[0];
    if (!card) throw new ApiError(404, 'الباقة غير موجودة');
    if (card.wallet_serial) await wallet.revokePass(card.wallet_serial).catch(() => {});
    await rest(`loyalty_pkg_cards?id=eq.${card.id}`, { method: 'DELETE' });
    return { deleted: true };
  }

  return NEXT;
};
