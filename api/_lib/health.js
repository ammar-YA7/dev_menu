// =====================================================================
// DEV MENU — فحص يومي لصحة النظام، يرسل إيميل للإدارة (ADMIN_EMAIL) لو فيه شي يحتاج انتباه
//   • النسخة الاحتياطية الليلية ما نجحت من أكثر من 36 ساعة
//   • صور المنيو تعدّت 800MB (حد Supabase المجاني 1GB)
//   • قاعدة البيانات تعدّت 400MB (حد المجاني 500MB)
//   كل تنبيه ينرسل مرة وحدة بس (الإيميلات محدودة)، وما يرجع إلا لو انحلت المشكلة ورجعت من جديد
//   يشغّله subscriptions-cron كل يوم 9 الصبح
// =====================================================================
const { rest, rpc } = require('./core');
const { sendMail, mailConfigured } = require('./mail');

const MB = 1024 * 1024, HOUR = 36e5;
const LIMITS = { storage: 800 * MB, db: 400 * MB };
const BACKUP_MAX_AGE = 36 * HOUR;
const STATE_KEY = 'health_alerted';   // { backup: true, storage: true, db: true } = انرسل تنبيهه وما انحل للحين

const getSetting = async (key) => ((await rest(`app_settings?key=eq.${key}&select=value`))[0] || {}).value || null;
const setSetting = (key, value) => rest('app_settings?on_conflict=key', { method: 'POST', prefer: 'resolution=merge-duplicates', body: { key, value } });
const mb = (b) => `${Math.round(b / MB)}MB`;

async function checkHealth(now = Date.now()) {
  const usage = await rpc('server_usage');
  const backupAt = await getSetting('backup_last_at');
  let alerted = {};
  try { alerted = JSON.parse(await getSetting(STATE_KEY) || '{}') || {}; } catch {}
  const problems = {
    backup: !backupAt || now - Date.parse(backupAt) > BACKUP_MAX_AGE
      ? (backupAt ? `النسخة الاحتياطية الليلية ما نجحت من ${Math.round((now - Date.parse(backupAt)) / HOUR)} ساعة. افتح GitHub ← Actions ← Nightly backup وشوف سبب الفشل.`
        : 'ما فيه أي نسخة احتياطية ناجحة مسجّلة للحين. شغّل Nightly backup من GitHub ← Actions.') : null,
    storage: usage.storage_bytes > LIMITS.storage ? `صور المنيو وصلت ${mb(usage.storage_bytes)} من 1024MB المسموحة في Supabase المجاني. حان وقت الترقية لـ Pro.` : null,
    db: usage.db_bytes > LIMITS.db ? `قاعدة البيانات وصلت ${mb(usage.db_bytes)} من 500MB المسموحة في Supabase المجاني. حان وقت الترقية لـ Pro.` : null
  };
  // المشاكل الجديدة بس (اللي ما انرسل لها تنبيه)، واللي انحلت ننساها عشان لو رجعت يوصل تنبيه جديد
  const fresh = Object.keys(problems).filter(k => problems[k] && !alerted[k]);
  const next = Object.fromEntries(Object.keys(problems).filter(k => problems[k] && alerted[k]).map(k => [k, true]));
  const report = { storage: mb(usage.storage_bytes), db: mb(usage.db_bytes), backup_at: backupAt, problems: Object.keys(problems).filter(k => problems[k]), new: fresh };
  let sent = false;
  if (fresh.length) {
    if (!mailConfigured()) console.error('HEALTH_NO_MAIL', fresh);
    else sent = await sendMail({
      to: process.env.ADMIN_EMAIL || 'dmenu950@gmail.com', fromName: 'DEV MENU',
      subject: fresh.includes('backup') ? 'تنبيه: النسخة الاحتياطية ما اشتغلت' : 'تنبيه: قربنا من حدود Supabase',
      text: `${fresh.map(k => `• ${problems[k]}`).join('\n')}\n\nالاستخدام الحالي: الصور ${mb(usage.storage_bytes)}، قاعدة البيانات ${mb(usage.db_bytes)}.\nآخر نسخة احتياطية ناجحة: ${backupAt || 'ما فيه'}\n\nهذا التنبيه ينرسل مرة وحدة، وما يتكرر إلا لو انحلت المشكلة ورجعت.`
    });
    if (sent) fresh.forEach(k => { next[k] = true; });
  }
  if (JSON.stringify(next) !== JSON.stringify(alerted)) await setSetting(STATE_KEY, JSON.stringify(next)).catch(e => console.error('HEALTH_STATE', e.message));
  return { ...report, mailed: sent };
}

module.exports = { checkHealth, LIMITS };
