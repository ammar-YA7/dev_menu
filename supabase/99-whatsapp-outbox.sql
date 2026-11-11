-- =====================================================================
-- DEV MENU — ربط واتساب «صندوق رسائل»: لخادم واتساب على كمبيوتر المحل (ما له رابط عام)
--   الرسالة تنحفظ هنا (whatsapp_outbox)، وخادمهم يسحبها من /api/wa بمفتاح خاص بالمحل، ويبلغنا انرسلت أو لا
--   أرقام العملاء والطلبات تبقى عندنا، وما يحتاجون مفتاح قاعدة بياناتنا
--   client_whatsapp.pull_key_hash: بصمة مفتاح السحب (المفتاح نفسه يطلع مرة وحدة للمدير العام وما ينحفظ)
--   client_whatsapp.pull_seen_at: آخر مرة سأل خادمهم (عشان نعرف إنه شغال)
-- =====================================================================
alter table public.client_whatsapp drop constraint if exists client_whatsapp_provider_check;
alter table public.client_whatsapp add constraint client_whatsapp_provider_check
  check (provider in ('meta', 'ultramsg', 'greenapi', 'wasender', 'custom', 'outbox'));
alter table public.client_whatsapp add column if not exists pull_key_hash text;
alter table public.client_whatsapp add column if not exists pull_seen_at timestamptz;
create unique index if not exists client_whatsapp_pull_key_idx on public.client_whatsapp (pull_key_hash) where pull_key_hash is not null;

create table if not exists public.whatsapp_outbox (
  id          bigserial primary key,
  client_id   bigint not null references public.clients(id) on delete cascade,
  kind        text not null default 'pager',     -- pager / waitlist / test
  phone       text not null,                     -- صيغة دولية بدون + (9665xxxxxxxx)
  body        text not null,
  status      text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'expired')),
  attempts    int not null default 0,
  error       text,
  created_at  timestamptz not null default now(),
  claimed_at  timestamptz,
  sent_at     timestamptz
);
create index if not exists whatsapp_outbox_pending_idx on public.whatsapp_outbox (client_id, status, id);
alter table public.whatsapp_outbox enable row level security;
revoke all on public.whatsapp_outbox from anon, authenticated;
notify pgrst, 'reload schema';
