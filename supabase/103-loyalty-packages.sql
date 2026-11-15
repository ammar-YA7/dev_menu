-- =====================================================================
-- DEV MENU — باقات مدفوعة مسبقاً (ضمن بطاقة الولاء)
-- الزبون يشتري من المحل باقة (مثلاً 30 وجبة أو 10 قهوات) ويدفع في الكاشير،
-- وتطلع له بطاقة في المحفظة فيها الرصيد. كل ما يمسح الكاشير الكود ينقص واحد.
--   loyalty_pkg_plans  الباقات اللي يعرّفها صاحب المحل
--   loyalty_pkg_cards  باقات الزبائن (الرصيد، تاريخ الانتهاء، بطاقة المحفظة)
--   loyalty_pkg_uses   سجل الاستخدام (وللتراجع عن مسح بالغلط)
-- آمن: يضيف بس. ينفع يتشغّل أكثر من مرة.
-- =====================================================================
begin;

create table if not exists public.loyalty_pkg_plans (
  id          bigserial primary key,
  client_id   bigint not null references public.clients(id) on delete cascade,
  name        text not null,
  uses        int not null check (uses between 1 and 1000),
  days        int check (days is null or days between 1 and 3650),
  price       numeric(10,2),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists loyalty_pkg_plans_client_idx on public.loyalty_pkg_plans (client_id);

create table if not exists public.loyalty_pkg_cards (
  id              bigserial primary key,
  client_id       bigint not null references public.clients(id) on delete cascade,
  plan_id         bigint references public.loyalty_pkg_plans(id) on delete set null,
  plan_name       text not null,
  name            text not null,
  phone           text,
  total           int not null,
  remaining       int not null check (remaining >= 0),
  expires_at      timestamptz,
  token           text not null unique,
  lang            text not null default 'ar',
  branch_id       bigint,
  wallet_serial   text,
  wallet_url      text,
  wallet_error    text,
  wallet_platform text,
  last_used_at    timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists loyalty_pkg_cards_client_idx on public.loyalty_pkg_cards (client_id, created_at desc);

create table if not exists public.loyalty_pkg_uses (
  id          bigserial primary key,
  client_id   bigint not null,
  card_id     bigint not null references public.loyalty_pkg_cards(id) on delete cascade,
  branch_id   bigint,
  delta       int not null,
  created_at  timestamptz not null default now()
);
create index if not exists loyalty_pkg_uses_card_idx on public.loyalty_pkg_uses (card_id, created_at desc);

alter table public.loyalty_pkg_plans enable row level security;
alter table public.loyalty_pkg_cards enable row level security;
alter table public.loyalty_pkg_uses  enable row level security;
revoke all on public.loyalty_pkg_plans, public.loyalty_pkg_cards, public.loyalty_pkg_uses from anon, authenticated;

-- استخدام واحد من الرصيد (ذري: مسحتين بنفس اللحظة ما ينقصون مرتين من رصيد واحد باقي)
create or replace function public.server_pkg_use(p_card bigint, p_branch bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.loyalty_pkg_cards; u bigint;
begin
  update public.loyalty_pkg_cards
     set remaining = remaining - 1, last_used_at = now()
   where id = p_card and remaining > 0 and (expires_at is null or expires_at > now())
  returning * into c;
  if not found then
    select * into c from public.loyalty_pkg_cards where id = p_card;
    if not found then return jsonb_build_object('ok', false, 'reason', 'NOT_FOUND'); end if;
    return jsonb_build_object('ok', false, 'reason', case when c.remaining <= 0 then 'EMPTY' else 'EXPIRED' end, 'remaining', c.remaining);
  end if;
  insert into public.loyalty_pkg_uses (client_id, card_id, branch_id, delta) values (c.client_id, c.id, p_branch, -1) returning id into u;
  return jsonb_build_object('ok', true, 'remaining', c.remaining, 'use_id', u);
end $$;

-- التراجع عن مسح بالغلط (خلال دقائق من المسح)
create or replace function public.server_pkg_undo(p_use bigint, p_client bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare x public.loyalty_pkg_uses; c public.loyalty_pkg_cards;
begin
  delete from public.loyalty_pkg_uses
   where id = p_use and client_id = p_client and delta = -1 and created_at > now() - interval '10 minutes'
  returning * into x;
  if not found then return jsonb_build_object('ok', false); end if;
  update public.loyalty_pkg_cards set remaining = remaining + 1 where id = x.card_id returning * into c;
  return jsonb_build_object('ok', true, 'remaining', c.remaining, 'card_id', c.id);
end $$;

revoke all on function public.server_pkg_use(bigint, bigint) from public, anon, authenticated;
revoke all on function public.server_pkg_undo(bigint, bigint) from public, anon, authenticated;
grant execute on function public.server_pkg_use(bigint, bigint) to service_role;
grant execute on function public.server_pkg_undo(bigint, bigint) to service_role;

commit;

notify pgrst, 'reload schema';
