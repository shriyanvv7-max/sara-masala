begin;

alter table public.orders
  add column if not exists expires_at timestamptz,
  add column if not exists payment_review_reason text;

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status in ('pending','confirmed','packed','shipped','out_for_delivery','delivered','cancelled','refunded','abandoned','payment_review'));
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check check (payment_status in ('pending','paid','failed','expired','refunded','partially_refunded'));

update public.orders set expires_at = created_at + interval '30 minutes' where payment_method = 'razorpay' and expires_at is null;
update public.orders set payment_status='expired',status='abandoned',updated_at=now() where payment_method='razorpay' and payment_status='pending' and status='pending' and expires_at<=now();
with duplicates as (
  select id,row_number() over(partition by checkout_fingerprint order by created_at desc,id desc) as position
  from public.orders where payment_method='razorpay' and payment_status='pending' and status='pending' and checkout_fingerprint is not null
)
update public.orders set payment_status='expired',status='abandoned',updated_at=now()
where id in (select id from duplicates where position>1);

create index if not exists orders_pending_expiry_idx on public.orders(expires_at) where payment_status = 'pending';
create unique index if not exists orders_one_active_checkout_idx on public.orders(checkout_fingerprint) where payment_method='razorpay' and payment_status='pending' and status='pending' and checkout_fingerprint is not null;

create or replace function public.expire_pending_razorpay_orders()
returns integer language plpgsql security definer set search_path=public as $$
declare affected integer;
begin
  update orders set payment_status='expired',status='abandoned',updated_at=now()
  where payment_method='razorpay' and payment_status='pending' and status='pending' and expires_at<=now();
  get diagnostics affected = row_count;
  return affected;
end $$;

create or replace function public.prepare_razorpay_order(p_request_id uuid,p_fingerprint text,p_customer jsonb,p_address jsonb,p_items jsonb,p_shipping numeric,p_expected_subtotal numeric)
returns jsonb language plpgsql security definer set search_path=public as $$
declare o public.orders%rowtype; i record; variant_row record; subtotal numeric:=0;
begin
 if p_shipping<0 or jsonb_array_length(p_items)<1 then raise exception 'Invalid order'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 perform pg_advisory_xact_lock(hashtextextended(p_fingerprint,1));
 if exists(select 1 from orders where checkout_request_id=p_request_id) then raise exception 'Request exists'; end if;
 for i in select * from jsonb_to_recordset(p_items) as x(variant_id uuid,quantity integer) order by variant_id loop
   select * into variant_row from product_variants where id=i.variant_id for update;
   if not found or not variant_row.active or i.quantity<1 or i.quantity>99 or variant_row.stock<i.quantity then raise exception 'Unavailable'; end if;
   subtotal:=subtotal+variant_row.price*i.quantity;
 end loop;
 if subtotal<>p_expected_subtotal then raise exception 'Price changed'; end if;
 insert into orders(order_number,checkout_request_id,checkout_fingerprint,customer_name,customer_email,customer_phone,shipping_address,subtotal,shipping,discount,total,currency,payment_method,payment_status,status,expires_at)
 values('SM-'||to_char(now(),'YYYY')||'-'||upper(substr(replace(p_request_id::text,'-',''),1,16)),p_request_id,p_fingerprint,p_customer->>'name',p_customer->>'email',p_customer->>'phone',p_address,subtotal,p_shipping,0,subtotal+p_shipping,'INR','razorpay','pending','pending',now()+interval '30 minutes') returning * into o;
 insert into order_items(order_id,variant_id,product_id,product_name,weight,sku,quantity,price,unit_price,line_total)
 select o.id,pv.id,p.id,p.name,pv.weight,pv.sku,x.quantity,pv.price,pv.price,pv.price*x.quantity
 from jsonb_to_recordset(p_items) as x(variant_id uuid,quantity integer)
 join product_variants pv on pv.id=x.variant_id join products p on p.id=pv.product_id;
 return to_jsonb(o);
end $$;

create or replace function public.confirm_razorpay_payment(p_order_id uuid,p_razorpay_order_id text,p_payment_id text,p_signature text)
returns text language plpgsql security definer set search_path=public as $$
declare o public.orders%rowtype; i record; available integer;
begin
 select * into o from orders where id=p_order_id for update;
 if not found or o.razorpay_order_id is distinct from p_razorpay_order_id or o.payment_method<>'razorpay' then raise exception 'Order mismatch'; end if;
 if o.payment_status='paid' and o.status='payment_review' then
   if o.razorpay_payment_id is distinct from p_payment_id then raise exception 'Payment mismatch'; end if;
   return o.order_number;
 end if;
 if o.inventory_deducted_at is not null then
   if o.razorpay_payment_id is distinct from p_payment_id then raise exception 'Payment mismatch'; end if;
   return o.order_number;
 end if;
 if o.status='abandoned' or o.payment_status='expired' or o.expires_at<=now() then
   update orders set payment_status='paid',status='payment_review',razorpay_payment_id=p_payment_id,razorpay_signature=p_signature,paid_at=now(),payment_review_reason='Payment captured after checkout expiry; review and refund or fulfil manually.',updated_at=now() where id=o.id;
   return o.order_number;
 end if;
 if o.status='cancelled' or not exists(select 1 from order_items where order_id=o.id) then raise exception 'Order requires review'; end if;
 for i in select variant_id,sum(quantity)::integer quantity from order_items where order_id=o.id group by variant_id order by variant_id loop
   select stock into available from product_variants where id=i.variant_id for update;
   if not found or available<i.quantity then raise exception 'Insufficient stock'; end if;
   update product_variants set stock=stock-i.quantity where id=i.variant_id;
 end loop;
 update orders set payment_status='paid',status='confirmed',razorpay_payment_id=p_payment_id,razorpay_signature=p_signature,paid_at=now(),inventory_deducted_at=now(),updated_at=now() where id=o.id;
 return o.order_number;
end $$;

revoke all on function public.expire_pending_razorpay_orders() from public,anon,authenticated;
revoke all on function public.prepare_razorpay_order(uuid,text,jsonb,jsonb,jsonb,numeric,numeric) from public,anon,authenticated;
revoke all on function public.confirm_razorpay_payment(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.expire_pending_razorpay_orders() to service_role;
grant execute on function public.prepare_razorpay_order(uuid,text,jsonb,jsonb,jsonb,numeric,numeric) to service_role;
grant execute on function public.confirm_razorpay_payment(uuid,text,text,text) to service_role;

commit;
