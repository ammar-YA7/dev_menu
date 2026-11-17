// =====================================================================
// DEV MENU — فحص يومي لصحة النظام، يرسل إيميل للإدارة (ADMIN_EMAIL) لو فيه شي يحتاج انتباه
//   • النسخة الاحتياطية الليلية ما نجحت من أكثر من 36 ساعة (تنبيه كل يوم لين تنصلح)
//   • صور المنيو تعدّت 800MB (حد Supabase المجاني 1GB)
//   • قاعدة البيانات تعدّت 400MB (حد المجاني 500MB)
//   تنبيهات المساحة مرة بالأسبوع بالكثير. يشغّله subscriptions-cron كل يوم 9 الصبح
// =====================================================================
const { rest, rpc } = require('./core');
const { sendMail, mailConfigured } = require('./mail');

const MB = 1024 * 1024, HOUR = 36e5;
const LIMITS = { storage: 800 * MB, db: 400 * MB };
const BACKUP_MAX_AGE = 36 * HOUR;
const USAGE_ALERT_GAP = 7 * 24 * HOUR;

const setting = async (key) => ((await rest(`app_settings?key=eq.${key}&select=value`))[0] || {}).value || null;
const save = (key, value) => rest('app_settings?on_conflict=key', { method: 'POST', prefer: 'resolution=merge-duplicates', body: { key, value } });
const mb = (b) => `${Math.round(b / MB)}MB`;

async function checkHealth(now = Date.now()) {
  const usage = await rpc('server_usage');
  const backupAt = await setting('backup_last_at');
  const lastUsageAlert = Date.parse(await setting('health_usage_alert_at') || 0) || 0;
  const issues = [];
  const backupOld = !backupAt || now - Date.parse(backupAt) > BACKUP_MAX_AGE;
  if (backupOld) issues.push(backupAt
    ? `النسخة الاحتياطية الليلية ما نجحت من ${Math.round((now - Date.parse(backupAt)) / HOUR)} ساعة. افتح GitHub ← Actions ← Nightly backup وشوف سبب الفشل.`
    : 'ما فيه أي نسخة احتياطية ناجحة مسجّلة للحين. شغّل Nightly backup من GitHub ← Actions.');
  const usageIssues = [];
  if (usage.storage_bytes > LIMITS.storage) usageIssues.push(`صور المنيو وصلت ${mb(usage.storage_bytes)} من 1024MB المسموحة في Supabase المجاني. حان وقت الترقية لـ Pro.`);
  if (usage.db_bytes > LIMITS.db) usageIssues.push(`قاعدة البيانات وصلت ${mb(usage.db_bytes)} من 500MB المسموحة في Supabase المجاني. حان وقت الترقية لـ Pro.`);
  const sendUsage = usageIssues.length && now - lastUsageAlert > USAGE_ALERT_GAP;
  if (sendUsage) issues.push(...usageIssues);
  const report = { storage: mb(usage.storage_bytes), db: mb(usage.db_bytes), backup_at: backupAt, issues: issues.length };
  if (!issues.length) return report;
  if (!mailConfigured()) { console.error('HEALTH_NO_MAIL', issues); return report; }
  const sent = await sendMail({
    to: process.env.ADMIN_EMAIL || 'dmenu950@gmail.com', fromName: 'DEV MENU',
    subject: backupOld ? 'تنبيه: النسخة الاحتياطية ما اشتغلت' : 'تنبيه: قربنا من حدود Supabase',
    text: `${issues.map(i => `• ${i}`).join('\n')}\n\nالاستخدام الحالي: الصور ${mb(usage.storage_bytes)}، قاعدة البيانات ${mb(usage.db_bytes)}.\nآخر نسخة احتياطية ناجحة: ${backupAt || 'ما فيه'}`
  });
  if (sent && sendUsage) await save('health_usage_alert_at', new Date(now).toISOString()).catch(() => {});
  return { ...report, mailed: sent };
}

module.exports = { checkHealth, LIMITS };
