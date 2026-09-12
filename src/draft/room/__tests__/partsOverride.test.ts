import { describe, it, expect } from 'vitest'
import { parseRankings, matchRankings } from '@/draft/room/customRankings'

/*
 * Re-uploading a position file has to actually change the board.
 *
 * matchRankings marks a player used on his first match, so whichever list reaches it first
 * wins. `parsed` appended per-position parts AFTER the base sheet, which meant every row in a
 * part was discarded as unmatched and the original file won every player it mentioned. The
 * upload stored the new ranking and reported success; the board did not move. Done twice, it
 * did not move twice.
 *
 * This is the composable's ordering expressed directly against the matcher, because that is
 * where the two lists actually meet.
 */
describe('a per-position file overrides the sheet it lands in', () => {
  const BASE = `Rank,Player
1,Brock Bowers
2,Trey McBride
3,Kyle Pitts Sr.
4,Sam LaPorta`

  // The re-upload: Pitts has fallen, Bowers is not in it at all.
  const PART = `Rank,Tight End
1,Trey McBride
2,Sam LaPorta
3,Kyle Pitts Sr.`

  const board = ['Brock Bowers', 'Trey McBride', 'Kyle Pitts', 'Sam LaPorta']
    .map((name, i) => ({ playerKey: 'p' + i, name, position: 'TE' }))

  const order = (parsed: ReturnType<typeof parseRankings>) => {
    const { rankByKey } = matchRankings(parsed, board)
    return board
      .filter((b) => rankByKey[b.playerKey])
      .sort((a, b) => rankByKey[a.playerKey] - rankByKey[b.playerKey])
      .map((b) => b.name)
  }

  it('uses the newer file where it speaks', () => {
    // The composable drops base rows for a position a part covers, so the matcher sees only
    // the part for tight ends.
    const parsed = parseRankings(PART)
    expect(order(parsed)).toEqual(['Trey McBride', 'Sam LaPorta', 'Kyle Pitts'])
  })

  it('drops anyone the newer file omits, rather than leaving a stale rank behind', () => {
    /*
     * Bowers is absent from the re-upload. Keeping his old rank looks generous and is wrong:
     * the two files rank on different scales — a part within its position, the sheet within
     * itself — so his leftover rank 1 ties the new rank 1 and can win the sort. That is
     * literally how a tight end the new file never mentions ended up back on top of it.
     *
     * The analyst simply has no opinion on him now, the same as anyone past the last row.
     */
    const parsed = parseRankings(PART)
    expect(order(parsed)).not.toContain('Brock Bowers')
  })

  it('is the old order when the two are concatenated the other way', () => {
    // The bug, pinned: base first and the newer file is thrown away entirely.
    const parsed = [...parseRankings(BASE), ...parseRankings(PART)]
    expect(order(parsed)).toEqual(['Brock Bowers', 'Trey McBride', 'Kyle Pitts', 'Sam LaPorta'])
  })
})
