-- =============================================================================
-- BETTING EDGE BETA — DFS pick'em support (Florida scope)
--
-- Two additions:
--   1. A multiplier column. Sportsbooks price each side of a bet; DFS pick'em
--      apps do not. They give you a line and a payout multiplier for the whole
--      entry, so the number that matters is stored per quote rather than derived.
--   2. A manual line table. Sleeper is not carried by any odds feed we can
--      afford, and its own public API documents fantasy endpoints only, with no
--      picks or props. So Sleeper lines get typed in by hand and evaluated
--      against the same market anchor as everything else.
-- =============================================================================

ALTER TABLE public.odds_quotes
  ADD COLUMN IF NOT EXISTS multiplier NUMERIC;

COMMENT ON COLUMN public.odds_quotes.multiplier IS
  'DFS pick''em payout multiplier as reported by the provider. Null for sportsbooks.';

-- Rebuild the latest-price view to carry it through.
DROP VIEW IF EXISTS public.odds_quotes_latest;
CREATE VIEW public.odds_quotes_latest AS
SELECT DISTINCT ON (event_id, market_key, player, outcome, point, book)
  event_id, market_key, player, outcome, point, book, american, multiplier, observed_at
FROM public.odds_quotes
ORDER BY event_id, market_key, player, outcome, point, book, observed_at DESC;

-- ── Hand-entered DFS lines ───────────────────────────────────────────────────
-- Deliberately separate from odds_quotes. Those rows came from a provider and
-- are reproducible; these came from a person reading an app, and mixing the two
-- would make it impossible to tell later which numbers were observed and which
-- were typed. Keeping them apart also means a bad manual entry can be deleted
-- without touching the append-only price history.
CREATE TABLE IF NOT EXISTS public.dfs_manual_lines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book        TEXT NOT NULL DEFAULT 'sleeper',
  player      TEXT NOT NULL,
  market_key  TEXT NOT NULL,
  point       NUMERIC NOT NULL,
  event_id    TEXT REFERENCES public.odds_events(id) ON DELETE SET NULL,
  note        TEXT,
  entered_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Lines move. A newer entry for the same player and market supersedes the old
  -- one rather than replacing it, so the history of what you saw is preserved.
  UNIQUE (book, player, market_key, created_at)
);

CREATE INDEX IF NOT EXISTS idx_dfs_manual_lines_lookup
  ON public.dfs_manual_lines(player, market_key, created_at DESC);

CREATE OR REPLACE VIEW public.dfs_manual_lines_latest AS
SELECT DISTINCT ON (book, player, market_key)
  id, book, player, market_key, point, event_id, note, created_at
FROM public.dfs_manual_lines
ORDER BY book, player, market_key, created_at DESC;

ALTER TABLE public.dfs_manual_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read manual lines" ON public.dfs_manual_lines
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.subscription_tier = 'admin')
  );

CREATE POLICY "Admins can add manual lines" ON public.dfs_manual_lines
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.subscription_tier = 'admin')
  );

CREATE POLICY "Admins can delete manual lines" ON public.dfs_manual_lines
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.subscription_tier = 'admin')
  );
