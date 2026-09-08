alter table public.products
  add column if not exists archived boolean not null default false;

create index if not exists products_archived_idx
  on public.products(archived);

drop policy if exists "Public product read" on public.products;
create policy "Public product read"
  on public.products for select
  using (archived = false);

create or replace function public.set_product_archived(
  p_product_id uuid,
  p_archived boolean
) returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.products;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;

  update public.products
  set archived = p_archived,
      featured = case when p_archived then false else featured end,
      best_seller = case when p_archived then false else best_seller end,
      updated_at = now()
  where id = p_product_id
  returning * into result;

  if result.id is null then
    raise exception 'Product not found';
  end if;

  if p_archived then
    update public.product_variants
    set active = false
    where product_id = p_product_id;
  end if;

  return result;
end;
$$;

revoke all on function public.set_product_archived(uuid, boolean) from public, anon;
grant execute on function public.set_product_archived(uuid, boolean) to authenticated;

-- Remove the existing QA fixture from the public catalogue without damaging its order history.
update public.products
set archived = true,
    featured = false,
    best_seller = false,
    updated_at = now()
where slug = 'qa-test-product';

update public.product_variants
set active = false
where product_id in (
  select id from public.products where slug = 'qa-test-product'
);
