import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useCustomRankings } from '@/composables/useCustomRankings'

/*
 * The bug: useCustomRankings took `kind` as a plain string, captured once. RankingPicker
 * passed props.kind, and the Wire flips that prop between 'ros' and 'dynasty'. So after
 * uploading a dynasty list and switching to Dynasty, the dropdown still filtered for
 * rest-of-season lists and offered only UFD.
 */
describe('useCustomRankings follows a changing kind', () => {
  beforeEach(() => {
    // The composable reaches useFeatureAccess for the admin gate, which needs a store.
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('lists the sets for whichever kind is CURRENTLY asked for', () => {
    const seed = useCustomRankings('draft')
    seed.addSet('My ROS list', 'Player A\nPlayer B', 'ros')
    seed.addSet('Analyst dynasty', 'Player C\nPlayer D', 'dynasty')

    const kind = ref<'ros' | 'dynasty'>('ros')
    const picker = useCustomRankings(() => kind.value)

    expect(picker.setsOfKind.value.map((s) => s.name)).toEqual(['My ROS list'])
    kind.value = 'dynasty'
    // Captured-once was the bug: this stayed on the ROS list and the upload was unreachable.
    expect(picker.setsOfKind.value.map((s) => s.name)).toEqual(['Analyst dynasty'])
  })

  it('writes the selection against the kind on screen, not the one it started with', () => {
    const seed = useCustomRankings('draft')
    const dyn = seed.addSet('Analyst dynasty', 'Player C\nPlayer D', 'dynasty')

    const kind = ref<'ros' | 'dynasty'>('ros')
    const picker = useCustomRankings(() => kind.value)
    kind.value = 'dynasty'
    picker.setActive(dyn.id)

    expect(picker.activeId.value).toBe(dyn.id)
    // ...and it must not have been recorded against 'ros'.
    expect(useCustomRankings('ros').activeId.value).toBe('')
  })

  it('still accepts a plain string, so every other caller is unaffected', () => {
    const seed = useCustomRankings('draft')
    seed.addSet('Week list', 'Player E', 'week')
    /* Sets are module-level on purpose — the picker and the board that reads it must share
       one store — so this asserts membership rather than an exact list, which would depend
       on what earlier tests happened to add. */
    expect(useCustomRankings('week').setsOfKind.value.map((s) => s.name)).toContain('Week list')
    expect(useCustomRankings('week').setsOfKind.value.every((s) => s.kind === 'week')).toBe(true)
    expect(useCustomRankings('draft').setsOfKind.value.every((s) => s.kind === 'draft')).toBe(true)
  })
})

/**
 * A kind is not unique across sports.
 *
 * Football's draft room and hockey's draft board both read kind 'draft'. Before sports were
 * scoped, a hockey consensus list uploaded for a draft appeared in the football picker and,
 * once selected, was the active list for BOTH boards. It would have mostly no-opped on the
 * football side — no name matches — but the picker names the source in use, so the board would
 * have told the reader whose numbers it was showing and been wrong.
 */
describe('lists do not leak between sports', () => {
  beforeEach(() => localStorage.clear())

  it('offers a sport only its own lists', () => {
    const hockey = useCustomRankings('draft', 'hockey')
    hockey.addSet('DFO consensus', '1 Nathan MacKinnon C', 'draft', 'hockey')
    expect(hockey.setsOfKind.value.map((s) => s.name)).toEqual(['DFO consensus'])
    expect(useCustomRankings('draft', 'football').setsOfKind.value).toEqual([])
  })

  it('keeps a separate active selection per sport', () => {
    const football = useCustomRankings('draft', 'football')
    const hockey = useCustomRankings('draft', 'hockey')
    const f = football.addSet('Analyst FF', '1 Ja\'Marr Chase WR', 'draft', 'football')
    const h = hockey.addSet('Analyst NHL', '1 Nathan MacKinnon C', 'draft', 'hockey')
    football.setActive(f.id, 'draft', 'football')
    hockey.setActive(h.id, 'draft', 'hockey')
    expect(football.activeId.value).toBe(f.id)
    expect(hockey.activeId.value).toBe(h.id)
  })

  it('refuses to make a list active for a sport it does not belong to', () => {
    const hockey = useCustomRankings('draft', 'hockey')
    const h = hockey.addSet('Analyst NHL', '1 Nathan MacKinnon C', 'draft', 'hockey')
    const football = useCustomRankings('draft', 'football')
    football.setActive(h.id, 'draft', 'football')
    expect(football.activeId.value).toBe('')     // falls back to UFD, not the hockey list
  })

  it('treats a list with no sport as football, since every one that predates the field was', () => {
    const football = useCustomRankings('draft', 'football')
    const legacy = football.addSet('Old list', '1 Ja\'Marr Chase WR', 'draft', 'football')
    delete (football.sets.value.find((s) => s.id === legacy.id) as { sport?: string }).sport
    expect(football.setsOfKind.value.some((s) => s.id === legacy.id)).toBe(true)
    /* Asserting hockey is EMPTY would be testing the suite, not the code: sharedSets is
       module-level, so sets added by earlier cases survive a localStorage.clear(). What
       matters is that the unstamped list is not among them. */
    expect(useCustomRankings('draft', 'hockey').setsOfKind.value
      .some((s) => s.id === legacy.id)).toBe(false)
  })
})
