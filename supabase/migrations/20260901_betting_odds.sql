-- =============================================================================
-- BETTING EDGE BETA — odds snapshot storage
--
-- Why snapshots instead of calling the odds API from the browser:
--   1. Cost. Every provider bills per request or per object. Fetching on page
--      load ties the data bill to traffic instead of to revenue, which is the
--      wrong way round and gets worse exactly when the product succeeds. On the
--      free tiers we are working with (hundreds of requests a month, not
--      thousands) a single curious user refreshing a page could burn the month.
--   2. History. Line movement is the input to closing line value, which is the
--      only honest early measure of whether any of this works. Nobody sells you
--      back the history you did not store, so we start storing on day one.
--   3. Keys. The provider key stays server side. It cannot ship to the browser.
--
-- Access model: read is admin only for the beta (profiles.subscription_tier =
-- 'admin'). Writes come from the service role via the cron endpoint, never from
-- a user session.
-- =============================================================================

-- ── Events ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.odds_events (
  id            TEXT PRIMARY KEY,             -- provider event id, prefixed by provider
  provider      TEXT NOT NULL,
  sport_key     TEXT NOT NULL,                -- 'americanfootball_nfl'
  league        TEXT,                          -- 'NFL'
  commence_time TIMESTAMPTZ NOT NULL,
  home_team     TEXT,
  away_team     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_odds_events_commence ON public.odds_events(commence_time);
CREATE INDEX IF NOT EXISTS idx_odds_events_sport ON public.odds_events(sport_key, commence_time);

-- ── Quotes ───────────────────────────────────────────────────────────────────
-- One row per book, per market, per side, per observation. Append only: an
-- UPDATE here would destroy the line history that is half the reason the table
-- exists. The uniqueness constraint is on the full tuple INCLUDING observed_at,
-- so re-running a fetch is idempotent within a snapshot but still accumulates
-- across snapshots.
CREATE TABLE IF NOT EXISTS public.odds_quotes (
  id           BIGSERIAL PRIMARY KEY,
  event_id     TEXT NOT NULL REFERENCES public.odds_events(id) ON DELETE CASCADE,
  market_key   TEXT NOT NULL,                 -- 'h2h', 'totals', 'player_rush_yds'
  player       TEXT,                          -- null for game lines
  outcome      TEXT NOT NULL,                 -- 'Over', 'Under', team name
  point        NUMERIC,                       -- the line; null for moneylines
  book         TEXT NOT NULL,
  american     INTEGER NOT NULL,
  observed_at  TIMESTAMPTZ NOT NULL,
  fetch_id     BIGINT,
  UNIQUE (event_id, market_key, player, outcome, point, book, observed_at)
);

CREATE INDEX IF NOT EXISTS idx_odds_quotes_lookup
  ON public.odds_quotes(event_id, market_key, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_odds_quotes_player
  ON public.odds_quotes(player, observed_at DESC) WHERE player IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_odds_quotes_recent
  ON public.odds_quotes(observed_at DESC);

-- ── Fetch log ────────────────────────────────────────────────────────────────
-- Credit accounting. On a free tier the monthly allowance is small enough that
-- you can spend it in an afternoon without noticing, so every call is recorded
-- with what it cost and the budget check reads from here before firing.
CREATE TABLE IF NOT EXISTS public.odds_fetch_log (
  id             BIGSERIAL PRIMARY KEY,
  provider       TEXT NOT NULL,
  endpoint       TEXT NOT NULL,
  sport_key      TEXT,
  markets        TEXT[],
  ok             BOOLEAN NOT NULL,
  http_status    INTEGER,
  error          TEXT,
  -- Provider-reported usage where available. The Odds API returns these as
  -- response headers; trusting our own count instead has been how people blow
  -- through a quota they thought they were tracking.
  credits_used       INTEGER,
  credits_remaining  INTEGER,
  quotes_written INTEGER NOT NULL DEFAULT 0,
  duration_ms    INTEGER,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_odds_fetch_log_recent ON public.odds_fetch_log(started_at DESC);

ALTER TABLE public.odds_quotes
  ADD CONSTRAINT fk_odds_quotes_fetch
  FOREIGN KEY (fetch_id) REFERENCES public.odds_fetch_log(id) ON DELETE SET NULL;

-- ── Latest quote per book/market/side ────────────────────────────────────────
-- The screener always wants the newest price and never wants to scan history to
-- find it. DISTINCT ON is the cheap way to do that in Postgres.
CREATE OR REPLACE VIEW public.odds_quotes_latest AS
SELECT DISTINCT ON (event_id, market_key, player, outcome, point, book)
  event_id, market_key, player, outcome, point, book, american, observed_at
FROM public.odds_quotes
ORDER BY event_id, market_key, player, outcome, point, book, observed_at DESC;

-- ── Row level security ───────────────────────────────────────────────────────
ALTER TABLE public.odds_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.odds_quotes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.odds_fetch_log ENABLE ROW LEVEL SECURITY;

-- Admin-only read for the beta. When this opens up to Season Pass holders the
-- change is this predicate and nothing else, which is the point of putting the
-- gate in the database rather than only in the Vue router.
CREATE POLICY "Admins can read odds events" ON public.odds_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.subscription_tier = 'admin')
  );

CREATE POLICY "Admins can read odds quotes" ON public.odds_quotes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.subscription_tier = 'admin')
  );

CREATE POLICY "Admins can read fetch log" ON public.odds_fetch_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.subscription_tier = 'admin')
  );

-- No INSERT/UPDATE/DELETE policies on purpose. Writes go through the service
-- role key in the cron endpoint, which bypasses RLS. A user session should never
-- be able to write a price into this table.

COMMENT ON TABLE public.odds_quotes IS
  'Append-only sportsbook price observations. Never UPDATE: the history is the asset.';
