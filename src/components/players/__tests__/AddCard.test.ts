import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AddCard from '@/components/players/AddCard.vue'
import type { Add } from '@/players/types'

const add: Add = {
  player: { playerKey: 'k', name: 'Some Closer', position: 'RP', team: 'NYY', percentOwned: 42, stats: { '32': 30 } },
  statId: '32',
  statValue: 30,
  percentile: 0.95,
}

describe('AddCard', () => {
  it('renders player name, position/team, and the stat value', () => {
    const wrapper = mount(AddCard, { props: { add, statLabel: 'SV' } })
    expect(wrapper.text()).toContain('Some Closer')
    expect(wrapper.text()).toContain('RP')
    expect(wrapper.text()).toContain('NYY')
    expect(wrapper.text()).toContain('30')
    expect(wrapper.text()).toContain('SV')
  })

  it('shows percent owned', () => {
    const wrapper = mount(AddCard, { props: { add, statLabel: 'SV' } })
    expect(wrapper.text()).toContain('42')
  })
})
