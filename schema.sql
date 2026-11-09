-- =====================================================================
-- TRENDY ESSENCE - complete Supabase database setup
-- Run this ONCE in Supabase: SQL Editor > New query > paste all > Run.
-- It is safe to run again later (it will not delete your data).
-- NOTE: this script was written carefully but has NOT yet been run on a
-- real Supabase project. Follow SETUP-GUIDE.md and report any red error.
-- =====================================================================

-- ---------- 1. TABLES ----------
create table if not exists public.categories (
  id    bigint generated always as identity primary key,
  name  text not null unique,
  slug  text not null unique check (slug ~ '^[a-z0-9-]+$')
);

create table if not exists public.products (
  id              uuid primary key default gen_random_uuid(),
  product_code    text not null unique check (length(trim(product_code)) between 1 and 40),
  name            text not null check (length(trim(name)) between 1 and 120),
  description     text not null default '',
  price_mvr       numeric(10,2) not null check (price_mvr >= 0),
  category_id     bigint not null references public.categories(id),
  images          text[] not null default '{}',          -- full image URLs
  available_sizes text[] not null default '{}',          -- e.g. {S,M,L}; one-size items use {"One size"}; empty = sold out
  product_type    text not null default 'preorder' check (product_type in ('preorder','ready_stock')),
  is_active       boolean not null default true,         -- false hides the product from customers
  is_featured     boolean not null default false,        -- extra: show on the homepage
  created_at      timestamptz not null default now()
);

-- One row per size of a product. Edit sizes HERE; products.available_sizes is filled in automatically.
create table if not exists public.product_sizes (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products(id) on delete cascade,
  size         text not null check (length(trim(size)) between 1 and 20),
  is_available boolean not null default true,   -- false = size shown crossed out / out of stock
  sort_order   int not null default 0,
  unique (product_id, size)
);

create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     text not null unique,
  customer_name    text not null check (length(trim(customer_name)) between 2 and 100),
  phone_number     text not null check (phone_number ~ '^[0-9+() -]{7,20}$'),
  island           text not null check (length(trim(island)) between 2 and 80),
  delivery_address text not null check (length(trim(delivery_address)) between 5 and 300),
  total_amount_mvr numeric(12,2) not null check (total_amount_mvr >= 0),
  payment_method   text not null default 'pay_on_arrival' check (payment_method = 'pay_on_arrival'),
  order_status     text not null default 'pending' check (order_status in ('pending','confirmed','completed','cancelled')),
  created_at       timestamptz not null default now()
);

create table if not exists public.order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders(id) on delete cascade,
  product_id     uuid references public.products(id) on delete set null,
  product_code   text not null,
  product_name   text not null,
  selected_size  text not null,
  quantity       int not null check (quantity between 1 and 10),
  unit_price_mvr numeric(10,2) not null check (unit_price_mvr >= 0),
  subtotal_mvr   numeric(12,2) not null check (subtotal_mvr >= 0)
);

create index if not exists products_category_idx   on public.products(category_id);
create index if not exists orders_created_idx      on public.orders(created_at desc);
create index if not exists orders_status_idx       on public.orders(order_status);
create index if not exists order_items_order_idx   on public.order_items(order_id);
create index if not exists product_sizes_product_idx on public.product_sizes(product_id);

-- ---------- 2. STARTING CATEGORIES ----------
insert into public.categories (name, slug) values
  ('Tops','tops'), ('Dresses','dresses'), ('Skirts','skirts'),
  ('Trousers','trousers'), ('Skincare','skincare'), ('Beauty','beauty')
on conflict (slug) do nothing;

-- ---------- 3. "IS THIS PERSON AN ADMIN?" ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

-- ---------- 3b. KEEP products.available_sizes IN SYNC WITH product_sizes ----------
create or replace function public.refresh_product_sizes(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.products set available_sizes = coalesce(
    (select array_agg(size order by sort_order, size) from public.product_sizes where product_id = p_id and is_available),
    '{}'::text[])
  where id = p_id;
$$;

create or replace function public.product_sizes_sync()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then perform public.refresh_product_sizes(new.product_id); end if;
  if tg_op in ('UPDATE', 'DELETE') then perform public.refresh_product_sizes(old.product_id); end if;
  return null;
end;
$$;

drop trigger if exists product_sizes_sync_trg on public.product_sizes;
create trigger product_sizes_sync_trg after insert or update or delete on public.product_sizes
  for each row execute function public.product_sizes_sync();

revoke all on function public.refresh_product_sizes(uuid) from public, anon, authenticated;
revoke all on function public.product_sizes_sync() from public, anon, authenticated;

-- ---------- 4. PERMISSIONS AND ROW LEVEL SECURITY ----------
-- Start from nothing, then grant only what is needed.
revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;

grant select on public.categories, public.products, public.product_sizes to anon, authenticated;
grant insert, update, delete on public.categories, public.products, public.product_sizes to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant select on public.orders, public.order_items, public.admin_users to authenticated;
grant update (order_status) on public.orders to authenticated;   -- admins can change ONLY the status

alter table public.categories  enable row level security;
alter table public.products    enable row level security;
alter table public.product_sizes enable row level security;
alter table public.admin_users enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- categories
drop policy if exists "categories public read" on public.categories;
create policy "categories public read" on public.categories for select to anon, authenticated using (true);
drop policy if exists "categories admin write" on public.categories;
create policy "categories admin write" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- products: customers see only active products; only admins can change anything
drop policy if exists "products public read active" on public.products;
create policy "products public read active" on public.products for select to anon, authenticated using (is_active);
drop policy if exists "products admin all" on public.products;
create policy "products admin all" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- product sizes: customers see sizes of active products only; only admins can change them
drop policy if exists "product sizes public read" on public.product_sizes;
create policy "product sizes public read" on public.product_sizes for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.is_active));
drop policy if exists "product sizes admin all" on public.product_sizes;
create policy "product sizes admin all" on public.product_sizes for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- orders and order items: NO customer access at all. Admins can read; admins can update status only.
drop policy if exists "orders admin read" on public.orders;
create policy "orders admin read" on public.orders for select to authenticated using (public.is_admin());
drop policy if exists "orders admin update" on public.orders;
create policy "orders admin update" on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "order items admin read" on public.order_items;
create policy "order items admin read" on public.order_items for select to authenticated using (public.is_admin());

-- admin_users: a signed-in user can see only their own row. Nobody can add admins through the website.
drop policy if exists "admin users read own" on public.admin_users;
create policy "admin users read own" on public.admin_users for select to authenticated using (user_id = auth.uid());

-- ---------- 5. SECURE ORDER SUBMISSION (server-side) ----------
-- The website sends only product codes, sizes and quantities. Prices, names and totals
-- are read from the products table here, so customers cannot change them.
create or replace function public.create_order(
  p_name text, p_phone text, p_island text, p_address text, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_name   text := trim(coalesce(p_name, ''));
  v_phone  text := trim(coalesce(p_phone, ''));
  v_island text := trim(coalesce(p_island, ''));
  v_addr   text := trim(coalesce(p_address, ''));
  v_digits text := regexp_replace(trim(coalesce(p_phone, '')), '\D', '', 'g');
  v_item   jsonb;
  v_prod   public.products%rowtype;
  v_qty    int;
  v_size   text;
  v_sub    numeric(12,2);
  v_total  numeric(12,2) := 0;
  v_lines  jsonb := '[]'::jsonb;
  v_number text;
  v_order  uuid;
  v_try    int := 0;
begin
  if length(v_name) not between 2 and 100 then raise exception 'Please enter your full name.'; end if;
  if v_phone !~ '^[0-9+() -]{7,20}$' or length(v_digits) < 7 then raise exception 'Please enter a valid phone number.'; end if;
  if length(v_island) not between 2 and 80 then raise exception 'Please enter your island.'; end if;
  if length(v_addr) not between 5 and 300 then raise exception 'Please enter your full delivery address.'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'Your cart is empty or invalid.';
  end if;

  -- simple spam protection: at most 5 pending orders per phone number per day
  if (select count(*) from public.orders
        where regexp_replace(phone_number, '\D', '', 'g') = v_digits
          and order_status = 'pending' and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Too many orders from this phone number today. Please contact us.';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object' then raise exception 'Your cart is invalid.'; end if;
    v_size := trim(coalesce(v_item->>'size', ''));
    if coalesce(v_item->>'qty', '') !~ '^[0-9]{1,2}$' then raise exception 'Invalid quantity in your cart.'; end if;
    v_qty := (v_item->>'qty')::int;
    if v_qty not between 1 and 10 then raise exception 'Quantity must be between 1 and 10.'; end if;

    select * into v_prod from public.products where product_code = (v_item->>'code') and is_active;
    if not found then raise exception 'A product in your cart is no longer available.'; end if;
    if cardinality(v_prod.available_sizes) = 0 then raise exception '% is sold out.', v_prod.name; end if;
    if not (v_size = any (v_prod.available_sizes)) then raise exception 'Size % is not available for %.', v_size, v_prod.name; end if;

    v_sub := v_prod.price_mvr * v_qty;
    v_total := v_total + v_sub;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'product_id', v_prod.id, 'product_code', v_prod.product_code, 'product_name', v_prod.name,
      'selected_size', v_size, 'quantity', v_qty, 'unit_price_mvr', v_prod.price_mvr, 'subtotal_mvr', v_sub));
  end loop;

  loop
    v_number := 'TE-' || to_char(now() at time zone 'Indian/Maldives', 'YYMMDD') || '-'
                || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5));
    begin
      insert into public.orders (order_number, customer_name, phone_number, island, delivery_address, total_amount_mvr)
      values (v_number, v_name, v_phone, v_island, v_addr, v_total)
      returning id into v_order;
      exit;
    exception when unique_violation then
      v_try := v_try + 1;
      if v_try > 5 then raise exception 'Could not create the order. Please try again.'; end if;
    end;
  end loop;

  insert into public.order_items (order_id, product_id, product_code, product_name, selected_size, quantity, unit_price_mvr, subtotal_mvr)
  select v_order, x.product_id, x.product_code, x.product_name, x.selected_size, x.quantity, x.unit_price_mvr, x.subtotal_mvr
  from jsonb_to_recordset(v_lines) as x(product_id uuid, product_code text, product_name text, selected_size text,
                                        quantity int, unit_price_mvr numeric, subtotal_mvr numeric);

  return jsonb_build_object('order_number', v_number, 'total_amount_mvr', v_total,
                            'payment_method', 'pay_on_arrival', 'created_at', now(), 'items', v_lines);
end;
$$;

-- ---------- 6. SECURE ORDER TRACKING (server-side) ----------
-- Needs BOTH the order number and the phone number. Returns nothing (null) if either is wrong,
-- and never returns the customer's name or address.
create or replace function public.track_order(p_order_number text, p_phone text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_order  public.orders%rowtype;
  v_digits text := regexp_replace(trim(coalesce(p_phone, '')), '\D', '', 'g');
begin
  if length(v_digits) < 7 or length(coalesce(trim(p_order_number), '')) not between 5 and 30 then return null; end if;
  select * into v_order from public.orders
    where order_number = upper(trim(p_order_number))
      and regexp_replace(phone_number, '\D', '', 'g') = v_digits;
  if not found then return null; end if;
  return jsonb_build_object(
    'order_number', v_order.order_number, 'order_status', v_order.order_status,
    'created_at', v_order.created_at, 'total_amount_mvr', v_order.total_amount_mvr,
    'payment_method', v_order.payment_method, 'island', v_order.island,
    'items', (select coalesce(jsonb_agg(jsonb_build_object(
                'product_name', product_name, 'product_code', product_code, 'selected_size', selected_size,
                'quantity', quantity, 'unit_price_mvr', unit_price_mvr, 'subtotal_mvr', subtotal_mvr) order by id), '[]'::jsonb)
              from public.order_items where order_id = v_order.id));
end;
$$;

revoke all on function public.create_order(text, text, text, text, jsonb) from public;
revoke all on function public.track_order(text, text) from public;
revoke all on function public.is_admin() from public;
grant execute on function public.create_order(text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.track_order(text, text) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- 7. PRODUCT PHOTO STORAGE ----------
-- Public bucket: anyone can VIEW photos. Only admins can upload, replace or delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product images public read" on storage.objects;
create policy "product images public read" on storage.objects for select to anon, authenticated using (bucket_id = 'product-images');
drop policy if exists "product images admin insert" on storage.objects;
create policy "product images admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "product images admin update" on storage.objects;
create policy "product images admin update" on storage.objects for update to authenticated using (bucket_id = 'product-images' and public.is_admin()) with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "product images admin delete" on storage.objects;
create policy "product images admin delete" on storage.objects for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());
