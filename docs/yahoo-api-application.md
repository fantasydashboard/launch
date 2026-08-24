# Yahoo Fantasy Sports API — access application

Submit at https://sports.yahoo.com/developer/access/

**Client ID field:** paste the Client ID of the EXISTING YDN app — the one whose
secret is already in Supabase. Leaving it blank makes Yahoo provision a new one
on approval, which would mean re-doing the credential swap that caused the
`invalid_scope` failure in August.

**Expected Users:** Small (< 1,000 users) — change if that is wrong.

**Access Level:** Read-only is correct. We never write to Yahoo.

---

## Product

Ultimate Fantasy Dashboard (ultimatefantasydashboard.com) is a companion
dashboard for people who already play fantasy sports on Yahoo, ESPN and Sleeper.
It does not host leagues, run drafts, or process transactions. Users connect the
leagues they already play in, and the product gives them analysis across all of
them in one place: projected standings, matchup breakdowns, waiver-wire value,
trade evaluation, and start/sit decisions. It supports football, baseball,
basketball and hockey, and both points and head-to-head category scoring.

The product is a companion to the platforms it reads, not a replacement for
them. Every action a user decides on — setting a lineup, claiming a player,
proposing a trade — is taken on Yahoo, in Yahoo's own app. We have no ability to
act on a user's behalf and are not requesting one; read-only access is what the
product needs.

## Yahoo Fantasy Sports data required

Only the authenticated user's own leagues, and only what the analysis needs:

- `users;use_login=1/games` — to list the leagues the user plays in
- `league/{league_key}/settings` — scoring rules, roster slots, league size
- `league/{league_key}/standings` — records and points for/against
- `league/{league_key}/teams` — team names and managers within the user's leagues
- `league/{league_key}/scoreboard` — weekly matchups
- `team/{team_key}/roster` — the user's own roster and lineup slots
- `league/{league_key}/players` — player pool, ownership status, projected and
  actual points

We do not request other users' private data, we do not crawl leagues the
authenticated user does not belong to, and we do not aggregate Yahoo data across
users into any public or shared dataset.

## Intended user base

Individual fantasy managers who play in multiple leagues, often across more than
one platform. Expected under 1,000 users in the first three to six months.
Access is per-user and OAuth-authorized: a user sees only the leagues their own
Yahoo account belongs to.

## Commercial use — requesting express written permission

Disclosing this directly, because the Yahoo Developer API Terms require prior
express written permission to derive income from use of the APIs.

Ultimate Fantasy Dashboard has paid subscription tiers. Users pay for the
analysis product as a whole — the projections, the draft tooling, the
cross-platform views — not for access to Yahoo data, which is neither resold,
redistributed, nor exposed through any API of our own. Yahoo data is displayed
only to the authenticated Yahoo user it belongs to.

We are asking Yahoo's permission for this use. If commercial use cannot be
approved, we would rather be told so than operate outside the agreement, and we
would make the Yahoo integration available at no charge to affected users.

## Data handling

We will comply with the 24-hour retention limit in the Developer API Terms:
Yahoo-derived data is used to render the user's session and is not retained in
our database beyond that window unless Yahoo confirms in writing that specific
data is storable indefinitely.

We would welcome guidance here. Some features — season-long history and
week-over-week trends — read better with longer retention of the user's own
league results. We will operate within the 24-hour rule by default and only
extend it for data Yahoo explicitly identifies as storable.

## Attribution

We will follow the Yahoo Developer Network Attribution Policy and label Yahoo
data as sourced from Yahoo Fantasy Sports wherever it appears.

## Contact

josh@getinthelimelight.com — sole developer and operator.
