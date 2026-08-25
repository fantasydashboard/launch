# Yahoo Fantasy Sports API — access application

Form: https://sports.yahoo.com/developer/access/

Field-by-field. Two fields I cannot supply are marked `>> YOU <<`.

---

**Name ***
```
Josh Daniel
```

**Business Title ***
```
Founder
```

**Email Address ***
```
josh@getinthelimelight.com
```

**Phone Number ***
```
>> YOU <<
```

**Business Name & Address ***
```
>> YOU <<  (Limelight, plus the address you use for the business)
```

**Consumer-Facing Product or App Name ***
```
Ultimate Fantasy Dashboard
```

**Brief Company Description ***

Must match whatever you put in Business Name & Address. Lead with the fantasy
product either way — this field is scanned for relevance, and a generic studio
description is the weakest possible opener on a form that closes vague
submissions.

If Business Name is "Limelight":
```
Limelight is a one-person software studio. Its product Ultimate Fantasy
Dashboard is a read-only analytics companion for fantasy managers — it connects
to the leagues a user already plays in on Yahoo, ESPN and Sleeper and gives them
projections, matchup analysis, waiver and trade evaluation across all of them in
one place. Fantasy sports is the studio's only product line.
```

If Business Name is "Ultimate Fantasy Dashboard":
```
Ultimate Fantasy Dashboard is a read-only analytics companion for fantasy
managers, operated by a single independent developer. It connects to the leagues
a user already plays in on Yahoo, ESPN and Sleeper and gives them projections,
matchup analysis, waiver and trade evaluation across all of them in one place.
It does not host leagues or run drafts.
```

**Website URL or App Store Details ***
```
https://www.ultimatefantasydashboard.com
```

**Describe Your Intended Use Case ***
```
Ultimate Fantasy Dashboard is a companion dashboard for managers who already
play fantasy sports on Yahoo. It does not host leagues, run drafts, or process
transactions. A user connects the leagues they already play in, and the product
provides analysis across all of them in one place: projected standings, matchup
breakdowns, waiver-wire value, trade evaluation, and start/sit decisions. It
covers football, baseball, basketball and hockey, and both points and
head-to-head category scoring.

Data required, limited to the authenticated user's own leagues:
users;use_login=1/games to list their leagues; league/{key}/settings for scoring
rules and roster slots; league/{key}/standings; league/{key}/teams;
league/{key}/scoreboard for weekly matchups; team/{key}/roster for the user's own
lineup; and league/{key}/players for player pool, ownership and projected points.

We do not request other users' private data, do not crawl leagues the
authenticated user does not belong to, and do not aggregate Yahoo data across
users into any shared or public dataset. Read-only access is sufficient — every
action a user decides on is taken in Yahoo's own app, which is where we send
them. Intended users are individual managers who play in several leagues, often
across more than one platform; access is per-user and OAuth-authorized, so a user
sees only leagues their own Yahoo account belongs to.
```

**Expected Users ***
```
Small (< 1,000 users)
```

**Client ID**
```
>> the Client ID of the EXISTING YDN app — the one whose secret is already in
   Supabase. Do not leave this blank. <<
```

**Additional Notes**
```
Disclosing two things directly rather than leaving them to be discovered.

1) Commercial use. Ultimate Fantasy Dashboard has paid subscription tiers, and
the Yahoo Developer API Terms require prior express written permission to derive
income from use of the APIs. We are requesting that permission. Users pay for the
analysis product as a whole — projections, draft tooling, cross-platform views —
not for access to Yahoo data, which is never resold, redistributed, or exposed
through any API of our own, and is displayed only to the authenticated Yahoo user
it belongs to. If commercial use cannot be approved, we would rather be told than
operate outside the agreement, and would make the Yahoo integration free to
affected users.

2) Data retention. We will comply with the 24-hour retention limit: Yahoo-derived
data renders the user's session and is not retained beyond that window unless
Yahoo confirms in writing that specific data is storable indefinitely. Guidance
would be welcome, as season-long history and week-over-week trend features read
better with longer retention of a user's own league results. We will operate
within the 24-hour rule by default.

We will follow the Yahoo Developer Network Attribution Policy and label Yahoo
data as sourced from Yahoo Fantasy Sports wherever it appears. We are not
requesting write access. The Client ID above belongs to an existing YDN app
already deployed in production, so approval on that ID requires no credential
change on our side.
```
