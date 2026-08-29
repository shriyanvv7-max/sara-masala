-- Preserve each current selling price as MRP, then apply the August sale prices.
alter table public.product_variants add column if not exists mrp numeric(10,2);
update public.product_variants set mrp = price where mrp is null;
alter table public.product_variants alter column mrp set not null;
alter table public.product_variants add constraint product_variants_mrp_check check (mrp >= price);

update public.product_variants v
set price = discounted.price
from (values
  ('Dhaniya Powder', '125g', 50), ('Dhaniya Powder', '250g', 100), ('Dhaniya Powder', '500g', 200),
  ('Turmeric Powder', '125g', 50), ('Turmeric Powder', '250g', 100), ('Turmeric Powder', '500g', 200),
  ('Spice Powder', '125g', 150), ('Spice Powder', '250g', 300), ('Spice Powder', '500g', 600),
  ('Kurma Powder', '100g', 100), ('Kurma Powder', '250g', 250), ('Kurma Powder', '500g', 500),
  ('Rasam Powder', '125g', 100), ('Rasam Powder', '250g', 200), ('Rasam Powder', '500g', 400),
  ('Paruppu Podi', '150g', 100),
  ('Chettinad Chicken Masala', '125g', 100), ('Chettinad Chicken Masala', '250g', 200), ('Chettinad Chicken Masala', '500g', 400),
  ('Idli Podi', '150g', 100), ('Chutney Podi', '150g', 100),
  ('Sambar Powder', '125g', 100), ('Sambar Powder', '250g', 200), ('Sambar Powder', '500g', 400),
  ('Mutton Powder', '125g', 100), ('Mutton Powder', '250g', 200), ('Mutton Powder', '500g', 400),
  ('Soup Powder', '125g', 100), ('Soup Powder', '250g', 200), ('Soup Powder', '500g', 400),
  ('Red Chilli Powder', '125g', 75), ('Red Chilli Powder', '250g', 150), ('Red Chilli Powder', '500g', 300),
  ('Kashmiri Chilli Powder', '100g', 100), ('Kashmiri Chilli Powder', '250g', 250), ('Kashmiri Chilli Powder', '500g', 500),
  ('Chettinad Paneer Masala', '125g', 100), ('Chettinad Paneer Masala', '250g', 200), ('Chettinad Paneer Masala', '500g', 400),
  ('Chettinad Mushroom Masala', '125g', 100), ('Chettinad Mushroom Masala', '250g', 200), ('Chettinad Mushroom Masala', '500g', 400),
  ('Curry Leaves Podi', '150g', 100), ('Moringa Leaves Podi', '150g', 100), ('Chettinad Chukka Powder', '125g', 100)
) as discounted(product_name, weight, price)
join public.products p on p.name = discounted.product_name
where v.product_id = p.id and v.weight = discounted.weight;
