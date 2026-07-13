-- Promote an authenticated user by setting auth.users.raw_app_meta_data.role to 'admin'
-- from the Supabase dashboard or a service-role script.
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create policy "Admins manage categories" on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage products" on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage variants" on public.product_variants for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins view customers" on public.customers for select using (public.is_admin());
create policy "Admins view addresses" on public.addresses for select using (public.is_admin());
create policy "Admins manage orders" on public.orders for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage order items" on public.order_items for all using (public.is_admin()) with check (public.is_admin());
