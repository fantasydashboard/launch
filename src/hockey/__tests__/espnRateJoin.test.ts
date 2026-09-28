import { describe, it, expect } from 'vitest'
import { joinEspnRows } from '../espnRateJoin'

const rate = (name: string, position: string, playerId = 1) => ({ playerId, name, position })
const espnRow = (name: string, position: string, eligible?: string[]) => ({ name, position, eligible })

describe('joinEspnRows', () => {
  it('joins on name and position when both agree', () => {
    const j = joinEspnRows([rate('Nathan MacKinnon', 'C', 8477492)], [espnRow('Nathan MacKinnon', 'C')])
    expect(j.byPlayerId.get(8477492)?.name).toBe('Nathan MacKinnon')
    expect(j.rungs.exact).toBe(1)
  })

  /* The NHL says L and R; ESPN says LW and RW. They are the same position. */
  it('translates the NHL wing codes to ESPN spelling', () => {
    const j = joinEspnRows([rate('Kirill Kaprizov', 'L', 2), rate('Mikko Rantanen', 'R', 3)],
      [espnRow('Kirill Kaprizov', 'LW'), espnRow('Mikko Rantanen', 'RW')])
    expect(j.rungs.exact).toBe(2)
  })

  /*
   * THE BUG THIS FILE EXISTS FOR. The two feeds disagree about which wing a winger plays for 66
   * skaters, and a join on name AND position silently failed all of them — leaving the board to
   * price Jake Guentzel and Frank Vatrano on ESPN's own projection while discarding ours.
   */
  it('joins a player the two feeds put on different wings, when the name is unambiguous', () => {
    const j = joinEspnRows([rate('Zach Hyman', 'L', 4)], [espnRow('Zach Hyman', 'RW')])
    expect(j.byPlayerId.get(4)?.position).toBe('RW')
    expect(j.rungs.uniqueName).toBe(1)
  })

  it('prefers ESPN eligibility over a bare name match', () => {
    const j = joinEspnRows([rate('Marcus Foligno', 'L', 5)], [espnRow('Marcus Foligno', 'RW', ['RW', 'LW'])])
    expect(j.byPlayerId.get(5)?.position).toBe('RW')
    expect(j.rungs.eligible).toBe(1)
    expect(j.rungs.uniqueName).toBe(0)
  })

  /*
   * REFUSING IS THE POINT. There are two Elias Petterssons in the league, a forward and a
   * defenceman, and joining our defenceman to ESPN's forward would hand a blue-liner a first-line
   * scoring projection. An unmatched player keeps his own rate, which is merely less precise; a
   * wrongly matched one is confidently wrong.
   */
  it('refuses a name that is ambiguous on our side', () => {
    const j = joinEspnRows(
      [rate('Elias Pettersson', 'C', 6), rate('Elias Pettersson', 'D', 7)],
      [espnRow('Elias Pettersson', 'C')],
    )
    expect(j.byPlayerId.get(6)?.position).toBe('C')   // the exact match still lands
    expect(j.byPlayerId.has(7)).toBe(false)           // the defenceman does not
    expect(j.rungs.refused).toBe(1)
  })

  it('refuses a name that is ambiguous on ESPN side', () => {
    const j = joinEspnRows([rate('Sebastian Aho', 'D', 8)],
      [espnRow('Sebastian Aho', 'C'), espnRow('Sebastian Aho', 'RW')])
    expect(j.byPlayerId.has(8)).toBe(false)
    expect(j.rungs.refused).toBe(1)
  })

  it('never lets two rate rows claim the same ESPN row', () => {
    const j = joinEspnRows(
      [rate('Elias Pettersson', 'C', 9), rate('Elias Pettersson', 'L', 10)],
      [espnRow('Elias Pettersson', 'C')],
    )
    const claimed = [...j.byPlayerId.values()]
    expect(claimed).toHaveLength(1)
    expect(j.byPlayerId.has(9)).toBe(true)
  })

  it('leaves a player ESPN has never heard of unmatched', () => {
    const j = joinEspnRows([rate('Ivan Demidov', 'L', 11)], [])
    expect(j.byPlayerId.size).toBe(0)
    expect(j.rungs.noEspnRow).toBe(1)
  })

  it('matches across diacritics and punctuation', () => {
    const j = joinEspnRows([rate('Tim Stützle', 'C', 12), rate('T.J. Oshie', 'R', 13)],
      [espnRow('Tim Stutzle', 'C'), espnRow('TJ Oshie', 'RW')])
    expect(j.rungs.exact).toBe(2)
  })

  it('ignores a position it has no translation for rather than guessing', () => {
    const j = joinEspnRows([rate('Some Goalie', 'G', 14)], [espnRow('Some Goalie', 'G')])
    expect(j.byPlayerId.has(14)).toBe(false)
  })
})
