-- =====================================================================
-- DEV MENU — استرجاع العميل اللي غاب (بطاقة الأختام)
--   ثلاث رسائل تلقائية على بطاقته في المحفظة: بعد الغياب، وبعدها بأسبوع، وبعدها بأسبوع
--   والثالثة فيها ختم هدية ينضاف له أول ما يرجع. أول ما يرجع ويختم تقف السلسلة وتنحسب رجعة
--   loyalty_cards.comeback_step: كم رسالة وصلته في هالغيبة (0 = ما بدأت)
--   loyalty_cards.comeback_at: متى وصلته آخر رسالة
--   loyalty_cards.comeback_bonus: له ختم هدية ينتظر رجعته
--   loyalty_events.kind = 'comeback': رجع بعد رسائل الاسترجاع
-- =====================================================================
alter table public.loyalty_cards add column if not exists comeback_step smallint not null default 0;
alter table public.loyalty_cards add column if not exists comeback_at timestamptz;
alter table public.loyalty_cards add column if not exists comeback_bonus boolean not null default false;
create index if not exists loyalty_cards_comeback_idx on public.loyalty_cards (client_id, last_stamp_at) where wallet_serial is not null;

alter table public.loyalty_events drop constraint if exists loyalty_events_kind_check;
alter table public.loyalty_events add constraint loyalty_events_kind_check check (kind in ('stamp', 'redeem', 'gift', 'gift_redeem', 'comeback'));

-- الزبون رجع وانختم له: نوقف السلسلة، ونضيف ختم الهدية لو له، ونسجّل الرجعة
create or replace function public.server_comeback_return(p_card bigint, p_needed integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.loyalty_cards; had_bonus boolean; step smallint;
begin
  select comeback_bonus, comeback_step into had_bonus, step from public.loyalty_cards where id = p_card for update;
  if not found or coalesce(step, 0) = 0 then return jsonb_build_object('returned', false); end if;
  update public.loyalty_cards
     set comeback_step = 0, comeback_bonus = false,
         stamps = case when had_bonus then least(stamps + 1, p_needed) else stamps end
   where id = p_card
  returning * into c;
  insert into public.loyalty_events (client_id, card_id, kind) values (c.client_id, c.id, 'comeback');
  return jsonb_build_object('returned', true, 'bonus', had_bonus, 'step', step, 'stamps', c.stamps);
end $$;
revoke all on function public.server_comeback_return(bigint, integer) from public, anon, authenticated;
grant execute on function public.server_comeback_return(bigint, integer) to service_role;

notify pgrst, 'reload schema';
