-- =====================================================================
-- DEV MENU — ربط واتساب: قائمة الانتظار مع الطلبات، ونص رسالة لكل واحد
--   channels:    pager = «طلبك جاهز» من البيجر · waitlist = «جاء دورك» من قائمة الانتظار
--   wl_message:  نص رسالة قائمة الانتظار ({name} {number} {store})
--   wl_template: Meta: قالب رسالة قائمة الانتظار
-- =====================================================================
alter table public.client_whatsapp add column if not exists channels text[] not null default '{pager}';
alter table public.client_whatsapp add column if not exists wl_message text;
alter table public.client_whatsapp add column if not exists wl_template text;
notify pgrst, 'reload schema';
