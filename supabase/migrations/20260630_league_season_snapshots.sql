-- League season snapshots: shared per-league history so any member's app can
-- backfill any other member's view. Mirrors matchup_snapshots' RLS posture.
create table if not exists public.league_season_snapshots (
  id uuid primary key default gen_random_uuid(),
  league_snapshot_key text not null,
  platform text not null,
  sport text not null,
  season int not null,
  is_final boolean not null default false,
  payload jsonb not null,
  contributor_user_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_snapshot_key, season)
);

create index if not exists league_season_snapshots_key_idx
  on public.league_season_snapshots (league_snapshot_key);

alter table public.league_season_snapshots enable row level security;

create policy "readable by all authenticated"
  on public.league_season_snapshots for select to authenticated using (true);

create policy "insertable by authenticated"
  on public.league_season_snapshots for insert to authenticated
  with check (auth.uid() = contributor_user_id);

create policy "update only non-final"
  on public.league_season_snapshots for update to authenticated
  using (is_final = false);

-- Keep updated_at fresh on every write (same pattern as matchup_snapshots).
create or replace function public.set_league_season_snapshots_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_league_season_snapshots_updated_at
  on public.league_season_snapshots;
create trigger trg_league_season_snapshots_updated_at
  before update on public.league_season_snapshots
  for each row execute function public.set_league_season_snapshots_updated_at();
