-- =====================================================================
-- DEV MENU — «كيف سمعت عنا؟» وقت التسجيل
--   clients.heard_from: المصدر (instagram, tiktok, snapchat, google, x, friend, visit, other)
--   clients.heard_from_note: لو اختار «أخرى» يكتب وين (اختياري)
-- =====================================================================
alter table public.clients add column if not exists heard_from text;
alter table public.clients add column if not exists heard_from_note text;
notify pgrst, 'reload schema';
