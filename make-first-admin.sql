-- Run AFTER you have created your admin user in Authentication > Users.
-- Change the email below to YOUR admin email, then Run. It should say "Success. 1 row affected"-style output.
insert into public.admin_users (user_id, email)
select id, email from auth.users where email = 'CHANGE-ME@example.com'
on conflict (user_id) do nothing;

-- Check it worked (should show your email):
select email from public.admin_users;
