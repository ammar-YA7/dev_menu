-- =====================================================================
-- DEV MENU — ربط واتساب: الإرسال برقم الفاتورة (الخادم الخاص يجيب بيانات العميل من قاعدته)
--   send_mode: phone   = ترسل لما يكتب العميل جواله في البيجر
--              invoice = ترسل لكل رقم عليه فاتورة (أو جوال): خادم المزوّد يجيب اسم العميل وجواله برقم الفاتورة
--   ask_phone: خانة الجوال تظهر في صفحة البيجر أو لا (لو خادمهم عنده جوال العميل)
-- =====================================================================
alter table public.client_whatsapp add column if not exists send_mode text not null default 'phone';
alter table public.client_whatsapp drop constraint if exists client_whatsapp_send_mode_check;
alter table public.client_whatsapp add constraint client_whatsapp_send_mode_check check (send_mode in ('phone', 'invoice'));
alter table public.client_whatsapp add column if not exists ask_phone boolean not null default true;
notify pgrst, 'reload schema';
