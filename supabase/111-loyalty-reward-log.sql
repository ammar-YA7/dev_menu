-- =====================================================================
-- DEV MENU — تقرير المكافآت: اسم المكافأة اللي انصرفت ينحفظ مع الصرف
--   (لو غيّر صاحب المحل المكافأة بعدين، التقرير يعرف وش أخذ كل عميل وقتها)
-- =====================================================================
alter table public.loyalty_events add column if not exists reward text;
create index if not exists loyalty_events_rewards on public.loyalty_events (client_id, created_at desc) where kind in ('redeem', 'gift_redeem');
notify pgrst, 'reload schema';
