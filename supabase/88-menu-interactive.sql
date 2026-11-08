-- نوع المنيو «تفاعلي»: menu_layout يقبل interactive جنب list و photos
-- (العمود موجود في public_clients من 42-menu-layout.sql، فما يحتاج تعديل الـ view)
alter table public.clients drop constraint if exists clients_menu_layout_check;
alter table public.clients add constraint clients_menu_layout_check check (menu_layout in ('list', 'photos', 'interactive'));
notify pgrst, 'reload schema';
