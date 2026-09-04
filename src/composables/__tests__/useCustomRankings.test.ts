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
