// =====================================================================
// DEV MENU — «فرّغ الصورة»: نشيل خلفية صورة الطبق بخدمة خارجية، ونحفظ نسخة PNG شفافة
//   Photoroom (PHOTOROOM_API_KEY) أول، وremove.bg (REMOVEBG_API_KEY) بديل.
//   الصورة الأصلية تبقى للمنيو العادي، والمفرّغة (products.cutout_url) للمنيو التفاعلي
// =====================================================================
const { ApiError, SUPABASE_URL, BUCKET } = require('./core');

const CUTOUT_MONTHLY = 150;   // لكل متجر رئيسي بالشهر (يحمينا من تكلفة مفتوحة)
const MAX_BYTES = 12 * 1024 * 1024;

const provider = () => process.env.PHOTOROOM_API_KEY ? 'photoroom' : process.env.REMOVEBG_API_KEY ? 'removebg' : '';
const configured = () => !!provider();

// نقبل بس صور تخزيننا (ما نجيب روابط من برا)
const ourImage = (url) => typeof url === 'string' && url.startsWith(`${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`);

async function removeBackground(imageUrl) {
  if (!configured()) throw new ApiError(503, 'خدمة تفريغ الصور غير مفعّلة حالياً', 'CUTOUT_OFF');
  if (!ourImage(imageUrl)) throw new ApiError(400, 'الصورة غير تابعة لمتجرك');
  const src = await fetch(imageUrl);
  if (!src.ok) throw new ApiError(502, 'تعذر قراءة صورة الطبق');
  const buf = Buffer.from(await src.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new ApiError(400, 'الصورة كبيرة، ارفع صورة أصغر');
  const type = src.headers.get('content-type') || 'image/jpeg';
  const form = new FormData();
  let r;
  if (provider() === 'photoroom') {
    form.append('image_file', new Blob([buf], { type }), 'dish');
    form.append('format', 'png');
    form.append('crop', 'true');   // نقص الفراغ الشفاف حول الطبق
    r = await fetch('https://sdk.photoroom.com/v1/segment', { method: 'POST', headers: { 'x-api-key': process.env.PHOTOROOM_API_KEY }, body: form });
  } else {
    form.append('image_file', new Blob([buf], { type }), 'dish');
    form.append('size', 'auto');
    form.append('format', 'png');
    form.append('crop', 'true');
    r = await fetch('https://api.remove.bg/v1.0/removebg', { method: 'POST', headers: { 'X-Api-Key': process.env.REMOVEBG_API_KEY }, body: form });
  }
  if (!r.ok) {
    const why = await r.text().catch(() => '');
    console.error('CUTOUT', provider(), r.status, why.slice(0, 300));
    if (r.status === 402 || r.status === 429) throw new ApiError(503, 'خدمة التفريغ مشغولة الحين، جرّب بعد شوي', 'CUTOUT_BUSY');
    throw new ApiError(502, 'ما قدرنا نفرّغ هالصورة، جرّب صورة أوضح للطبق');
  }
  return Buffer.from(await r.arrayBuffer());
}

// عدّاد الشهر على المتجر الرئيسي: { month: '2026-11', n: 12 }
function usageLeft(usage, month) {
  const n = usage && usage.month === month ? Number(usage.n) || 0 : 0;
  return { n, left: Math.max(0, CUTOUT_MONTHLY - n) };
}

module.exports = { removeBackground, configured, usageLeft, CUTOUT_MONTHLY };
