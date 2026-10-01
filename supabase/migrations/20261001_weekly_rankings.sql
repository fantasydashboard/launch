-- One published analyst weekly list per sport/season/week, read by every user's board.
-- Additive only: no triggers, nothing on existing tables (this DB is shared with TLB).
create table if not exists public.weekly_rankings (
  id uuid primary key default gen_random_uuid(),
  sport text not null,
  season int not null,
  week int not null check (week between 1 and 22),
  source_name text not null,
  body text not null,
  published_by uuid references auth.users(id),
  published_at timestamptz not null default now(),
  unique (sport, season, week)
);
alter table public.weekly_rankings enable row level security;

create policy weekly_rankings_read on public.weekly_rankings
  for select to anon, authenticated using (true);

create policy weekly_rankings_admin_insert on public.weekly_rankings
  for insert to authenticated
  with check (exists (select 1 from public.profiles p
                      where p.id = auth.uid() and p.subscription_tier = 'admin'));

create policy weekly_rankings_admin_update on public.weekly_rankings
  for update to authenticated
  using (exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.subscription_tier = 'admin'))
  with check (exists (select 1 from public.profiles p
                      where p.id = auth.uid() and p.subscription_tier = 'admin'));
