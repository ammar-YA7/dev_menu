// =====================================================================
// DEV MENU — المساعد الذكي لبطاقة الولاء (يشتغل كل يوم الساعة 4 العصر بتوقيت الرياض)
//   GET /api/loyalty-cron?key=<cron_key>
// وبعده "وحشتنا" التلقائية لبطاقة النداء (المحل اللي عنده البيجر بدون ولاء، ومفعّلها)
// يشغّله pg_cron داخل Supabase (35-loyalty-ai.sql). لكل متجر شغّل المساعد:
// يكتب رسائل عفوية للزبائن اللي يستاهلون (غايب، باقي له ختم، مكافأته جاهزة، زيارة ثانية) ويوصلها لمحفظتهم.
// =====================================================================
const { rest, handler } = require('./_lib/core');
const { assertCronKey } = require('./_lib/cron');
const { runAssistant, pushWalletCards } = require('./_lib/loyalty-assistant');
const { runWinback } = require('./_lib/winback');

module.exports = handler(['GET', 'POST'], async (req) => {
  await assertCronKey(req);
  const started = Date.now();
  // الفروع ولاءها على المحل الرئيسي، فالمساعد يشتغل على الرئيسي بس
  // مؤقت للفحص: شكل رد شركة المحفظة لبطاقة وحدة (المفاتيح والأجهزة بس)
  if (req.query.only === 'passinfo') {
    const d = await require('./_lib/wallet').getPass(String(req.query.serial || '')).catch(e => ({ error: e.message, status: e.status }));
    const walk = (o, depth = 0) => o && typeof o === 'object' && depth < 3 ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Array.isArray(v) ? `array(${v.length}) ${JSON.stringify(v[0] || null).slice(0, 200)}` : typeof v === 'object' ? walk(v, depth + 1) : typeof v === 'string' ? v.slice(0, 40) : v])) : o;
    return walk(d);
  }
  const stores = await rest('clients?loyalty_enabled=is.true&loyalty_ai=is.true&is_active=is.true&parent_id=is.null&select=id&order=id.asc&limit=200');
  // بطاقات المحفظة اللي فشل تحديثها (مثل رصيد خدمة المحفظة الشهري خلص): نعيد إرسالها بعدد أختامها الصحيح
  const retry = { cards: 0, sent: 0 };
  try {
    const failed = await rest(`loyalty_cards?wallet_serial=not.is.null&wallet_error=like.429*&select=id,client_id&order=last_stamp_at.desc.nullslast&limit=${req.query.only === 'wallet' ? 1000 : 300}`);
    const byStore = {};
    failed.forEach(c => (byStore[c.client_id] = byStore[c.client_id] || []).push(c.id));
    for (const [sid, ids] of Object.entries(byStore)) {
      if (Date.now() - started > (req.query.only === 'wallet' ? 50e3 : 20e3)) break;
      retry.cards += ids.length;
      retry.sent += await pushWalletCards(Number(sid), { cardIds: ids }).catch(() => 0);
      if (!retry.sent) break;   // لسا الرصيد خالص: ما نكمل ونصرف الوقت
    }
  } catch (e) { retry.error = e.message; }
  console.log('WALLET_RETRY', JSON.stringify(retry));
  // ?only=wallet: إعادة بطاقات المحفظة بس (بدون رسائل المساعد ولا وحشتنا، عشان ما تتكرر للزبائن)
  if (req.query.only === 'wallet') return { retry };
  const results = [];
  for (const s of stores) {
    if (Date.now() - started > 45e3) break;   // الباقي ياخذ دوره بكرة
    try { results.push({ store: s.id, ...(await runAssistant(s.id, { maxGuests: 20 })) }); }
    catch (e) { results.push({ store: s.id, error: e.code || e.message }); }
  }
  console.log('LOYALTY_AI', JSON.stringify(results));
  const wbStores = await rest(`clients?pager_winback->>enabled=eq.true&is_active=is.true&parent_id=is.null&select=*&order=id.asc&limit=200`).catch(() => []);
  const winback = [];
  for (const s of wbStores) {
    if (Date.now() - started > 52e3) break;
    try { winback.push({ store: s.id, ...(await runWinback(s)) }); }
    catch (e) { winback.push({ store: s.id, error: e.code || e.message }); }
  }
  console.log('PAGER_WINBACK', JSON.stringify(winback));
  return { stores: stores.length, retry, results, winback };
});

module.exports.config = { maxDuration: 60 };
