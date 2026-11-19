-- =====================================================================
-- DEV MENU — رسالة شكر واتساب بعد ما يستلم العميل طلبه (المحل المربوط بواتساب)
--   thanks: مفعّلة أو لا
--   thanks_msgs: صيغ صاحب الربط (سطر لكل صيغة، وتنختار وحدة عشوائياً). فاضي = صيغ جاهزة متنوعة
--   pager_tickets.wa_thanks: حالة رسالة الشكر للرقم (مرة وحدة بس لكل رقم)
-- =====================================================================
alter table public.client_whatsapp add column if not exists thanks boolean not null default false;
alter table public.client_whatsapp add column if not exists thanks_msgs text;
alter table public.pager_tickets add column if not exists wa_thanks text;
notify pgrst, 'reload schema';
