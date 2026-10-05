-- ============================================================================
-- Northbound demo catalog
-- Run AFTER schema.sql. Re-runnable: products are upserted by slug and their
-- variants rebuilt, so editing prices here and re-running does the right thing.
-- ============================================================================

insert into public.categories (slug, name, position) values
  ('shirts',      'Shirts',       1),
  ('t-shirts',    'T-Shirts',     2),
  ('knitwear',    'Knitwear',     3),
  ('outerwear',   'Outerwear',    4),
  ('trousers',    'Trousers',     5),
  ('accessories', 'Accessories',  6)
on conflict (slug) do update set name = excluded.name, position = excluded.position;

-- Prices are in kobo: 4500000 = NGN 45,000.00
with seed(slug, name, description, price, compare_at, category, images, featured) as (
  values
    (
      'oxford-button-down-shirt',
      'Oxford Button-Down Shirt',
      'A properly heavy oxford cloth at 140gsm, cut with a soft unlined collar that rolls instead of standing to attention. Mother-of-pearl buttons, a single patch pocket, and a split back yoke that lets the shoulders move.',
      4500000, 5200000, 'shirts',
      array['https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=1200&q=80'],
      true
    ),
    (
      'heavyweight-pocket-tee',
      'Heavyweight Pocket Tee',
      'Knitted on vintage loopwheel machines at 240gsm, so it hangs straight and keeps its shape through the wash. Ribbed collar, chain-stitched hem, and a pocket sized for an actual phone.',
      1800000, null, 't-shirts',
      array['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200&q=80'],
      true
    ),
    (
      'merino-crew-knit',
      'Merino Crew Knit',
      'Extra-fine 19.5 micron merino from a mill in Biella, knitted to a 12-gauge that works alone or under a jacket. Fully fashioned shoulders mean the seams follow your frame rather than cutting across it.',
      6800000, null, 'knitwear',
      array['https://images.unsplash.com/photo-1614975059251-992f11792b9f?w=1200&q=80'],
      true
    ),
    (
      'waxed-cotton-field-jacket',
      'Waxed Cotton Field Jacket',
      'Eight-ounce waxed cotton that starts stiff and ends up yours. Four bellowed pockets, a corduroy collar, and a storm flap over a brass two-way zip. Re-waxable indefinitely.',
      14500000, 16800000, 'outerwear',
      array['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=1200&q=80'],
      true
    ),
    (
      'selvedge-denim-five-pocket',
      'Selvedge Denim Five-Pocket',
      'A 13.5oz right-hand twill woven on shuttle looms, cut slim through the thigh with a straight leg below the knee. Copper rivets, a button fly, and a hidden selvedge line down the outseam.',
      7900000, null, 'trousers',
      array['https://images.unsplash.com/photo-1542272604-787c3835535d?w=1200&q=80'],
      false
    ),
    (
      'pleated-wool-trouser',
      'Pleated Wool Trouser',
      'Single forward pleat, a mid rise that sits at the natural waist, and a gentle taper to a 19cm hem. Woven in a four-season wool that resists creasing on long days.',
      8900000, null, 'trousers',
      array['https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=1200&q=80'],
      false
    ),
    (
      'brushed-flannel-overshirt',
      'Brushed Flannel Overshirt',
      'Double-brushed cotton flannel with enough body to work as a light jacket. Two chest pockets, horn-look buttons, and a squared hem meant to be worn out.',
      5400000, null, 'shirts',
      array['https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?w=1200&q=80'],
      false
    ),
    (
      'cashmere-scarf',
      'Cashmere Scarf',
      'Two-ply Mongolian cashmere, brushed to a quiet halo and finished with hand-knotted fringe. Wide enough to loop twice without bulk.',
      5900000, null, 'accessories',
      array['https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=1200&q=80'],
      false
    ),
    (
      'leather-belt',
      'Full-Grain Leather Belt',
      'Vegetable-tanned full-grain hide, 35mm wide, with a solid brass buckle on a removable loop so you can swap hardware. Darkens with wear.',
      3200000, null, 'accessories',
      array['https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=1200&q=80'],
      false
    )
)
insert into public.products (slug, name, description, price, compare_at, category_id, images, is_featured)
select s.slug, s.name, s.description, s.price, s.compare_at, c.id, s.images, s.featured
from seed s
join public.categories c on c.slug = s.category
on conflict (slug) do update set
  name        = excluded.name,
  description = excluded.description,
  price       = excluded.price,
  compare_at  = excluded.compare_at,
  category_id = excluded.category_id,
  images      = excluded.images,
  is_featured = excluded.is_featured;

-- Rebuild variants for the seeded products only.
delete from public.product_variants
 where product_id in (
   select id from public.products
    where slug in (
      'oxford-button-down-shirt', 'heavyweight-pocket-tee', 'merino-crew-knit',
      'waxed-cotton-field-jacket', 'selvedge-denim-five-pocket', 'pleated-wool-trouser',
      'brushed-flannel-overshirt', 'cashmere-scarf', 'leather-belt'
    )
 );

-- Apparel sizing: S-XXL for tops, waist sizes for trousers, one-size for accessories.
with spec(product_slug, size, color, stock, position) as (
  values
    ('oxford-button-down-shirt',   'S',   'White',       6,  1),
    ('oxford-button-down-shirt',   'M',   'White',      12,  2),
    ('oxford-button-down-shirt',   'L',   'White',      10,  3),
    ('oxford-button-down-shirt',   'XL',  'White',       4,  4),
    ('oxford-button-down-shirt',   'S',   'Sky Blue',    3,  5),
    ('oxford-button-down-shirt',   'M',   'Sky Blue',    8,  6),
    ('oxford-button-down-shirt',   'L',   'Sky Blue',    0,  7),
    ('oxford-button-down-shirt',   'XL',  'Sky Blue',    5,  8),

    ('heavyweight-pocket-tee',     'S',   'Ecru',        9,  1),
    ('heavyweight-pocket-tee',     'M',   'Ecru',       20,  2),
    ('heavyweight-pocket-tee',     'L',   'Ecru',       18,  3),
    ('heavyweight-pocket-tee',     'XL',  'Ecru',        7,  4),
    ('heavyweight-pocket-tee',     'S',   'Faded Black', 5,  5),
    ('heavyweight-pocket-tee',     'M',   'Faded Black',14,  6),
    ('heavyweight-pocket-tee',     'L',   'Faded Black',11,  7),
    ('heavyweight-pocket-tee',     'XL',  'Faded Black', 6,  8),

    ('merino-crew-knit',           'S',   'Charcoal',    4,  1),
    ('merino-crew-knit',           'M',   'Charcoal',    9,  2),
    ('merino-crew-knit',           'L',   'Charcoal',    7,  3),
    ('merino-crew-knit',           'XL',  'Charcoal',    2,  4),
    ('merino-crew-knit',           'M',   'Oatmeal',     6,  5),
    ('merino-crew-knit',           'L',   'Oatmeal',     5,  6),

    ('waxed-cotton-field-jacket',  'S',   'Olive',       2,  1),
    ('waxed-cotton-field-jacket',  'M',   'Olive',       5,  2),
    ('waxed-cotton-field-jacket',  'L',   'Olive',       4,  3),
    ('waxed-cotton-field-jacket',  'XL',  'Olive',       3,  4),

    ('selvedge-denim-five-pocket', '30',  'Indigo',      4,  1),
    ('selvedge-denim-five-pocket', '32',  'Indigo',     10,  2),
    ('selvedge-denim-five-pocket', '34',  'Indigo',      8,  3),
    ('selvedge-denim-five-pocket', '36',  'Indigo',      5,  4),
    ('selvedge-denim-five-pocket', '38',  'Indigo',      2,  5),

    ('pleated-wool-trouser',       '30',  'Navy',        3,  1),
    ('pleated-wool-trouser',       '32',  'Navy',        7,  2),
    ('pleated-wool-trouser',       '34',  'Navy',        6,  3),
    ('pleated-wool-trouser',       '36',  'Navy',        4,  4),
    ('pleated-wool-trouser',       '32',  'Stone',       5,  5),
    ('pleated-wool-trouser',       '34',  'Stone',       5,  6),

    ('brushed-flannel-overshirt',  'S',   'Rust Check',  3,  1),
    ('brushed-flannel-overshirt',  'M',   'Rust Check',  8,  2),
    ('brushed-flannel-overshirt',  'L',   'Rust Check',  6,  3),
    ('brushed-flannel-overshirt',  'XL',  'Rust Check',  4,  4),

    ('cashmere-scarf',             'One Size', 'Camel',  12, 1),
    ('cashmere-scarf',             'One Size', 'Grey',    9, 2),

    ('leather-belt',               '32',  'Tan',         6,  1),
    ('leather-belt',               '34',  'Tan',         8,  2),
    ('leather-belt',               '36',  'Tan',         7,  3),
    ('leather-belt',               '34',  'Black',       9,  4),
    ('leather-belt',               '36',  'Black',       6,  5)
)
insert into public.product_variants (product_id, size, color, sku, stock, position)
select
  p.id,
  s.size,
  s.color,
  upper(
    regexp_replace(left(s.product_slug, 12), '[^a-zA-Z0-9]', '', 'g') || '-' ||
    regexp_replace(coalesce(s.color, 'STD'), '[^a-zA-Z0-9]', '', 'g') || '-' ||
    regexp_replace(s.size, '[^a-zA-Z0-9]', '', 'g')
  ),
  s.stock,
  s.position
from spec s
join public.products p on p.slug = s.product_slug;
