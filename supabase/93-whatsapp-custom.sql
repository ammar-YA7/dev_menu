-- =====================================================================
-- DEV MENU — ربط واتساب: مزوّدين إضافيين
--   wasender: WasenderAPI (مفتاح الجلسة)
--   custom:   خادم خاص بالمحل (مثلاً Edge Function في Supabase حقهم أو API عندهم)
--     api_url:     رابط الإرسال (https)
--     auth_style:  bearer = Authorization: Bearer <المفتاح>
--                  supabase = apikey + Authorization: Bearer <المفتاح> (لـ Supabase)
--                  header = اسم ترويسة خاص (auth_header) قيمتها المفتاح
--     body_tpl:    شكل الطلب (JSON) بالمتغيرات {phone} {phone_plus} {message} {number} {store}
-- =====================================================================
alter table public.client_whatsapp drop constraint if exists client_whatsapp_provider_check;
alter table public.client_whatsapp add constraint client_whatsapp_provider_check
  check (provider in ('meta', 'ultramsg', 'greenapi', 'wasender', 'custom'));
alter table public.client_whatsapp add column if not exists auth_style text not null default 'bearer';
alter table public.client_whatsapp drop constraint if exists client_whatsapp_auth_style_check;
alter table public.client_whatsapp add constraint client_whatsapp_auth_style_check check (auth_style in ('bearer', 'supabase', 'header'));
alter table public.client_whatsapp add column if not exists auth_header text;
alter table public.client_whatsapp add column if not exists body_tpl text;
notify pgrst, 'reload schema';
