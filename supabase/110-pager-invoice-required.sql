-- =====================================================================
-- DEV MENU — رقم الفاتورة إجباري في صفحة البيجر (خيار لكل محل)
--   لو مفعّل: يختفي «ما عندي فاتورة»، والخادم ما يعطي رقم بدون فاتورة
-- =====================================================================
alter table public.clients add column if not exists pager_invoice_req boolean not null default false;
notify pgrst, 'reload schema';
