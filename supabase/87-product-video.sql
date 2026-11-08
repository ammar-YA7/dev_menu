-- =====================================================================
-- DEV MENU — فيديو قصير للطبق (يتحرك في المنيو مكان الصورة، والصورة تبقى غلافه)
--   products.video_url: رابط فيديو MP4 في تخزين المتجر (kind = prod_video)
-- =====================================================================
alter table public.products add column if not exists video_url text;
notify pgrst, 'reload schema';
