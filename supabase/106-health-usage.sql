-- =====================================================================
-- DEV MENU — فحص يومي لصحة النظام (api/_lib/health.js)
--   server_usage(): حجم قاعدة البيانات وحجم الصور، عشان ينبّهنا قبل ما نوصل حدود Supabase
--   app_settings.backup_last_at: آخر نسخة احتياطية ناجحة (يكتبها .github/workflows/backup.yml)
-- آمن: دالة قراءة فقط، ينفع يتشغّل أكثر من مرة.
-- =====================================================================
create or replace function public.server_usage()
returns jsonb language sql security definer set search_path = public, storage as $$
  select jsonb_build_object(
    'db_bytes', pg_database_size(current_database()),
    'storage_bytes', coalesce((select sum((metadata->>'size')::bigint) from storage.objects), 0)
  )
$$;
revoke all on function public.server_usage() from public, anon, authenticated;
grant execute on function public.server_usage() to service_role;
notify pgrst, 'reload schema';
