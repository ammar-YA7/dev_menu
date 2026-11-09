-- =====================================================================
-- DEV MENU — «فرّغ الصورة»: نسخة بدون خلفية للطبق (للمنيو التفاعلي)
--   products.cutout_url: الصورة المفرّغة (تنمسح لما تتغيّر صورة الطبق)
--   التفريغ نفسه يصير في متصفح صاحب المحل بموديل مجاني (ormbg)، فما فيه تكلفة ولا عدّاد
-- =====================================================================
alter table public.products add column if not exists cutout_url text;
alter table public.clients drop column if exists cutout_usage;
notify pgrst, 'reload schema';
