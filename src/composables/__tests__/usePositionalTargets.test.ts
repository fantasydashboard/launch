import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { usePositionalTargets } from '../usePositionalTargets'
import type { PoolPlayer } from '@/composables/useMyRoster'

// Two teams: ME deep at 3B (two startable), THEM with a 3B hole (none). Categories neutral.
function fixture() {
  const mk = (key: string, teamKey: string, pos: string, value: number): PoolPlayer & { value: number } => ({
    playerKey: key, name: key, position: pos, stats: {}, eligiblePositions: [pos],
    teamKey, headshot: undefined, proTeam: 'OAK', value,
  })
  const pool = [
    mk('myA', 'me', '3B', 80), mk('myB', 'me', '3B', 70), mk('mySS', 'me', 'SS', 75),
    mk('theirSS', 'them', 'SS', 78), mk('theirOF', 'them', 'OF', 72),
  ]
  const valueByKey = new Map(pool.map((p) => [p.playerKey, p.value]))
  const strengthByKey = new Map(pool.map((p) => [p.playerKey, {} as Record<string, number>]))
  return { pool, valueByKey, strengthByKey }
}

const base = (f: ReturnType<typeof fixture>) => ({
  pool: ref(f.pool as PoolPlayer[]),
  valueByKey: ref(f.valueByKey),
  roleValueByKey: ref(f.valueByKey), // role-relative == cross in these single-pool fixtures
  strengthByKey: ref(f.strengthByKey),
  slots: ref({ '3B': 1, SS: 1, OF: 1 } as Record<string, number>),
  myStatuses: ref(new Map<string, string>()),
  catLandscape: ref(new Map()), // empty -> category-neutral, no guardrail rejections
  statIds: ref<string[]>([]),
  myTeamKey: ref<string | null>('me'),
  teamNameByKey: ref(new Map([['them', 'Them']])),
  teamLogoByKey: ref(new Map<string, string>()),
  labelOf: (s: string) => s,
})

describe('usePositionalTargets — reach', () => {
  it('surfaces my 3B depth into their 3B hole', () => {
    const { view } = usePositionalTargets(base(fixture()))
    const reach = view.value!.reach
    expect(reach.length).toBeGreaterThan(0)
    const deal = reach[0]
    expect(deal.position).toBe('3B')
    expect(['myA', 'myB']).toContain(deal.give.playerKey)
    expect(deal.fromTeam).toBe('Them')
  })
})

describe('usePositionalTargets — win-win tiering', () => {
  // ME deep 3B / thin SS; THEM deep SS / thin 3B -> mutual positional fit (win-win).
  const mk = (key: string, teamKey: string, pos: string, value: number): PoolPlayer & { value: number } => ({
    playerKey: key, name: key, position: pos, stats: {}, eligiblePositions: [pos],
    teamKey, headshot: undefined, proTeam: 'OAK', value,
  })
  const mirror = (): (PoolPlayer & { value: number })[] => [
    mk('my3Ba', 'me', '3B', 80), mk('my3Bb', 'me', '3B', 70), // deep 3B, no SS -> SS hole
    mk('thSSa', 'them', 'SS', 78), mk('thSSb', 'them', 'SS', 68), // deep SS, no 3B -> 3B hole
  ]
  it('classifies a mutual positional swap as win-win and tags a tier', () => {
    const inp = base(fixture())
    const pool = mirror()
    const vals = new Map(pool.map((p) => [p.playerKey, p.value]))
    inp.pool = ref(pool as PoolPlayer[])
    inp.valueByKey = ref(vals)
    inp.roleValueByKey = ref(vals)
    inp.strengthByKey = ref(new Map(pool.map((p) => [p.playerKey, {} as Record<string, number>])))
    inp.slots = ref({ '3B': 1, SS: 1 } as Record<string, number>)
    const { view } = usePositionalTargets(inp)
    const ww = view.value!.winWin
    expect(ww.length).toBeGreaterThan(0)
    expect(['both', 'one']).toContain(ww[0].tier)
    expect(ww[0].position === 'SS' || ww[0].position === '3B').toBe(true)
  })
})

describe('usePositionalTargets — consolidate', () => {
  const mk = (key: string, teamKey: string, pos: string, value: number): PoolPlayer & { value: number } => ({
    playerKey: key, name: key, position: pos, stats: {}, eligiblePositions: [pos],
    teamKey, headshot: undefined, proTeam: 'OAK', value,
  })
  it('packages two of my surplus bodies for one stud at my hole', () => {
    const pool = [
      // 4 startable OF for 2 OF slots -> TWO genuine surplus bodies (d3, d4) to package
      // without opening a hole.
      mk('d1', 'me', 'OF', 55), mk('d2', 'me', 'OF', 52), mk('d3', 'me', 'OF', 50), mk('d4', 'me', 'OF', 48),
      // no SS -> SS hole
      mk('stud', 'them', 'SS', 88), mk('thOFa', 'them', 'OF', 60), mk('thOFb', 'them', 'OF', 58),
    ]
    const inp = base(fixture())
    const vals = new Map(pool.map((p) => [p.playerKey, p.value]))
    inp.pool = ref(pool as PoolPlayer[])
    inp.valueByKey = ref(vals)
    inp.roleValueByKey = ref(vals)
    inp.strengthByKey = ref(new Map(pool.map((p) => [p.playerKey, {} as Record<string, number>])))
    inp.slots = ref({ OF: 2, SS: 1 } as Record<string, number>)
    const { view } = usePositionalTargets(inp)
    const c = view.value!.consolidate
    expect(c.length).toBeGreaterThan(0)
    expect(c[0].position).toBe('SS')
    expect(c[0].give.length).toBe(2)
    expect(c[0].get.playerKey).toBe('stud')
  })
})
