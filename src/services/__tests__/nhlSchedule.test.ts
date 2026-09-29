import { describe, it, expect, afterEach } from 'vitest'
import { parseNhlSchedule, nhlAbbrVariants, getNhlSchedule, clearNhlScheduleCache } from '../nhlSchedule'

/*
 * `gameType: 2` on every fixture, because the live endpoint puts it on every fixture. These
 * were written without it, which made them agree with a parser that counted preseason as
 * real — a fixture missing a field the source always sends will vouch for a bug rather than
 * catch it.
 */
const payload = {
  gameWeek: [
    { date: '2026-10-08', games: [
      { gameType: 2, homeTeam: { abbrev: 'BOS' }, awayTeam: { abbrev: 'UTA' } },
      { gameType: 2, homeTeam: { abbrev: 'LAK' }, awayTeam: { abbrev: 'SJS' } },
    ] },
    { date: '2026-10-09', games: [{ gameType: 2, homeTeam: { abbrev: 'NYR' }, awayTeam: { abbrev: 'BOS' } }] },
  ],
}

describe('the NHL slate', () => {
  it('counts a single day', () => {
    const s = parseNhlSchedule(payload, '2026-10-08', '2026-10-08')
    expect(s.gamesByTeam.BOS).toBe(1)
    expect(s.gamesByTeam.NYR).toBeUndefined()
  })

  /*
   * The endpoint answers with a WHOLE WEEK from the date asked for, so days past the range
   * have to be dropped or "tonight" quietly becomes "the next seven nights" — and a manager
   * told his winger plays today when he plays Thursday starts a losing lineup.
   */
  it('drops the days outside the range', () => {
    const day = parseNhlSchedule(payload, '2026-10-08', '2026-10-08')
    const both = parseNhlSchedule(payload, '2026-10-08', '2026-10-09')
    expect(day.gamesByTeam.BOS).toBe(1)
    expect(both.gamesByTeam.BOS).toBe(2)   // Boston plays on both days
  })

  it('records who is at home, for venue', () => {
    const s = parseNhlSchedule(payload, '2026-10-08', '2026-10-08')
    expect(s.homeTeamByTeam.BOS).toBe('BOS')
    expect(s.homeTeamByTeam.UTA).toBe('BOS')
  })

  /*
   * ESPN's proTeams table shortens five clubs. Keying one spelling means a Kings player looks
   * idle every night of the season, and nothing about that failure announces itself — the
   * same silent miss mlbSchedule documents for OAK/ATH and ARI/AZ.
   */
  it('keys both spellings so a roster abbreviation always resolves', () => {
    const s = parseNhlSchedule(payload, '2026-10-08', '2026-10-08')
    expect(s.gamesByTeam.LAK).toBe(1)
    expect(s.gamesByTeam.LA).toBe(1)
    expect(s.gamesByTeam.SJS).toBe(1)
    expect(s.gamesByTeam.SJ).toBe(1)
  })

  it('knows the variants either way round', () => {
    expect(nhlAbbrVariants('LA')).toContain('LAK')
    expect(nhlAbbrVariants('TBL')).toContain('TB')
    expect(nhlAbbrVariants('BOS')).toEqual(['BOS'])
  })

  /*
   * EMPTY, NEVER GUESSED. The NHL publishes no probable starting goalies, and a guessed
   * starter is worse than an absent one: it puts a backup in a lineup on a night he never
   * dressed.
   */
  it('publishes no probable goalies, because the NHL does not', () => {
    expect(parseNhlSchedule(payload, '2026-10-08', '2026-10-08').startsByPitcher).toEqual({})
  })

  it('survives a payload with no week in it', () => {
    expect(parseNhlSchedule({}, '2026-10-08', '2026-10-08').gamesByTeam).toEqual({})
    expect(parseNhlSchedule(null, '2026-10-08', '2026-10-08').gamesByTeam).toEqual({})
  })
})

/**
 * Preseason. Verified against api-web.nhle.com on 2026-09-20, when every fixture in the
 * returned week carried `gameType: 1` and the parser counted all of them.
 */
describe('parseNhlSchedule game types', () => {
  const day = (date: string, games: unknown[]) => ({ gameWeek: [{ date, games }] })
  const g = (gameType: number, away: string, home: string) => ({
    gameType, awayTeam: { abbrev: away }, homeTeam: { abbrev: home },
  })

  it('does not count preseason as a game', () => {
    const out = parseNhlSchedule(day('2026-09-20', [g(1, 'NYI', 'NJD')]), '2026-09-20', '2026-09-20')
    expect(out.gamesByTeam.NYI).toBeUndefined()
    expect(out.gamesByTeam.NJD).toBeUndefined()
  })

  it('counts regular season and playoffs', () => {
    const reg = parseNhlSchedule(day('2026-10-06', [g(2, 'COL', 'VGK')]), '2026-10-06', '2026-10-06')
    expect(reg.gamesByTeam.COL).toBe(1)
    const post = parseNhlSchedule(day('2027-04-20', [g(3, 'COL', 'VGK')]), '2027-04-20', '2027-04-20')
    expect(post.gamesByTeam.VGK).toBe(1)
  })

  /* Absent is not "counts" — an unlabelled fixture is not assumed to be a real one. */
  it('drops a game with no gameType rather than assuming it counts', () => {
    const out = parseNhlSchedule(
      day('2026-10-06', [{ awayTeam: { abbrev: 'COL' }, homeTeam: { abbrev: 'VGK' } }]),
      '2026-10-06', '2026-10-06',
    )
    expect(out.gamesByTeam.COL).toBeUndefined()
  })

  it('counts only the real games on a mixed day', () => {
    const out = parseNhlSchedule(
      day('2026-10-01', [g(1, 'BOS', 'MTL'), g(2, 'COL', 'VGK')]),
      '2026-10-01', '2026-10-01',
    )
    expect(out.gamesByTeam.BOS).toBeUndefined()
    expect(out.gamesByTeam.COL).toBe(1)
  })
})

/*
 * A FAILED FETCH IS NOT A DARK NIGHT.
 *
 * getNhlSchedule returned the same empty schedule for "the NHL did not answer" and "nobody
 * plays tonight", and the Today page renders the second: "No NHL games today — the board lights
 * up when games resume", with every player greyed to "no game". On a night ten teams were
 * playing, a Yahoo hockey league showed exactly that — a confident sentence that was false.
 *
 * The file's own comment already said this was the worst way for it to fail. It just never
 * carried the flag that lets a caller tell the two apart.
 */
describe('getNhlSchedule failure reporting', () => {
  const realFetch = globalThis.fetch
  /* The cache is module-level, so a successful case here would otherwise be served to the
     caching tests below and make them pass without fetching anything. */
  afterEach(() => { globalThis.fetch = realFetch; clearNhlScheduleCache() })

  it('flags a non-ok response as failed rather than empty', async () => {
    globalThis.fetch = (async () => new Response('', { status: 503 })) as any
    const s = await getNhlSchedule('2026-09-29', '2026-09-29')
    expect(s.failed).toBe(true)
    expect(Object.keys(s.gamesByTeam)).toHaveLength(0)
  })

  it('flags a thrown fetch as failed', async () => {
    globalThis.fetch = (async () => { throw new Error('network down') }) as any
    const s = await getNhlSchedule('2026-09-29', '2026-09-29')
    expect(s.failed).toBe(true)
  })

  /* A real night with no games is NOT failed — that distinction is the whole point. */
  it('does not flag a genuinely empty slate as failed', async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({ gameWeek: [] }), {
      status: 200, headers: { 'content-type': 'application/json' },
    })) as any
    const s = await getNhlSchedule('2026-09-29', '2026-09-29')
    expect(s.failed).toBeFalsy()
    expect(Object.keys(s.gamesByTeam)).toHaveLength(0)
  })
})

/*
 * CACHING, AND WHAT MUST NEVER BE CACHED.
 *
 * The slate for a date does not change while a tab is open, and Today re-fetched it on every
 * mount and every league switch. Against an endpoint that rate-limits — it answered 429 three
 * times in a row while this was being written — that turns one throttle into a page that is
 * broken for as long as the user keeps clicking.
 *
 * A FAILURE IS NEVER CACHED. Caching one would take a single 429 and make it permanent for the
 * session, which is strictly worse than not caching at all.
 */
describe('getNhlSchedule caching', () => {
  const realFetch = globalThis.fetch
  afterEach(() => { globalThis.fetch = realFetch; clearNhlScheduleCache() })

  const ok = (abbr: string) => new Response(JSON.stringify({
    gameWeek: [{ date: '2026-09-29', games: [{ gameType: 2, awayTeam: { abbrev: abbr }, homeTeam: { abbrev: 'XXX' } }] }],
  }), { status: 200, headers: { 'content-type': 'application/json' } })

  it('fetches a date range once and reuses it', async () => {
    let calls = 0
    globalThis.fetch = (async () => { calls++; return ok('BOS') }) as any
    await getNhlSchedule('2026-09-29', '2026-09-29')
    await getNhlSchedule('2026-09-29', '2026-09-29')
    expect(calls).toBe(1)
  })

  it('keeps different ranges apart', async () => {
    let calls = 0
    globalThis.fetch = (async () => { calls++; return ok('BOS') }) as any
    await getNhlSchedule('2026-09-29', '2026-09-29')
    await getNhlSchedule('2026-09-30', '2026-09-30')
    expect(calls).toBe(2)
  })

  /*
   * THE REQUEST THAT WAS SENT TWICE, EVERY TIME.
   *
   * The URL carries only the FROM date — the endpoint answers with the whole week from it —
   * but the cache was keyed `from..to`, so the daily board's two calls (today..today for
   * tonight, today..Sunday for the week) missed each other and fired two byte-identical
   * requests at once. Against an endpoint that rate-limits, and whose own comment records it
   * answering 429 three times running, doubling every load is how one transient throttle
   * turned into a page reading "no game" beside every player.
   */
  it('asks the endpoint once when two ranges share a start date', async () => {
    let calls = 0
    globalThis.fetch = (async () => { calls++; return ok('BOS') }) as any
    await Promise.all([
      getNhlSchedule('2026-09-29', '2026-09-29'),
      getNhlSchedule('2026-09-29', '2026-10-04'),
    ])
    expect(calls).toBe(1)
  })

  it('still filters each range correctly off the one payload', async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({
      gameWeek: [
        { date: '2026-09-29', games: [{ gameType: 2, awayTeam: { abbrev: 'BOS' }, homeTeam: { abbrev: 'XXX' } }] },
        { date: '2026-10-01', games: [{ gameType: 2, awayTeam: { abbrev: 'NYR' }, homeTeam: { abbrev: 'YYY' } }] },
      ],
    }), { status: 200, headers: { 'content-type': 'application/json' } })) as any
    const [day, week] = await Promise.all([
      getNhlSchedule('2026-09-29', '2026-09-29'),
      getNhlSchedule('2026-09-29', '2026-10-04'),
    ])
    expect(day.gamesByTeam.BOS).toBe(1)
    expect(day.gamesByTeam.NYR).toBeUndefined()
    expect(week.gamesByTeam.BOS).toBe(1)
    expect(week.gamesByTeam.NYR).toBe(1)
  })

  /* Sharing the in-flight request must not share a FAILURE into the cache — both callers see
     the failure, and the next call is still free to succeed. */
  it('fails both concurrent callers without poisoning the next attempt', async () => {
    let calls = 0
    globalThis.fetch = (async () => {
      calls++
      return calls === 1 ? new Response('', { status: 429 }) : ok('BOS')
    }) as any
    const [day, week] = await Promise.all([
      getNhlSchedule('2026-09-29', '2026-09-29'),
      getNhlSchedule('2026-09-29', '2026-10-04'),
    ])
    expect(day.failed).toBe(true)
    expect(week.failed).toBe(true)
    expect(calls).toBe(1)
    const retry = await getNhlSchedule('2026-09-29', '2026-09-29')
    expect(retry.failed).toBeFalsy()
  })

  /* One 429 must not break the page for the rest of the session. */
  it('never caches a failure, so a later call can still succeed', async () => {
    let calls = 0
    globalThis.fetch = (async () => {
      calls++
      return calls === 1 ? new Response('', { status: 429 }) : ok('BOS')
    }) as any
    const first = await getNhlSchedule('2026-09-29', '2026-09-29')
    expect(first.failed).toBe(true)
    const second = await getNhlSchedule('2026-09-29', '2026-09-29')
    expect(second.failed).toBeFalsy()
    expect(Object.keys(second.gamesByTeam).length).toBeGreaterThan(0)
  })
})
