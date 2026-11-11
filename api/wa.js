// =====================================================================
// DEV MENU — صندوق رسائل الواتساب: خادم واتساب المحل (على كمبيوتره، بدون رابط عام) يسحب الرسائل من هنا
//   كل طلب لازم معه مفتاح السحب حق المحل (يطلعه المدير العام من «ربط واتساب» ← «صندوق رسائل»)
//     ترويسة apikey: dmwa_...   (أو x-api-key، أو Authorization: Bearer dmwa_...)
//
//   GET  /api/wa?action=pull   ← { messages: [{ id, number, text, kind }], poll_after: 3 }
//        الرسائل الجديدة (وأي رسالة انسحبت قبل دقيقة وما وصلنا عنها رد). الرسالة اللي عدّى عليها 10 دقايق ما تنرسل
//   POST /api/wa?action=ack    { id, ok, error }  أو  { results: [{ id, ok, error }] }
//        خادمهم يبلغنا: انرسلت (ok: true) أو فشلت (ok: false مع السبب)
//
// أرقام العملاء والطلبات تبقى عندنا، وخادمهم ياخذ الرقم والنص وقت الإرسال بس
// =====================================================================
const { handler, rest, q, ApiError, readBody } = require('./_lib/core');
const WA = require('./_lib/whatsapp');

const keyOf = (req) => {
  const h = req.headers || {};
  const bearer = String(h.authorization || '').replace(/^Bearer\s+/i, '');
  return String(h.apikey || h['x-api-key'] || bearer || '').trim();
};

async function storeOf(req) {
  const key = keyOf(req);
  if (!/^dmwa_[A-Za-z0-9_-]{20,64}$/.test(key)) throw new ApiError(401, 'مفتاح السحب ناقص أو غير صحيح', 'BAD_KEY');
  const cfg = (await rest(`client_whatsapp?pull_key_hash=eq.${WA.pullHash(key)}&provider=eq.outbox&select=client_id,enabled`))[0];
  if (!cfg) throw new ApiError(401, 'مفتاح السحب غير صحيح أو انلغى', 'BAD_KEY');
  return cfg;
}

module.exports = handler(['GET', 'POST'], async (req) => {
  const action = req.query.action;
  const cfg = await storeOf(req);
  const sid = Number(cfg.client_id);
  const now = new Date();

  if (action === 'pull' && req.method === 'GET') {
    await rest(`client_whatsapp?client_id=eq.${sid}`, { method: 'PATCH', body: { pull_seen_at: now.toISOString() } }).catch(() => {});
    if (!cfg.enabled) return { messages: [], poll_after: 15, paused: true };
    // اللي عدّى عليها 10 دقايق: ما تنرسل
    const old = new Date(now - WA.OUTBOX_TTL_MS).toISOString();
    await rest(`whatsapp_outbox?client_id=eq.${sid}&status=in.(pending,sending)&created_at=lt.${q(old)}`, { method: 'PATCH', body: { status: 'expired' } }).catch(() => {});
    // الجديدة، واللي انسحبت قبل دقيقة وما رجع عنها رد (يمكن خادمهم انطفى وهو يرسل)
    const stale = new Date(now - 60e3).toISOString();
    const rows = await rest(`whatsapp_outbox?client_id=eq.${sid}&or=${q(`(status.eq.pending,and(status.eq.sending,claimed_at.lt.${stale}))`)}&order=id.asc&limit=20&select=id,phone,body,kind`);
    if (rows.length) await rest(`whatsapp_outbox?id=in.(${rows.map(r => Number(r.id)).join(',')})&client_id=eq.${sid}`, { method: 'PATCH', body: { status: 'sending', claimed_at: now.toISOString() } });
    return { messages: rows.map(r => ({ id: r.id, number: r.phone, text: r.body, kind: r.kind })), poll_after: 3 };
  }

  if (action === 'ack' && req.method === 'POST') {
    const b = readBody(req);
    const list = (Array.isArray(b.results) ? b.results : [b]).slice(0, 50).filter(x => x && Number.isInteger(Number(x.id)));
    if (!list.length) throw new ApiError(400, 'أرسل id ونتيجة الإرسال (ok)');
    let sent = 0, failed = 0;
    for (const x of list) {
      const ok = x.ok === true;
      const rows = await rest(`whatsapp_outbox?id=eq.${Number(x.id)}&client_id=eq.${sid}&status=in.(pending,sending)`, {
        method: 'PATCH', prefer: 'return=representation',
        body: ok ? { status: 'sent', sent_at: now.toISOString(), error: null } : { status: 'failed', error: String(x.error || 'فشل الإرسال').slice(0, 200) }
      });
      if (rows.length) ok ? sent++ : failed++;
    }
    const last = list[list.length - 1];
    await rest(`client_whatsapp?client_id=eq.${sid}`, { method: 'PATCH', body: last.ok === true ? { last_sent_at: now.toISOString(), last_error: null } : { last_error: `${now.toISOString().slice(0, 16)} ${String(last.error || 'فشل الإرسال')}`.slice(0, 220) } }).catch(() => {});
    return { ok: true, sent, failed };
  }

  throw new ApiError(404, 'طلب غير معروف. المتاح: pull و ack', 'UNKNOWN');
});
