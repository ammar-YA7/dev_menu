// =====================================================================
// DEV MENU — الحذف النهائي لمحل (بياناته وحساب دخوله وملفاته)
//   ما يُستدعى مباشرة من زر «حذف»: الحذف صار أرشفة (deleted_at)، وهذا يشتغل بعد 30 يوم
//   من المهمة اليومية، أو لما المدير يضغط «احذف نهائياً الحين» على محل مؤرشف
// =====================================================================
const { rest, rpc, storage, storagePathFromUrl, BUCKET, ApiError } = require('./core');

const ARCHIVE_DAYS = 30;

async function purgeStore(id) {
  const client = (await rest(`clients?id=eq.${id}&select=id,deleted_at,logo_url,bg_image_url,bg_video_url,links_bg_image_url,links_bg_video_url`))[0];
  if (!client) throw new ApiError(404, 'المتجر غير موجود');
  if (!client.deleted_at) throw new ApiError(400, 'المتجر مو محذوف: احذفه أول (يتأرشف) وبعدها تقدر تمسحه نهائياً', 'NOT_ARCHIVED');
  const branches = await rest(`clients?parent_id=eq.${id}&select=id&limit=1`).catch(() => []);
  if (branches.length) throw new ApiError(400, 'المتجر له فروع، احذف الفروع أولاً', 'HAS_BRANCHES');
  // 1) نجمع مسارات الملفات قبل حذف البيانات
  const products = await rest(`products?client_id=eq.${id}&select=image_url`);
  const paths = new Set();
  // ملفات هذا المتجر فقط: الفرع يستخدم صور المتجر الرئيسي، فما نحذفها معه
  [client.logo_url, client.bg_image_url, client.bg_video_url, client.links_bg_image_url, client.links_bg_video_url, ...products.map(p => p.image_url)]
    .forEach(u => { const p = storagePathFromUrl(u); if (p && p.startsWith(`${id}/`)) paths.add(p); });
  try {
    const listed = await storage(`object/list/${BUCKET}`, { body: { prefix: `${id}/`, limit: 1000 } });
    (listed || []).forEach(f => { if (f && f.id && f.name) paths.add(`${id}/${f.name}`); });
  } catch (e) { console.warn('storage list failed', e.message); }

  // 2) حذف البيانات وحساب الدخول
  await rpc('server_delete_client', { p_client_id: id });

  // 3) حذف الملفات
  if (paths.size) {
    try { await storage(`object/${BUCKET}`, { method: 'DELETE', body: { prefixes: [...paths] } }); }
    catch (e) { console.warn('storage delete failed', e.message); }
  }
  return { ok: true, files: paths.size };
}

// المحلات اللي مرّ على أرشفتها 30 يوم: تنمسح نهائياً (من المهمة اليومية)
async function purgeExpired() {
  const before = new Date(Date.now() - ARCHIVE_DAYS * 864e5).toISOString();
  // الفروع أول (المتجر الرئيسي ما ينمسح وعنده فروع)
  const due = await rest(`clients?deleted_at=lt.${encodeURIComponent(before)}&select=id,name,parent_id&order=parent_id.desc.nullslast`).catch(() => []);
  const done = [];
  for (const c of due) {
    try {
      await purgeStore(c.id);
      done.push(c.id);
      await rest('admin_audit', { method: 'POST', body: { admin_email: 'system', action: 'purge', client_id: c.id, client_name: c.name || null, details: { reason: `${ARCHIVE_DAYS} يوم بعد الحذف` } } }).catch(() => {});
    } catch (e) { console.error('PURGE', c.id, e.message); }
  }
  return done;
}

module.exports = { purgeStore, purgeExpired, ARCHIVE_DAYS };
