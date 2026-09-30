import { describe, it, expect } from 'vitest'
import {
  YAHOO_PLAYERS_PAGE,
  parseFreeAgentPage,
  collectFreeAgents,
} from '../yahooFreeAgents'

/**
 * Yahoo's players collection returns AT MOST 25 players per request, whatever `count` asks
 * for. `getTopFreeAgents` passed count=200 and never paged, so every Yahoo league in the
 * product has had a 25-deep free-agent pool since it was written — and nothing about that
 * announces itself, because 25 names is a plausible-looking list.
 *
 * It surfaced on a hockey board on a 3-game night: 25 free agents spread over 17 clubs, six
 * clubs playing, so ONE candidate reached the board and he happened not to price. The same
 * shallowness on a 15-game baseball day leaves ~23 names and looks perfectly healthy, which
 * is why it survived this long.
 */

/** One page of the collection, in the shape Yahoo actually sends. */
function page(names: Array<{ key: string; name: string; team?: string; pos?: string }>) {
  const players: Record<string, unknown> = { count: names.length }
  names.forEach((n, i) => {
    players[String(i)] = {
      player: [[
        { player_key: n.key },
        { player_id: n.key.split('.').pop() },
        { name: { full: n.name } },
        { editorial_team_abbr: n.team ?? 'SJ' },
        { display_position: n.pos ?? 'C' },
        { percent_owned: { value: '42', delta: '3' } },
      ]],
    }
  })
  return { fantasy_content: { league: [{}, { players }] } }
}

const filler = (n: number, offset = 0) =>
  Array.from({ length: n }, (_, i) => ({ key: `453.p.${i + offset}`, name: `P${i + offset}` }))

describe('parseFreeAgentPage', () => {
  it('reads the fields the daily board needs off one page', () => {
    const [p] = parseFreeAgentPage(page([{ key: '453.p.7', name: 'Mason Marchment', team: 'SJ', pos: 'LW' }]))
    expect(p.player_key).toBe('453.p.7')
    expect(p.full_name).toBe('Mason Marchment')
    /* `mlb_team` is the field name every normalizer already reads — it is the sport-agnostic
       team slot despite the name, and renaming it is a separate change. */
    expect(p.mlb_team).toBe('SJ')
    expect(p.position).toBe('LW')
    expect(p.percent_owned).toBe(42)
  })

  it('returns nothing for a league with no players rather than throwing', () => {
    expect(parseFreeAgentPage({ fantasy_content: { league: [{}, {}] } })).toEqual([])
    expect(parseFreeAgentPage(null)).toEqual([])
  })

  it('skips the collection\'s own count key, which is a number beside the players', () => {
    expect(parseFreeAgentPage(page(filler(3)))).toHaveLength(3)
  })
})

describe('collectFreeAgents', () => {
  it('pages past the 25-player cap — the whole point', async () => {
    const asked: number[] = []
    const got = await collectFreeAgents(async (start) => {
      asked.push(start)
      return page(filler(YAHOO_PLAYERS_PAGE, start))
    }, 120)

    expect(got).toHaveLength(120)
    expect(asked.slice(0, 3)).toEqual([0, 25, 50])
  })

  it('stops at a short page instead of asking forever', async () => {
    const asked: number[] = []
    const got = await collectFreeAgents(async (start) => {
      asked.push(start)
      return page(filler(start === 0 ? YAHOO_PLAYERS_PAGE : 4, start))
    }, 200)

    expect(got).toHaveLength(29)
    expect(asked).toEqual([0, 25])
  })

  it('stops at an empty page', async () => {
    const got = await collectFreeAgents(async (start) => page(start === 0 ? filler(25) : []), 200)
    expect(got).toHaveLength(25)
  })

  it('never returns the same player twice, however Yahoo overlaps its pages', async () => {
    /* A sorted, live collection shifts under you: a player added between two requests pushes
       the page boundary and repeats a name. Two rows for one man reads as two adds. */
    const got = await collectFreeAgents(async (start) =>
      page(filler(YAHOO_PLAYERS_PAGE, Math.max(0, start - 5))), 60)

    expect(new Set(got.map((p) => p.player_key)).size).toBe(got.length)
  })

  it('does not exceed the count it was asked for', async () => {
    const got = await collectFreeAgents(async (start) => page(filler(YAHOO_PLAYERS_PAGE, start)), 30)
    expect(got).toHaveLength(30)
  })

  it('keeps what it already has when a later page fails', async () => {
    /* Half a board beats none: the first 25 are the most-owned names anyway. */
    const got = await collectFreeAgents(async (start) => {
      if (start > 0) throw new Error('429')
      return page(filler(YAHOO_PLAYERS_PAGE))
    }, 200)
    expect(got).toHaveLength(25)
  })
})
