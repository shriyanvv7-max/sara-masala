-- Phase 4: safe Razorpay order lifecycle. Run after the existing migrations.
drop trigger if exists reduce_inventory on public.order_items;
alter table public.orders add column if not exists order_number text unique, add column if not exists customer_name text, add column if not exists customer_email text, add column if not exists customer_phone text, add column if not exists shipping_address jsonb, add column if not exists currency text not null default 'INR', add column if not exists razorpay_order_id text unique, add column if not exists razorpay_payment_id text unique, add column if not exists razorpay_signature text, add column if not exists paid_at timestamptz, add column if not exists inventory_deducted_at timestamptz, add column if not exists confirmation_token uuid not null default gen_random_uuid(), add column if not exists updated_at timestamptz not null default now();
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status in ('pending','confirmed','packed','shipped','out_for_delivery','delivered','cancelled','refunded'));
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check check (payment_status in ('pending','paid','failed','refunded','partially_refunded'));
create unique index if not exists orders_confirmation_token_idx on public.orders(confirmation_token);
create index if not exists orders_customer_created_idx on public.orders(customer_id,created_at desc);
create index if not exists orders_payment_status_idx on public.orders(payment_status,status,created_at desc);

alter table public.order_items add column if not exists product_id uuid references public.products(id), add column if not exists product_name text, add column if not exists weight text, add column if not exists sku text, add column if not exists unit_price numeric(10,2), add column if not exists line_total numeric(10,2);
create table if not exists public.payment_events (id uuid primary key default gen_random_uuid(), provider text not null, provider_event_id text not null unique, event_type text not null, payload jsonb not null, processed_at timestamptz, created_at timestamptz not null default now());
create index if not exists payment_events_provider_idx on public.payment_events(provider,event_type);
alter table public.payment_events enable row level security;
create policy "Admins view payment events" on public.payment_events for select using (public.is_admin());

create or replace function public.confirm_razorpay_payment(p_order_id uuid, p_razorpay_order_id text, p_payment_id text, p_signature text) returns text language plpgsql security definer set search_path=public as $$
declare order_row public.orders%rowtype; item record; variant_stock integer;
begin
 select * into order_row from public.orders where id=p_order_id for update;
 if not found then raise exception 'Order not found'; end if;
 if order_row.razorpay_order_id is distinct from p_razorpay_order_id then raise exception 'Razorpay order mismatch'; end if;
 if order_row.payment_status='paid' then return order_row.order_number; end if;
 if order_row.inventory_deducted_at is not null then raise exception 'Order inventory state is invalid'; end if;
 for item in select * from public.order_items where order_id=p_order_id loop
   select stock into variant_stock from public.product_variants where id=item.variant_id for update;
   if variant_stock is null or variant_stock < item.quantity then raise exception 'Insufficient stock'; end if;
 end loop;
 for item in select * from public.order_items where order_id=p_order_id loop
   update public.product_variants set stock=stock-item.quantity where id=item.variant_id;
 end loop;
 update public.orders set payment_status='paid',status='confirmed',razorpay_payment_id=p_payment_id,razorpay_signature=p_signature,paid_at=now(),inventory_deducted_at=now(),updated_at=now() where id=p_order_id;
 return order_row.order_number;
end; $$;
revoke all on function public.confirm_razorpay_payment(uuid,text,text,text) from public;
