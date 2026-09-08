begin;

create table if not exists public.order_email_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_key text not null,
  recipient text not null,
  email_type text not null,
  status text not null check (status in ('sending','sent','failed')),
  attempt_count integer not null default 1,
  provider_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_id,event_key,recipient)
);

create index if not exists order_email_events_order_idx on public.order_email_events(order_id,created_at desc);
alter table public.order_email_events enable row level security;
drop policy if exists "Admins read order email events" on public.order_email_events;
create policy "Admins read order email events" on public.order_email_events for select using (public.is_admin());
revoke insert,update,delete on public.order_email_events from anon,authenticated;

commit;
