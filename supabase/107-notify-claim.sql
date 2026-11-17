-- =====================================================================
-- DEV MENU — طابور إشعارات المحفظة: حجز الرسائل والدور بين المحلات
--   1) كل رسالة تنحجز لمشغّل واحد (status = 'sending') قبل ما تنرسل، فلو اشتغل الإرسال الفوري
--      والتشغيل الدوري مع بعض ما يوصل الزبون نفس الإشعار مرتين
--   2) الدفعة تاخذ من كل محل بالدور (أول رسالة من كل محل، بعدها الثانية...)، فمحل أرسل لـ 500
--      ما يأخّر رسالة محل ثاني
--   3) لو الدالة انقطعت والرسالة محجوزة أكثر من 5 دقايق، ترجع للطابور
-- =====================================================================
alter table public.notification_queue add column if not exists claimed_at timestamptz;
create index if not exists notification_queue_sending on public.notification_queue (claimed_at) where status = 'sending';
create index if not exists notification_queue_store_due on public.notification_queue (client_id, priority, id) where status = 'pending';

create or replace function public.claim_notifications(p_limit integer default 50)
returns setof public.notification_queue
language plpgsql security definer set search_path = public as $$
begin
  update public.notification_queue set status = 'pending', claimed_at = null
   where status = 'sending' and claimed_at < now() - interval '5 minutes';

  return query
  with stores as (
    select distinct client_id from public.notification_queue where status = 'pending' and run_at <= now()
  ), cand as (
    select c.id, c.client_id, c.priority from stores s
    cross join lateral (
      select n.id, n.client_id, n.priority from public.notification_queue n
       where n.client_id = s.client_id and n.status = 'pending' and n.run_at <= now()
       order by n.priority, n.id limit p_limit
    ) c
  ), pick as (
    select id from (
      select id, priority, row_number() over (partition by client_id order by priority, id) rn from cand
    ) r order by rn, priority, id limit p_limit
  )
  -- status = 'pending' هنا يمنع مشغّلين يحجزون نفس الرسالة: الثاني ينتظر قفل السطر وبعدها يلقاه محجوز فيتركه
  update public.notification_queue n set status = 'sending', claimed_at = now()
    from pick where n.id = pick.id and n.status = 'pending'
  returning n.*;
end $$;
revoke all on function public.claim_notifications(integer) from public, anon, authenticated;
grant execute on function public.claim_notifications(integer) to service_role;

-- التشغيل كل دقيقة: يصحى بعد لو فيه رسائل علقت محجوزة
select cron.unschedule('devmenu-notify') where exists (select 1 from cron.job where jobname = 'devmenu-notify');
select cron.schedule('devmenu-notify', '* * * * *', $job$
  select net.http_get(
    url := (select value from public.app_settings where key = 'api_base') || '/api/notify-cron?key=' || (select value from public.app_settings where key = 'cron_key'),
    timeout_milliseconds := 60000
  ) where exists (select 1 from public.notification_queue where (status = 'pending' and run_at <= now()) or (status = 'sending' and claimed_at < now() - interval '5 minutes'));
$job$);

notify pgrst, 'reload schema';
