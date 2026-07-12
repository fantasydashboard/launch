-- Phase 2b: manual league-history backfill.
-- Adds a `source` column distinguishing platform-captured ('auto') seasons from
-- hand-entered ('manual') ones, plus RLS letting a contributor manage their OWN
-- manual rows even once the season is final. Applied to prod on 2026-07-12 as part
-- of the combined create script; committed here so a fresh db reset matches prod.
alter table public.league_season_snapshots
  add column if not exists source text not null default 'auto';

-- Manual backfill: a contributor may fix/relock their OWN hand-entered rows even
-- when is_final = true. Auto rows remain governed by "update only non-final".
drop policy if exists "contributor manages own manual rows" on public.league_season_snapshots;
create policy "contributor manages own manual rows"
  on public.league_season_snapshots for update to authenticated
  using (source = 'manual' and auth.uid() = contributor_user_id)
  with check (source = 'manual' and auth.uid() = contributor_user_id);

drop policy if exists "contributor deletes own manual rows" on public.league_season_snapshots;
create policy "contributor deletes own manual rows"
  on public.league_season_snapshots for delete to authenticated
  using (source = 'manual' and auth.uid() = contributor_user_id);
