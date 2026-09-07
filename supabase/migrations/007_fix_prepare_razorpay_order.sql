begin;

create or replace function public.prepare_razorpay_order(
  p_request_id uuid,
  p_fingerprint text,
  p_customer jsonb,
  p_address jsonb,
  p_items jsonb,
  p_shipping numeric,
  p_expected_subtotal numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
  i record;
  variant_row record;
  subtotal numeric := 0;
begin
  if p_shipping < 0 or jsonb_array_length(p_items) < 1 then
    raise exception 'Invalid order';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_request_id::text, 0)
  );

  if exists (
    select 1
    from orders
    where checkout_request_id = p_request_id
  ) then
    raise exception 'Request exists';
  end if;

  for i in
    select *
    from jsonb_to_recordset(p_items)
      as x(variant_id uuid, quantity integer)
    order by variant_id
  loop

    select *
    into variant_row
    from product_variants
    where id = i.variant_id
    for update;

    if not found
       or not variant_row.active
       or i.quantity < 1
       or i.quantity > 99
       or variant_row.stock < i.quantity
    then
      raise exception 'Unavailable';
    end if;

    subtotal := subtotal + variant_row.price * i.quantity;
  end loop;

  if subtotal <> p_expected_subtotal then
    raise exception 'Price changed';
  end if;

  insert into orders(
    order_number,
    checkout_request_id,
    checkout_fingerprint,
    customer_name,
    customer_email,
    customer_phone,
    shipping_address,
    subtotal,
    shipping,
    discount,
    total,
    currency,
    payment_method,
    payment_status,
    status
  )
  values(
    'SM-' || to_char(now(), 'YYYY') || '-' ||
      upper(substr(replace(p_request_id::text, '-', ''), 1, 16)),
    p_request_id,
    p_fingerprint,
    p_customer->>'name',
    p_customer->>'email',
    p_customer->>'phone',
    p_address,
    subtotal,
    p_shipping,
    0,
    subtotal + p_shipping,
    'INR',
    'razorpay',
    'pending',
    'pending'
  )
  returning * into o;

  insert into order_items(
    order_id,
    variant_id,
    product_id,
    product_name,
    weight,
    sku,
    quantity,
    price,
    unit_price,
    line_total
  )
  select
    o.id,
    pv.id,
    p.id,
    p.name,
    pv.weight,
    pv.sku,
    x.quantity,
    pv.price,
    pv.price,
    pv.price * x.quantity
  from jsonb_to_recordset(p_items)
       as x(variant_id uuid, quantity integer)
  join product_variants pv
    on pv.id = x.variant_id
  join products p
    on p.id = pv.product_id;

  return to_jsonb(o);
end;
$$;

revoke all on function
public.prepare_razorpay_order(
  uuid,text,jsonb,jsonb,jsonb,numeric,numeric
)
from public, anon, authenticated;

grant execute on function
public.prepare_razorpay_order(
  uuid,text,jsonb,jsonb,jsonb,numeric,numeric
)
to service_role;

commit;