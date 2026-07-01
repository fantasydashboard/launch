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
  contributor_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_snapshot_key, season)
);

comment on table public.league_season_snapshots is
  'Shared per-league season history (one row per league_snapshot_key + season). '
  'Read by all authenticated users; finished seasons (is_final) are locked from updates.';

-- Note: the unique(league_snapshot_key, season) btree already serves the hot-path
-- lookup "all rows for one league_snapshot_key" (leftmost-prefix), so no separate
-- single-column index is needed.

alter table public.league_season_snapshots enable row level security;

create policy "readable by all authenticated"
  on public.league_season_snapshots for select to authenticated using (true);

create policy "insertable by authenticated"
  on public.league_season_snapshots for insert to authenticated
  with check (auth.uid() = contributor_user_id);

-- Shared refresh model: any authenticated member may update the current
-- (non-final) season row; once a season rolls off (is_final = true) it is locked
-- from further updates. WITH CHECK (true) keeps the post-image unconstrained so a
-- non-final row can be finalized, rather than the implicit USING fallback that
-- would forbid ever setting is_final = true via UPDATE.
create policy "update only non-final"
  on public.league_season_snapshots for update to authenticated
  using (is_final = false)
  with check (true);

-- Keep updated_at fresh on every write (same pattern as matchup_snapshots).
create or replace function public.set_league_season_snapshots_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_league_season_snapshots_updated_at
  on public.league_season_snapshots;
create trigger trg_league_season_snapshots_updated_at
  before update on public.league_season_snapshots
  for each row execute function public.set_league_season_snapshots_updated_at();
