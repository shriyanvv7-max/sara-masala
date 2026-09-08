begin;

create table if not exists public.api_rate_limits (
  bucket text not null,
  key_hash text not null,
  window_started_at timestamptz not null default now(),
  hits integer not null default 1 check (hits > 0),
  primary key (bucket, key_hash)
);

alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from anon, authenticated;

create or replace function public.consume_api_rate_limit(
  p_bucket text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed boolean;
begin
  if length(p_bucket) < 1 or length(p_bucket) > 80 or
     length(p_key_hash) <> 64 or p_limit < 1 or p_limit > 10000 or
     p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Invalid rate limit configuration';
  end if;

  insert into public.api_rate_limits(bucket, key_hash, window_started_at, hits)
  values (p_bucket, p_key_hash, now(), 1)
  on conflict (bucket, key_hash) do update
  set window_started_at = case
        when api_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then now()
        else api_rate_limits.window_started_at
      end,
      hits = case
        when api_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then 1
        else api_rate_limits.hits + 1
      end
  returning hits <= p_limit into allowed;

  return allowed;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, text, integer, integer) to service_role;

create index if not exists product_variants_product_active_idx
  on public.product_variants(product_id, active);
create index if not exists order_items_variant_idx
  on public.order_items(variant_id);
create index if not exists orders_payment_created_idx
  on public.orders(payment_status, created_at desc);
create index if not exists orders_customer_created_idx
  on public.orders(customer_id, created_at desc)
  where customer_id is not null;

commit;
