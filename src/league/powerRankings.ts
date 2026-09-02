/**
 * Projection-driven power rankings: rank teams by ROSTER STRENGTH (true talent),
 * not record, then read the gap between strength and standings as LUCK. A strong
 * roster with a bad record is an unlucky sleeper (buy-low / they'll climb); a weak
 * roster with a good record is a lucky pretender (sell-high, due to regress).
 *
 * Two guards keep the read honest:
 *  - ABANDONED teams (no manager) carry talent on paper but won't optimize it, so
 *    they're never sold as buy-low — the talent's stranded; they're a free matchup.
 *  - The luck flag is TIER-AWARE so it can't contradict itself: a bottom-tier roster
 *    that's "unlucky" gets a modest-bounce read, not a "they'll climb to contention".
 *
 * Scoring-agnostic: the caller supplies each team's `strength` (projected points
 * for points leagues, aggregate category value for category leagues) and record.
 */
export interface PowerTeamInput {
  teamKey: string
  teamName: string
  teamLogo?: string
  strength: number // roster strength, higher = better (caller's scoring dialect)
  wins: number
  losses: number
  ties?: number
  pointsFor?: number // optional record tiebreaker / display
  managerless?: boolean // abandoned team — talent won't be optimized
}

export type Tier = 'Contender' | 'Bubble' | 'Rebuilder'
export type LuckStatus = 'pretender' | 'sleeper' | 'legit'

export interface PowerRow {
  teamKey: string
  teamName: string
  teamLogo?: string
  strength: number
  strengthRank: number // 1 = strongest roster
  recordRank: number // 1 = best record
  wins: number
  losses: number
  ties: number
  winPct: number
  luckDelta: number // strengthRank − recordRank (positive = record beats talent = lucky)
  luck: LuckStatus
  tier: Tier
  managerless: boolean
  move: string // crisp directive for the callout (e.g. "Sell-high target")
  blurb: string // narrative read for the board row
}

export interface PowerRankings {
  rows: PowerRow[] // ranked by roster strength
  pretenders: PowerRow[] // lucky, actionable — sell-high marks
  sleepers: PowerRow[] // unlucky, actionable — buy-low targets
}

const ord = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/** Stable string hash (no Math.random — keeps blurbs deterministic/cacheable). */
function hashKey(key: string): number {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return h
}

/** Dense rank a list (1 = best) by a descending key; ties share the better rank. */
function rankBy<T>(items: T[], key: (t: T) => number): Map<T, number> {
  const sorted = [...items].sort((a, b) => key(b) - key(a))
  const out = new Map<T, number>()
  let rank = 0
  let prev = Infinity
  sorted.forEach((it, i) => {
    const k = key(it)
    if (k < prev) { rank = i + 1; prev = k }
    out.set(it, rank)
  })
  return out
}

export function buildPowerRankings(teams: PowerTeamInput[]): PowerRankings {
  const n = teams.length
  if (!n) return { rows: [], pretenders: [], sleepers: [] }

  const winPct = (t: PowerTeamInput) => {
    const g = t.wins + t.losses + (t.ties ?? 0)
    return g > 0 ? (t.wins + 0.5 * (t.ties ?? 0)) / g : 0
  }
  const strengthRank = rankBy(teams, (t) => t.strength)
  // Record rank: win% first, then points-for as the tiebreaker.
  const recordRank = rankBy(teams, (t) => winPct(t) * 1000 + (t.pointsFor ?? 0) / 1e6)

  /* Luck is a comparison between the standings and the roster, so it needs standings that
     mean something. Before kickoff every team is 0-0 with 0 points-for, so they all tie and
     rankBy hands every one of them 1st. luckDelta then collapses to `strengthRank - 1`,
     which brands everybody outside the top few as a lucky fraud "due to regress" on the
     evidence of no football whatsoever — in a 10-team league that was 7 of 10 teams, and
     the numbers marched 3,4,5,6,7,8,9 straight down the page because that is just their
     talent rank minus one.

     Two completed weeks is still thin, but it is the point at which the standings carry any
     information at all. Below it there is no luck verdict, no arrows and no callout: the
     roster ranking stands on its own, which is the honest thing for a preseason page to do. */
  const MIN_WEEKS_FOR_LUCK = 3
  const gamesPlayed = Math.max(...teams.map((t) => t.wins + t.losses + (t.ties ?? 0)), 0)
  const luckIsReadable = gamesPlayed >= MIN_WEEKS_FOR_LUCK

  // Gap that counts as luck. Scales with league size so a 2-spot wobble in a
  // 12-team league isn't flagged as fate (~a quarter of the field must separate).
  const tol = Math.max(2, Math.round(n / 4))
  const third = Math.max(1, Math.round(n / 3))

  // Build each row with its full set of candidate blurbs; the final variant is
  // chosen AFTER sorting so adjacent rows (even two different teams at neighbouring
  // ranks) never land on the identical sentence.
  interface Build { row: PowerRow; variants: string[] }
  const built: Build[] = teams.map((t) => {
    const sr = strengthRank.get(t)!
    const rr = recordRank.get(t)!
    const rec = `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''}`
    const luckDelta = sr - rr // + = record better than talent (lucky)
    const tier: Tier = sr <= third ? 'Contender' : sr >= n - third + 1 ? 'Rebuilder' : 'Bubble'
    const managerless = !!t.managerless

    // Abandoned teams never get a luck verdict — the talent won't be managed.
    // Neither does anyone, until the standings have had time to say something.
    const luck: LuckStatus = managerless || !luckIsReadable
      ? 'legit'
      : luckDelta >= tol ? 'pretender' : luckDelta <= -tol ? 'sleeper' : 'legit'
    // A bottom-tier roster can't be a real "buy-low / they'll climb" — soften it to
    // a modest-bounce read so the tier and the luck flag never contradict.
    const softSleeper = luck === 'sleeper' && tier === 'Rebuilder'

    // Board blurbs describe; the imperative ("sell high" / "buy low") lives ONCE in
    // the `move` field that drives the callout, so the row never echoes the callout.
    let move = ''
    let variants: string[]
    if (managerless) {
      move = 'Free matchup'
      variants = [
        `Abandoned — nobody's setting this lineup, so the ${ord(sr)}-best talent stays stranded. Bank the win when you face them.`,
        `No manager here. The roster reads ${ord(sr)} on paper, but it won't be optimized — a free matchup, not a threat.`,
      ]
    } else if (luck === 'pretender') {
      move = 'Sell-high'
      variants = [
        `${ord(rr)} by record but only ${ord(sr)} by talent — riding luck, and due to regress.`,
        `The standings flatter them: ${ord(rr)} on ${ord(sr)}-place talent. Bound to cool off.`,
        `Overachieving at ${ord(rr)} on just ${ord(sr)}-best talent — a regression candidate.`,
      ]
    } else if (softSleeper) {
      move = 'Slight rebound'
      variants = [
        `A touch unlucky — ${ord(sr)} in talent, ${ord(rr)} by record — but the roster's still thin. A modest bounce, not a turnaround.`,
        `Better than a ${rec} looks, though it's a bottom-tier roster. A slight rebound at most.`,
      ]
    } else if (luck === 'sleeper') {
      move = 'Buy-low'
      variants = [
        `${ord(rr)} by record but ${ord(sr)} by talent — the roster's better than the standings; they should climb.`,
        `Underwater at ${ord(rr)} despite ${ord(sr)}-best talent. Unlucky, and primed to rise.`,
        `Standings say ${ord(rr)}, the roster says ${ord(sr)} — expect them to climb.`,
      ]
    } else if (!luckIsReadable) {
      /* No games worth reading yet, so every sentence has to be about the roster alone.
         The tier copy below all leans on the standings — "the record backs it", "they're
         stacking wins", "the standings aren't lying" — which at 0-0 asserts wins that do
         not exist. Describe the roster; say nothing about a season that hasn't happened. */
      variants = tier === 'Contender'
        ? sr === 1
          ? [
              `The best roster in the league on paper. Nothing played yet — but this is the one to beat.`,
              `Top roster in the league heading in. The season still has to agree with it.`,
            ]
          : [
              `${ord(sr)}-best roster heading into the season — squarely in the contender group.`,
              `Built to contend: ${ord(sr)} in talent before a snap is played.`,
            ]
        : tier === 'Rebuilder'
          ? [
              `Thin on paper — ${ord(sr)} in talent heading in. Needs the waiver wire to break right.`,
              `${ord(sr)}-best roster to start. There's work to do here.`,
              `${ord(sr)} in talent before a snap. The margin has to come from moves, not the draft.`,
            ]
          : [
              /* Five mid-table teams sharing two sentences meant the same line appeared
                 four times down one page. At 0-0 there genuinely isn't much to say, so
                 these stay short — but each is a different construction, so the page
                 reads as five reads rather than one sentence with the number swapped. */
              `Middle of the pack on paper — ${ord(sr)} in talent heading into the season.`,
              `${ord(sr)} in talent to start: in the mix, not yet in the top group.`,
              `${ord(sr)}-best roster. Good enough to matter, not good enough to coast.`,
              `Right in the muddle at ${ord(sr)} — this tier gets decided in-season, not on paper.`,
              `${ord(sr)} on talent. Close enough to the top group that one hit changes it.`,
            ]
    } else if (tier === 'Contender') {
      // "Class of the league" is reserved for the actual #1; everyone else is a
      // "real contender" so the superlative never lands on a #2/#3.
      variants = sr === 1
        ? [
            `Genuinely the class of the league — 1st in talent, and the standings agree.`,
            `The outright best roster in the league, and the record backs it.`,
            `No fluke — the top roster, and playing like it.`,
          ]
        : [
            `A real contender — ${ord(sr)} in talent, and the record backs it.`,
            `The real deal: ${ord(sr)}-best roster, and they're stacking wins to match.`,
            `Legit at ${ord(sr)} in talent — the wins are following.`,
          ]
    } else if (tier === 'Rebuilder') {
      variants = [
        `Thin roster (${ord(sr)} in talent), and the record knows it. Playing for next year.`,
        `${ord(sr)}-best talent — the standings aren't lying. This one's a rebuild.`,
        `Bottom-tier roster (${ord(sr)}), bottom-tier results. Next year's project.`,
      ]
    } else {
      // Always name the TALENT rank (the row's number) so it can't read as a
      // contradiction next to the rank shown on the left.
      variants = [
        `Right where they belong — ${ord(sr)} in talent, ${ord(rr)} in the standings.`,
        `Roster and record line up: ${ord(sr)} on paper, ${ord(rr)} in the race.`,
        `Roughly fair — ${ord(sr)} in talent, ${ord(rr)} by record.`,
      ]
    }

    const row: PowerRow = {
      teamKey: t.teamKey,
      teamName: t.teamName,
      teamLogo: t.teamLogo,
      strength: t.strength,
      strengthRank: sr,
      recordRank: rr,
      wins: t.wins,
      losses: t.losses,
      ties: t.ties ?? 0,
      winPct: winPct(t),
      luckDelta,
      luck,
      tier,
      managerless,
      move,
      blurb: '', // resolved post-sort
    }
    return { row, variants }
  })

  built.sort((a, b) => a.row.strengthRank - b.row.strengthRank || b.row.winPct - a.row.winPct)

  // Resolve blurbs in display order: start from a deterministic per-team pick, then
  // rotate off the previous row's sentence so no two neighbours read identically.
  let prevBlurb = ''
  for (const b of built) {
    let idx = (hashKey(b.row.teamKey) + b.row.strengthRank) % b.variants.length
    if (b.variants[idx] === prevBlurb && b.variants.length > 1) idx = (idx + 1) % b.variants.length
    b.row.blurb = b.variants[idx]
    prevBlurb = b.row.blurb
  }

  const rows = built.map((b) => b.row)
  // Callouts are ACTIONABLE only: skip abandoned teams, and skip bottom-tier
  // "sleepers" (a thin roster isn't a real buy-low). The board still shows the
  // nuanced per-row read; the callouts are the triage shortlist.
  return {
    rows,
    pretenders: rows
      .filter((r) => r.luck === 'pretender' && !r.managerless)
      .sort((a, b) => b.luckDelta - a.luckDelta),
    sleepers: rows
      .filter((r) => r.luck === 'sleeper' && r.tier !== 'Rebuilder' && !r.managerless)
      .sort((a, b) => a.luckDelta - b.luckDelta),
  }
}
