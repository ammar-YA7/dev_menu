-- =====================================================================
-- DEV MENU — ربط واتساب خارجي لمحل معيّن (المدير العام يضيفه من لوحته)
--   client_whatsapp: مزوّد الواتساب ومفتاحه لكل محل مربوط (المفتاح مشفّر من الخادم)
--     الجدول للخادم فقط: ما له سياسات قراءة، ولا يطلع في public_clients
--   pager_tickets.wa_phone: جوال العميل (اختياري) عشان توصله رسالة لما يجهز طلبه
--   pager_tickets.wa_status: نتيجة آخر رسالة (sent / failed: السبب)
-- =====================================================================
create table if not exists public.client_whatsapp (
  client_id     bigint primary key references public.clients(id) on delete cascade,
  provider      text not null check (provider in ('meta', 'ultramsg', 'greenapi')),
  instance      text,                 -- UltraMsg: instance id · Green API: idInstance · Meta: Phone number ID
  api_url       text,                 -- Green API: apiUrl الخاص بالحساب (اختياري)
  token_enc     text not null,        -- المفتاح مشفّر (AES-256-GCM)
  template      text,                 -- Meta: اسم القالب المعتمد
  template_lang text not null default 'ar',
  template_vars text not null default 'number_store' check (template_vars in ('none', 'number', 'number_store')),
  message       text,                 -- UltraMsg / Green API: نص الرسالة ({number} و {store})
  enabled       boolean not null default true,
  last_error    text,
  last_sent_at  timestamptz,
  updated_at    timestamptz not null default now()
);
alter table public.client_whatsapp enable row level security;
revoke all on public.client_whatsapp from anon, authenticated;

alter table public.pager_tickets add column if not exists wa_phone text;
alter table public.pager_tickets add column if not exists wa_status text;
notify pgrst, 'reload schema';
