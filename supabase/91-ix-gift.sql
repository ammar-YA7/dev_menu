-- =====================================================================
-- DEV MENU — «المنيو التفاعلي» صار إضافة مدفوعة: المشتركين الحاليين ياخذونه هدية لين نهاية اشتراكهم الحالي
--   clients.ix_gift_until: آخر يوم للهدية (= تاريخ نهاية الاشتراك وقت ما صار إضافة). التجديد ما يمددها
-- =====================================================================
alter table public.clients add column if not exists ix_gift_until timestamptz;
update public.clients set ix_gift_until = subscription_end_date
  where subscription_status = 'active' and subscription_end_date > now() and ix_gift_until is null;
notify pgrst, 'reload schema';
