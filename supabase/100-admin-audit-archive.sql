-- =====================================================================
-- DEV MENU — سجل عمليات الإدارة + أرشفة المحلات بدل الحذف النهائي
--
-- 1) admin_audit: كل عملية يسويها المدير العام (تفعيل، تجديد، تغيير مميزات، حذف، استرجاع، إشعار...)
--    مين سوّاها ومتى وعلى أي محل. ما فيه ربط بجدول clients عشان السجل يبقى حتى لو انمسح المحل.
--    الأسرار (توكنات الواتساب وغيرها) ما تنحفظ: الخادم يشيلها قبل الكتابة.
-- 2) clients.deleted_at: «حذف» المحل صار أرشفة: يتوقف ويختفي من اللوحة، ويقدر المدير يسترجعه،
--    وينمسح نهائياً بعد 30 يوم (المهمة اليومية subscriptions-cron).
--    clients.deleted_info: وش كان عليه قبل الأرشفة عشان الاسترجاع يرجعه مثل ما كان
--    (هل كان شغال، ورقم المتجر الرئيسي لو كان فرع: الفرع ينفصل وقت الأرشفة عشان ما ينحسب في السعر ولا يتشغل مع الحساب)
--
-- آمن: يضيف بس، ما يحذف ولا يعدّل بيانات موجودة. ينفع يتشغّل أكثر من مرة.
-- =====================================================================

create table if not exists public.admin_audit (
  id          bigserial primary key,
  at          timestamptz not null default now(),
  admin_email text not null,
  action      text not null,
  client_id   bigint,
  client_name text,
  details     jsonb
);
create index if not exists admin_audit_at_idx on public.admin_audit (at desc);
create index if not exists admin_audit_client_idx on public.admin_audit (client_id, at desc);
revoke all on public.admin_audit from anon, authenticated;
alter table public.admin_audit enable row level security;
revoke all on sequence public.admin_audit_id_seq from anon, authenticated;

alter table public.clients add column if not exists deleted_at timestamptz;
alter table public.clients add column if not exists deleted_info jsonb;
create index if not exists clients_deleted_idx on public.clients (deleted_at) where deleted_at is not null;

notify pgrst, 'reload schema';
