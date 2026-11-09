# TRENDY ESSENCE - Supabase setup guide (beginner version)

Do these in order. Do not skip. After each step, check the "You should see" line.
Nothing on your website uses the database until step 5 is done.

## Step 1. Create your free Supabase project
1. Go to supabase.com and press Start your project. Sign up with GitHub or email.
2. Press New project. Name it trendy-essence.
3. Database password: press Generate, then SAVE it in a password manager or notes app. You will almost never need it, but you cannot see it again. Never put it in the website.
4. Region: pick the closest one offered (for example Singapore or Mumbai). Plan: Free.
5. Press Create new project and wait 1 to 2 minutes.
You should see: a project dashboard.

## Step 2. Create the tables and security
1. Left menu: SQL Editor, then New query.
2. Open supabase/schema.sql from this folder (or use the script from the chat), copy EVERYTHING, paste it in, press Run. Sizes live in the product_sizes table; the products table fills its available_sizes list automatically.
You should see: "Success. No rows returned". If you see a red error, copy the full message and send it to me. Do not change anything yourself.

## Step 3. Copy your project URL and public key
1. Open Project Settings, then API (or API Keys). Names on the page may differ slightly.
2. Copy the Project URL (looks like https://abcdxyz.supabase.co).
3. Copy the Publishable key (starts with sb_publishable_). If you only see "anon public", that works too.
4. NEVER copy the "secret" or "service_role" key. It must never be on your website.
These two values are safe to be public. Your data is protected by the security rules from step 2.

## Step 4. Create the first administrator
1. Left menu: Authentication, then Users, then Add user, then Create new user.
2. Enter your email and a strong password. Tick Auto Confirm User. Create.
3. Turn OFF public sign-ups: Authentication, then Sign In / Providers (or Settings), and switch off "Allow new users to sign up". Save.
4. SQL Editor, New query. Open supabase/make-first-admin.sql, change CHANGE-ME@example.com to your admin email, Run.
You should see: your email in the result table.

## Step 5. Connect the website
1. Open js/config.js. Paste the Project URL between the quotes after supabaseUrl, and the key after supabaseKey. Save.
2. (Optional, for testing) SQL Editor: run supabase/sample-products.sql to add 6 sample products.

## Step 6. Test it (all must pass)
1. Open connection-test.html. Every line should say PASS.
2. Open admin/index.html and sign in with your admin email. You should see "Signed in" and product and order counts.
3. Open the shop. You should see the database products (or an empty shop if you skipped the sample file).
If anything fails, tell me which line failed.

## About "environment variables"
This site is plain HTML and JavaScript, so it does not read a .env file. The two public values live in js/config.js. The file .env.example only documents them. Cloudflare Pages needs no environment variables for this site. Secret keys are never used.

## Product photos
The bucket product-images was created by the SQL. Admins can upload there (Storage in Supabase, or the admin dashboard in a later step). After uploading, copy the photo's public URL into the product's images list.
