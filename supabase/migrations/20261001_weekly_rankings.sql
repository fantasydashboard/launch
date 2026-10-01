-- One published analyst weekly list per sport/season/week, read by every user's board.
-- Additive only: no triggers, nothing on existing tables (this DB is shared with TLB).
create table if not exists public.weekly_rankings (
  id uuid primary key default gen_random_uuid(),
  sport text not null check (sport in ('football')),
  season int not null,
  week int not null check (week between 1 and 22),
  source_name text not null,
  body text not null,
  published_by uuid references auth.users(id),
  published_at timestamptz not null default now(),
  unique (sport, season, week)
);
alter table public.weekly_rankings enable row level security;

drop policy if exists weekly_rankings_read on public.weekly_rankings;
create policy weekly_rankings_read on public.weekly_rankings
  for select to anon, authenticated using (true);

drop policy if exists weekly_rankings_admin_insert on public.weekly_rankings;
create policy weekly_rankings_admin_insert on public.weekly_rankings
  for insert to authenticated
  with check (published_by = auth.uid() and exists (select 1 from public.profiles p
                      where p.id = auth.uid() and p.subscription_tier = 'admin'));

drop policy if exists weekly_rankings_admin_update on public.weekly_rankings;
create policy weekly_rankings_admin_update on public.weekly_rankings
  for update to authenticated
  using (exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.subscription_tier = 'admin'))
  with check (published_by = auth.uid() and exists (select 1 from public.profiles p
                      where p.id = auth.uid() and p.subscription_tier = 'admin'));
