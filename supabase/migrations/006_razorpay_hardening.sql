begin;
-- Apply after 003 and the catalogue migrations. All payment writes use service_role.
alter table public.orders add column if not exists checkout_request_id uuid unique,
  add column if not exists checkout_fingerprint text,
  add column if not exists refund_request_id uuid,
  add column if not exists razorpay_refund_id text unique,
  add column if not exists refund_status text,
  add column if not exists refund_requested_by uuid,
  add column if not exists refund_reason text;
create index if not exists orders_status_created_idx on public.orders(status,created_at);
create index if not exists orders_created_idx on public.orders(created_at);
-- Existing UNIQUE constraints index order_number and both Razorpay IDs.
drop policy if exists "Admins manage orders" on public.orders;
drop policy if exists "Admins manage order items" on public.order_items;
drop policy if exists "Admins read orders" on public.orders;
drop policy if exists "Admins read order items" on public.order_items;
create policy "Admins read orders" on public.orders for select using (public.is_admin());
create policy "Admins read order items" on public.order_items for select using (public.is_admin());
revoke insert,update,delete on public.orders,public.order_items,public.payment_events from anon,authenticated;

create or replace function public.prepare_razorpay_order(p_request_id uuid,p_fingerprint text,p_customer jsonb,p_address jsonb,p_items jsonb,p_shipping numeric,p_expected_subtotal numeric)
returns jsonb language plpgsql security definer set search_path=public as $$
declare o public.orders%rowtype; i record; v record; subtotal numeric:=0;
begin
 if p_shipping<0 or jsonb_array_length(p_items)<1 then raise exception 'Invalid order'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 if exists(select 1 from orders where checkout_request_id=p_request_id) then raise exception 'Request exists'; end if;
 for i in select * from jsonb_to_recordset(p_items) as x(variant_id uuid,quantity integer) order by variant_id loop
   select * into v from product_variants where id=i.variant_id for update;
   if not found or not v.active or i.quantity<1 or i.quantity>99 or v.stock<i.quantity then raise exception 'Unavailable'; end if;
   subtotal:=subtotal+v.price*i.quantity;
 end loop;
 if subtotal<>p_expected_subtotal then raise exception 'Price changed'; end if;
 insert into orders(order_number,checkout_request_id,checkout_fingerprint,customer_name,customer_email,customer_phone,shipping_address,subtotal,shipping,discount,total,currency,payment_method,payment_status,status)
 values('SM-'||to_char(now(),'YYYY')||'-'||upper(substr(replace(p_request_id::text,'-',''),1,16)),p_request_id,p_fingerprint,p_customer->>'name',p_customer->>'email',p_customer->>'phone',p_address,subtotal,p_shipping,0,subtotal+p_shipping,'INR','razorpay','pending','pending') returning * into o;
 insert into order_items(order_id,variant_id,product_id,product_name,weight,sku,quantity,price,unit_price,line_total)
 select o.id,v.id,p.id,p.name,v.weight,v.sku,x.quantity,v.price,v.price,v.price*x.quantity
 from jsonb_to_recordset(p_items) as x(variant_id uuid,quantity integer)
 join product_variants v on v.id=x.variant_id join products p on p.id=v.product_id;
 return to_jsonb(o);
end $$;

create or replace function public.confirm_razorpay_payment(p_order_id uuid,p_razorpay_order_id text,p_payment_id text,p_signature text)
returns text language plpgsql security definer set search_path=public as $$
declare o public.orders%rowtype; i record; available integer;
begin
 select * into o from orders where id=p_order_id for update;
 if not found or o.razorpay_order_id is distinct from p_razorpay_order_id or o.payment_method<>'razorpay' then raise exception 'Order mismatch'; end if;
 if o.inventory_deducted_at is not null then
   if o.razorpay_payment_id is distinct from p_payment_id then raise exception 'Payment mismatch'; end if;
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

create or replace function public.process_razorpay_event(p_event_id text,p_type text,p_payload jsonb,p_order_id uuid,p_payment_id text,p_amount bigint,p_refund_id text default null)
returns void language plpgsql security definer set search_path=public as $$
declare e public.payment_events%rowtype; o public.orders%rowtype;
begin
 insert into payment_events(provider,provider_event_id,event_type,payload) values('razorpay',p_event_id,p_type,p_payload) on conflict(provider_event_id) do nothing;
 select * into e from payment_events where provider_event_id=p_event_id for update;
 if e.processed_at is not null then return; end if;
 select * into o from orders where id=p_order_id for update;
 if not found then raise exception 'Order not found'; end if;
 if p_type in ('payment.captured','order.paid') then
   if p_amount<>round(o.total*100)::bigint then raise exception 'Amount mismatch'; end if;
   perform confirm_razorpay_payment(o.id,o.razorpay_order_id,p_payment_id,'webhook');
 elsif p_type='payment.failed' then
   update orders set payment_status='failed',updated_at=now() where id=o.id and payment_status='pending' and inventory_deducted_at is null;
 elsif p_type='refund.processed' then
   if o.razorpay_payment_id is distinct from p_payment_id then raise exception 'Refund mismatch'; end if;
   update orders set payment_status=case when o.payment_status='refunded' or p_amount>=round(o.total*100) then 'refunded' else 'partially_refunded' end,
   status=case when o.payment_status='refunded' or p_amount>=round(o.total*100) then 'refunded' else status end,
   razorpay_refund_id=p_refund_id,refund_status='processed',updated_at=now() where id=o.id;
 end if;
 update payment_events set processed_at=now() where id=e.id;
end $$;
revoke all on function public.prepare_razorpay_order(uuid,text,jsonb,jsonb,jsonb,numeric,numeric) from public,anon,authenticated;
revoke all on function public.confirm_razorpay_payment(uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.process_razorpay_event(text,text,jsonb,uuid,text,bigint,text) from public,anon,authenticated;
grant execute on function public.prepare_razorpay_order(uuid,text,jsonb,jsonb,jsonb,numeric,numeric) to service_role;
grant execute on function public.confirm_razorpay_payment(uuid,text,text,text) to service_role;
grant execute on function public.process_razorpay_event(text,text,jsonb,uuid,text,bigint,text) to service_role;
commit;
