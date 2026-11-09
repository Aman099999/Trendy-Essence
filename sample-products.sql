-- OPTIONAL. Adds 6 SAMPLE products so you can test the website with the database.
-- They are not real items. Remove them later with:
--   delete from public.products where product_code like 'SAMPLE-%';
insert into public.products (product_code, name, description, price_mvr, category_id, product_type, is_featured)
select v.code, v.name, v.descr, v.price, c.id, 'preorder', v.feat
from (values
  ('SAMPLE-T01','Linen Wrap Top','Sample description for testing.',220,'tops',true),
  ('SAMPLE-D01','Satin Midi Dress','Sample description for testing.',420,'dresses',true),
  ('SAMPLE-K01','Pleated Midi Skirt','Sample description for testing.',240,'skirts',false),
  ('SAMPLE-R01','Wide Leg Trousers','Sample description for testing.',290,'trousers',false),
  ('SAMPLE-S01','Hydrating Face Serum','Sample description for testing.',240,'skincare',true),
  ('SAMPLE-B01','Soft Rose Lip Tint','Sample sold-out item for testing (it has no sizes).',110,'beauty',false)
) as v(code, name, descr, price, slug, feat)
join public.categories c on c.slug = v.slug
on conflict (product_code) do nothing;

-- Sizes (SAMPLE-B01 gets none, so it shows as sold out)
insert into public.product_sizes (product_id, size, sort_order)
select p.id, u.size, u.ord
from (values
  ('SAMPLE-T01', array['S','M','L','XL']),
  ('SAMPLE-D01', array['S','M','L']),
  ('SAMPLE-K01', array['M','L','XL','XXL']),
  ('SAMPLE-R01', array['S','M']),
  ('SAMPLE-S01', array['One size'])
) as v(code, sizes)
join public.products p on p.product_code = v.code
cross join lateral unnest(v.sizes) with ordinality as u(size, ord)
on conflict (product_id, size) do nothing;
