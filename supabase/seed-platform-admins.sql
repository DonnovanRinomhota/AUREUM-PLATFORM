-- Optional. Run in the Supabase SQL Editor ONLY if these people should have platform-admin access (admin.html).
-- They are added as ordinary admins (cannot approve fiscal integrations). Promote to super in admin.html → Admin access.
insert into public.platform_admins (email, is_super, added_by) values
  ('simonmuzviyo@gmail.com', false, 'seed'),
  ('don99business@gmail.com', false, 'seed')
on conflict (email) do nothing;
