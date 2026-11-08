-- =====================================================================
-- DEV MENU — «فرّغ الصورة»: نسخة PNG بدون خلفية للطبق (للمنيو التفاعلي)
--   products.cutout_url: الصورة المفرّغة (تنمسح لما تتغيّر صورة الطبق)
--   clients.cutout_usage: عدّاد الشهر على المتجر الرئيسي { month: 'YYYY-MM', n }
-- =====================================================================
alter table public.products add column if not exists cutout_url text;
alter table public.clients add column if not exists cutout_usage jsonb;
notify pgrst, 'reload schema';
