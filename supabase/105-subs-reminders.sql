-- =====================================================================
-- DEV MENU — تذكيرات بطاقة الاشتراكات (رسائل تلقائية على بطاقة المحفظة)
--   1) غاب وعنده رصيد: «باقي لك 12 وجبة في باقتك»، مرة لكل غيبة
--   2) قرب انتهاء الباقة: قبل الانتهاء بأيام، مرة وحدة للباقة
--   3) التجديد: خلصت باقته أو انتهت وما جدّد، مرة وحدة للباقة
--   clients.subs_remind: إعدادات صاحب المحل { away:{on,days,text}, expiry:{on,days,text}, renew:{on,days,text} }
--   loyalty_pkg_cards.remind_*_at: متى وصلته كل رسالة (عشان ما تتكرر)
-- آمن: يضيف أعمدة بس، ينفع يتشغّل أكثر من مرة.
-- =====================================================================
alter table public.clients add column if not exists subs_remind jsonb;
alter table public.loyalty_pkg_cards add column if not exists remind_away_at timestamptz;
alter table public.loyalty_pkg_cards add column if not exists remind_expiry_at timestamptz;
alter table public.loyalty_pkg_cards add column if not exists remind_renew_at timestamptz;
notify pgrst, 'reload schema';
