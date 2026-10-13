-- Optional starter data. Safe to run more than once.
INSERT INTO public.categories (name, description) VALUES
  ('Fashion', 'Clothes, shoes and accessories'),
  ('Beauty',  'Perfumes, cosmetics and skincare'),
  ('Food',    'Meals, snacks and drinks'),
  ('Tech',    'Gadgets and accessories'),
  ('Books',   'Books and academic materials'),
  ('More',    'Discover more student businesses')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.service_categories (name, description) VALUES
  ('Tutoring',  'Academic help and revision'),
  ('Printing',  'Printing, binding and typing'),
  ('Laundry',   'Washing and ironing'),
  ('Beauty',    'Hair, nails and grooming'),
  ('Transport', 'Boda, delivery and moving')
ON CONFLICT (name) DO NOTHING;

-- Extra starter categories used by the storefront's category row.
INSERT INTO public.categories (name, description) VALUES
  ('Home & Living', 'Room essentials and decor'),
  ('Other', 'Everything else')
ON CONFLICT (name) DO NOTHING;