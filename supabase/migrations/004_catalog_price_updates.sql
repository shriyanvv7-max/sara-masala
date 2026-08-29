-- Sara Masala catalogue price list - July 2026.
update public.product_variants v
set price = prices.price
from (values
  ('Dhaniya Powder', '125g', 60), ('Dhaniya Powder', '250g', 115), ('Dhaniya Powder', '500g', 225),
  ('Turmeric Powder', '125g', 60), ('Turmeric Powder', '250g', 115), ('Turmeric Powder', '500g', 230),
  ('Spice Powder', '125g', 170), ('Spice Powder', '250g', 345), ('Spice Powder', '500g', 675),
  ('Rasam Powder', '125g', 115), ('Rasam Powder', '250g', 230), ('Rasam Powder', '500g', 450),
  ('Chettinad Chicken Masala', '125g', 115), ('Chettinad Chicken Masala', '250g', 230), ('Chettinad Chicken Masala', '500g', 450),
  ('Sambar Powder', '125g', 115), ('Sambar Powder', '250g', 230), ('Sambar Powder', '500g', 450),
  ('Soup Powder', '125g', 115), ('Soup Powder', '250g', 230), ('Soup Powder', '500g', 450),
  ('Mutton Powder', '125g', 115), ('Mutton Powder', '250g', 230), ('Mutton Powder', '500g', 450),
  ('Red Chilli Powder', '125g', 90), ('Red Chilli Powder', '250g', 175), ('Red Chilli Powder', '500g', 340),
  ('Chettinad Paneer Masala', '125g', 115), ('Chettinad Paneer Masala', '250g', 230), ('Chettinad Paneer Masala', '500g', 450),
  ('Chettinad Mushroom Masala', '125g', 115), ('Chettinad Mushroom Masala', '250g', 230), ('Chettinad Mushroom Masala', '500g', 450),
  ('Paruppu Podi', '150g', 115), ('Idli Podi', '150g', 115), ('Chutney Podi', '150g', 115),
  ('Curry Leaves Podi', '150g', 115), ('Moringa Leaves Podi', '150g', 115)
) as prices(product_name, weight, price)
join public.products p on p.name = prices.product_name
where v.product_id = p.id and v.weight = prices.weight;

-- The supplied pack sizes replace the seed sizes for these three products.
update public.product_variants v set weight = '100g', price = 115
from public.products p where v.product_id = p.id and p.name = 'Kurma Powder' and v.weight = '125g';
update public.product_variants v set price = 290
from public.products p where v.product_id = p.id and p.name = 'Kurma Powder' and v.weight = '250g';
update public.product_variants v set price = 565
from public.products p where v.product_id = p.id and p.name = 'Kurma Powder' and v.weight = '500g';

update public.product_variants v set weight = '100g', price = 115
from public.products p where v.product_id = p.id and p.name = 'Kashmiri Chilli Powder' and v.weight = '125g';
update public.product_variants v set price = 285
from public.products p where v.product_id = p.id and p.name = 'Kashmiri Chilli Powder' and v.weight = '250g';
update public.product_variants v set price = 560
from public.products p where v.product_id = p.id and p.name = 'Kashmiri Chilli Powder' and v.weight = '500g';

update public.product_variants v set weight = '125g', price = 115
from public.products p where v.product_id = p.id and p.name = 'Chettinad Chukka Powder' and v.weight = '150g';
