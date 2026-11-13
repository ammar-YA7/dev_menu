// =====================================================================
// DEV MENU — الحذف النهائي لمحل (بياناته وحساب دخوله وملفاته)
//   ما يُستدعى مباشرة من زر «حذف»: الحذف صار أرشفة (deleted_at)، وهذا يشتغل بعد 30 يوم
//   من المهمة اليومية، أو لما المدير يضغط «احذف نهائياً الحين» على محل مؤرشف
// =====================================================================
const { rest, rpc, storage, storagePathFromUrl, BUCKET, ApiError, int } = require('./core');

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

// ─── الأرشفة (الحذف المؤجل) والاسترجاع ───
// المحل يتوقف ويختفي، ويتمسح نهائياً بعد 30 يوم. الفرع ينفصل عن حسابه وقت الأرشفة
// (ما ينحسب في السعر ولا يتشغّل مع الحساب)، و deleted_info يحفظ وش كان عليه عشان الاسترجاع
// by: 'owner' (صاحب المحل حذف حسابه) أو 'admin'
async function archiveOne(c, by, extra = {}) {
  const now = new Date().toISOString();
  const info = { was_active: c.is_active !== false, parent_id: c.parent_id || null, by, ...extra };
  await rest(`clients?id=eq.${c.id}`, { method: 'PATCH', body: { deleted_at: now, deleted_info: info, is_active: false, parent_id: null } });
}
// الحساب كله: المتجر الرئيسي وفروعه
async function archiveAccount(id, by) {
  const main = (await rest(`clients?id=eq.${id}&select=id,parent_id,is_active,deleted_at`))[0];
  if (!main) throw new ApiError(404, 'المتجر غير موجود');
  if (main.deleted_at) return main;
  const kids = await rest(`clients?parent_id=eq.${id}&deleted_at=is.null&select=id,parent_id,is_active`);
  for (const k of kids) await archiveOne(k, by, { with_account: true });
  await archiveOne(main, by);
  return (await rest(`clients?id=eq.${id}&select=*`))[0];
}
async function restoreOne(c, parentId) {
  const info = c.deleted_info || {};
  await rest(`clients?id=eq.${c.id}`, { method: 'PATCH', body: { deleted_at: null, deleted_info: null, is_active: info.was_active !== false, parent_id: parentId || null } });
}
// يرجّع المحل مثل ما كان، ولو متجر رئيسي يرجّع معه الفروع اللي انحذفت معه
async function restoreAccount(id) {
  const c = (await rest(`clients?id=eq.${id}&select=id,deleted_at,deleted_info`))[0];
  if (!c) throw new ApiError(404, 'المتجر غير موجود');
  if (!c.deleted_at) return (await rest(`clients?id=eq.${id}&select=*`))[0];
  const info = c.deleted_info || {};
  if (info.parent_id) {
    const p = (await rest(`clients?id=eq.${int(info.parent_id)}&select=id,deleted_at`).catch(() => []))[0];
    if (!p) throw new ApiError(400, 'المتجر الرئيسي لهذا الفرع انحذف نهائياً، ما نقدر نرجّع الفرع', 'PARENT_GONE');
    if (p.deleted_at) throw new ApiError(400, 'استرجع المتجر الرئيسي أول، وبعدها الفرع', 'PARENT_ARCHIVED');
    await restoreOne(c, p.id);
  } else {
    await restoreOne(c, null);
    const kids = await rest(`clients?deleted_at=not.is.null&deleted_info->>parent_id=eq.${id}&deleted_info->>with_account=eq.true&select=id,deleted_info`).catch(() => []);
    for (const k of kids) await restoreOne(k, id);
  }
  return (await rest(`clients?id=eq.${id}&select=*`))[0];
}
const purgeDate = (deletedAt) => new Date(Date.parse(deletedAt) + ARCHIVE_DAYS * 864e5);

module.exports = { purgeStore, purgeExpired, archiveOne, archiveAccount, restoreAccount, purgeDate, ARCHIVE_DAYS };
