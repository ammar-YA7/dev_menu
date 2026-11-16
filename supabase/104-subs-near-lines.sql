-- =====================================================================
-- DEV MENU — جمل القرب لبطاقة الاشتراكات (يكتبها الذكاء كل أسبوع)
--   لما العميل اللي عنده باقة يقرب من المحل، تطلع على شاشة قفل الآيفون جملة عن باقته،
--   وتتغير مع كل زيارة. {left} = كم باقي له في باقته.
-- آمن: يضيف أعمدة بس، ينفع يتشغّل أكثر من مرة.
-- =====================================================================
alter table public.clients add column if not exists subs_near_lines jsonb;
alter table public.clients add column if not exists subs_near_at timestamptz;
notify pgrst, 'reload schema';
