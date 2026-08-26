-- Yahoo API data purge — run once in the Supabase SQL editor.
--
-- The Yahoo Developer API Terms require removal of Yahoo user data obtained
-- through their APIs within 24 hours unless Yahoo identifies it as storable
-- indefinitely. Nothing in our integration has that identification.
--
-- The code no longer writes these rows (src/lib/yahooRetention.ts). This clears
-- what was written before that gate existed.
--
-- Hand-entered seasons are deliberately NOT deleted: a season a user typed in
-- themselves was not obtained through the Yahoo APIs. That is what source
-- 'manual' means, and it is the whole reason the column is being filtered on.

-- 1. Inspect first. Run these two SELECTs and read the counts before deleting.
select count(*) as auto_yahoo_history_rows
from league_season_snapshots
where league_snapshot_key like 'yahoo:%' and source = 'auto';

select count(*) as manual_yahoo_history_rows_that_will_be_KEPT
from league_season_snapshots
where league_snapshot_key like 'yahoo:%' and source = 'manual';

select count(*) as yahoo_matchup_rows
from matchup_snapshots
where platform = 'yahoo';

-- 2. Delete. API-derived Yahoo history only.
delete from league_season_snapshots
where league_snapshot_key like 'yahoo:%' and source = 'auto';

-- 3. Delete. Every Yahoo matchup snapshot — all of them are API-derived.
delete from matchup_snapshots
where platform = 'yahoo';

-- 4. Confirm both are zero.
select
  (select count(*) from league_season_snapshots
     where league_snapshot_key like 'yahoo:%' and source = 'auto') as history_remaining,
  (select count(*) from matchup_snapshots where platform = 'yahoo') as matchups_remaining;
