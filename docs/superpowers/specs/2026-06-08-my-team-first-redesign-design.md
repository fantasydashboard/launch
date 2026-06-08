# UFD My-Team-First Redesign — Design Spec

Date: 2026-06-08
Status: Draft for review
Scope: Strategic repositioning + information architecture for Ultimate Fantasy Dashboard (UFD), with Slice 1 (My Team + My Matchup) specified in detail. Baseball category leagues first. Local only until tested.

---

## 1. Strategic context

### The two products
- **The League Beat (TLB)** owns the editorial register: daily/weekly narrative, named eras, champion-as-story, shareable talking points. "Your league story, chronicled."
- **UFD** is the league tool: the AI coach for *your specific league*. It tells you what to do, with the league's own data as proof.

The products share a Supabase backend, auth, and connected-platform data. They must not collapse into each other. UFD never writes editorial prose; it ships verdicts and proof. TLB never ships a 12-column sortable matrix.

### What the market research established (2026)
- **Decision-support is a red ocean in football** (8+ near-identical providers: FantasyPros, RotoWire, FantasyCalc, etc.), but is **open white space cross-sport** (baseball/basketball/hockey) and cross-platform.
- **The receipts/history lane is already occupied**: Sleeper ships native trophy/shaming reports + all-time history (Sleeper-hosted only); Fantasy Record Book ($10/yr) and League Legacy ($36/yr) productize cross-platform records (football-only). "Having awards and history" is therefore not, by itself, a moat.
- **People pay for winning, not bragging.** FantasyPros monetizes exclusively through decision tools and gives league history/trophies away free.
- **Social mechanics drive retention and virality** (Sleeper ~90% viral growth via the league invite loop), but **social-only products are fragile** (BeReal/Poparazzi). Social needs a utility substrate.

### The resulting positioning
> UFD is the AI coach for your specific league. It knows your scoring, your roster, and your rivals, so it tells you exactly what to do, with the league's own history and records as proof. FantasyPros tells everyone the same thing. UFD tells *you* what *you* should do. Any sport, any platform.

### The two defensible moats
1. **Cross-sport / cross-platform.** Every competitor is football-first and/or single-platform. Category baseball is the least-served corner; it is where we start.
2. **League-contextualized decisions.** Not consensus rankings. Rankings and recommendations tuned to *your* scoring, *your* roster holes, and *your* leaguemates' rosters. This is the anti-slop differentiator: the data we already have is the *context* that makes the edge smarter than FantasyPros', not a pile of extra tabs.

### The three-layer model
The same data serves three jobs. Placement in the app follows the **job**, not the data type.

| Layer | Job | Defensibility | Funnel role | Where it lives |
|---|---|---|---|---|
| Decide (the edge) | "What should I do?" | Open cross-sport | Acquisition + paid conversion | My Team, Matchup, Trades, Players |
| Compare (engine room) | "How do I stack up?" | Least defensible | Context / proof | League |
| Brag (receipts) | "Prove it" | Contested, cross-platform angle open | Retention + virality (free) | History |

---

## 2. Non-goals
- **No editorial prose in UFD.** The `src/editorial/` narrative engine (home/draft/history/matchups generators) is TLB's job and comes out of UFD. Awards and history become *data and records*, never sentences.
- **No deploy.** All work stays local until the owner has tested with their users. No `git push`, no `vercel --prod`.
- **Not all six surfaces at once.** Thin vertical slices on a live baseball-category league, thesis-first.
- **No generative rankings in v1.** Recommendations are deterministic league-tuned math (see §5). LLM is reserved for an optional thin explanation layer later.
- **Not over-engineering for four sports now.** Build real and narrow on baseball category; keep the league-context data model sport-agnostic at the seams so we are not painted into a corner.

---

## 3. Information architecture (target state)

New primary navigation, left to right as *act → zoom out → brag*:

> **My Team · Matchup · Trades · Players · League · History** (+ Draft, seasonal)

### 3.1 My Team — home / the coach *(new front door)*
- **Job:** "What should I do right now?"
- **Leads with an action feed** (ranked verdicts), not hero-metric cards. Each row is a verdict + one-tap drill into the proof. Example signals: category weakness → waiver add or trade target; start/sit flag; trade opportunity from a leaguemate's complementary need.
- Below the feed: compact identity strip (record, rank, this-week matchup + live win prob, trajectory) and roster with league-contextualized player values and trends; strength/weakness profile by category.
- **Repurposed from:** win-prob engine, category breakdowns, standings, recombined around *your* team.

### 3.2 Matchup — this week, live *(promoted decision surface)*
- **Job:** "Given my matchup state, what should I do?"
- Leads with the **win-probability-over-time trend** (the actionable artifact) + current win prob, category battle, opponent scouting.
- A condensed snapshot of this also appears on My Team and links here.
- **Repurposed from:** `CategoryMatchupsView.vue` Monte Carlo win-prob + scouting reports, reframed as *my* matchup first; all-matchups browsing moves to League.

### 3.3 Trades — the marquee decision tool
- **Job:** find and build the trade.
- Trade Finder (mutual-need matches ranked for your holes), Trade Analyzer (category + win-prob + standings delta, fairness), League Needs Map (every team's weaknesses as targets).
- **Repurposed from:** H2H matrix + category standings + scouting, pointed at "who can I rob."

### 3.4 Players — league-tuned rankings *(the FantasyPros fight)*
- **Job:** "who's worth adding/starting, for me?"
- Rankings tuned to your scoring/categories; waiver/FA board ranked for your holes; compare any players (yours vs waiver vs trade target); start/sit.
- **Repurposed from:** projections + category data, reframed as "ranked for you."

### 3.5 League — command center *(engine room, demoted)*
- **Job:** zoom out to context. The commish cockpit.
- Power Rankings (keep custom formula), Standings/Season, all-team comparison, full H2H matrix, all matchups.
- **Repurposed from:** today's Season + Power Rankings + Matchups tabs, consolidated. Now layer 1 (evidence), not the front door.

### 3.6 History — records + receipts *(free flex layer)*
- **Job:** the brag, as data.
- Career, all-time H2H matrix, rivalry records, Awards (Fame/Shame), Legacy score.
- Every record is a shareable card and an exportable row. No prose.
- **Repurposed from:** today's History tab, editorial stripped, share/export added.

### 3.7 Draft — seasonal
- Prominent in draft season (prep + live), recedes off-season (retro analysis a click deeper).

### Placement principle (resolves H2H and matchup duplication)
| Surface | Zone | Comparison flavor |
|---|---|---|
| History | Brag | All-time H2H matrix, rivalry records, Legacy score |
| Trades | Decide | Current roster vs trade-target, by need |
| Matchup | Decide | Current roster vs this week's opponent, by category |
| League | Compare | All teams, browsable |

### What gets cut or absorbed
- **Recap tab → removed from UFD** (editorial/shareable = TLB). May survive only as a data-only weekly-awards generator feeding History share cards.
- **"Free Tools" / "Ultimate Tools" mega-menus → dissolved.** The grab-bag is the overwhelm problem. Redistribute by job: decision tools (schedule analysis, playoff predictor, projections) into My Team/Players/Trades; analytical ones into League. No junk drawer.

---

## 4. Build sequence

Thin vertical slices, each shippable to the live baseball-category league.

1. **Slice 1 — Spine: My Team + My Matchup.** Flip to My-Team-first; prove the decision-with-proof pattern using data already computed. (Detailed in §5.)
2. **Slice 2 — Players.** Ingest free-agent pool; compute league-tuned player values (per-category z-scores weighted by roster holes). Unlocks "what to add."
3. **Slice 3 — Trades.** League Needs Map + analyzer on top of Slice 2's value model.
4. **Slice 4 — Re-home League + History.** Consolidate comparison surfaces under League; strip `src/editorial/` from History; add export/share-as-data; introduce reusable SortableTable + export utility (benefits all surfaces).

---

## 5. Slice 1 — detailed design (My Team + My Matchup, baseball category)

### Goal
Prove two things on the owner's live baseball-category league: (a) the navigation flip to My-Team-first feels right, and (b) a league-contextualized "decision with proof" feels like an edge, using mostly existing data so the bet is validated before the harder data work of Slices 2–3.

### 5.1 Routing / shell
- Add `My Team` as the default authenticated landing surface for a connected league (new route + wrapper, mirroring existing `*Wrapper.vue` pattern in `src/router/index.ts`).
- Add `Matchup` as a first-class route (promote category matchup view).
- Keep existing routes reachable during transition; nav reorder to the six-surface bar is part of this slice but old routes are not deleted yet.

### 5.2 My Team page
Components (new, composed from existing data services):
- **SituationStrip** — record, rank, trajectory, this-week matchup + live win prob. Compact row, not hero cards (avoids the banned hero-metric template).
- **ActionFeed** — ordered list of `Recommendation` rows. v1 signal sources (deterministic):
  - *Category weakness*: from existing category standings/strengths. "You are Nth in {cat}." Links to proof in League.
  - *Matchup state*: from existing win-prob engine. "You are losing {cats} this week." Links to Matchup.
  - (Waiver/trade rows are stubbed/disabled in Slice 1; they light up in Slices 2–3.)
- **RosterPanel** — your players with league-contextualized value (Slice-1 version: category contribution from existing data) and trend; drill-down per player.
- **CategoryProfile** — strength/weakness bars by category (where to attack).

### 5.3 Recommendation model (deterministic, anti-slop)
- A `recommendations` composable computes a ranked list of `Recommendation { kind, severity, headline, detail, evidenceRoute }`.
- Ranking by leverage: severity of the gap × actionability. No generative text in v1; headlines are templated from data (templated labels, not prose).
- Sport-agnostic interface so Slices 2–3 and other sports can add signal sources without reshaping the feed.

### 5.4 Matchup page
- Promote `CategoryMatchupsView.vue`'s Monte Carlo win-prob, **win-prob-over-time trend**, category battle, and scouting reports into a standalone `Matchup` surface scoped to *my* matchup by default, with a selector to view others.
- Make the category breakdown table sortable (currently fixed-order; first consumer of the future SortableTable, or a local sort in this slice).

### 5.5 Repurpose map (existing → Slice 1)
- `src/views/CategoryMatchupsView.vue` → Matchup surface (win-prob, trend, scouting).
- `src/components/CategoryStandingsTable.vue` / category breakdown logic → CategoryProfile + weakness signals.
- `src/components/UnifiedHomeComponent.vue` standings + bump chart → SituationStrip + (later) trajectory.
- `src/views/CategoryPowerRankingsView.vue` → evidence target (drill-down from feed).

### 5.6 Out of scope for Slice 1
- Free-agent pool ingestion, trade finder, league-tuned player rankings (Slices 2–3).
- Deleting old routes/tabs (transition keeps them reachable).
- Removing `src/editorial/` (Slice 4, but no new dependencies on it in Slice 1).

---

## 6. Cross-cutting concerns
- **Reusable SortableTable + export utility.** The audit found 29 tables, 11 sortable (hand-rolled), 18 fixed-order, and zero data export. Introduced in Slice 4 but Matchup's sortable category table in Slice 1 should be written so it can adopt it later.
- **Remove editorial leakage.** `src/editorial/` and any live prose rendering (points-matchups "Matchup of the Week", demo views) are out of UFD's scope. Slice 1 adds no new dependency on it; Slice 4 removes it.
- **Accessibility:** WCAG AA baseline (contrast on bold colors, focus states, keyboard nav across the new feed and nav).

---

## 7. Constraints
- **Local only.** No push, no prod deploy, until owner tests with users.
- **Baseball category first.** Real league, real data.
- **Keep the league-context data model sport-agnostic at the seams.**

---

## 8. Open questions / risks
- **Free-agent pool data availability** for baseball category across ESPN/Yahoo/Sleeper services (blocks Slice 2). Verify before Slice 2 planning.
- **League-tuned value math** (z-score per category weighted by holes) needs validation against intuition on the live league.
- **Transition UX:** running new My-Team-first nav alongside old routes without confusing existing users mid-migration.

---

## 9. Success criteria (Slice 1)
- A connected baseball-category league opens on My Team by default.
- The action feed shows at least two real, correct, league-specific signals (a true category weakness; a true current-matchup state) with working drill-downs.
- The Matchup surface shows the live win-prob trend and a sortable category breakdown.
- The owner, on their live league, agrees it "feels like a coach, not a dashboard."
