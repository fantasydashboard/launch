import { describe, it, expect } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import ActionFeed from '@/components/myteam/ActionFeed.vue'
import type { Recommendation } from '@/recommendations/types'

const recs: Recommendation[] = [
  {
    id: 'weakness-SV',
    kind: 'category-weakness',
    severity: 'high',
    statId: 'SV',
    headline: '12th in Saves',
    detail: 'You rank 12th of 12 in Saves.',
    evidenceRoute: '/league',
    leverage: 1,
  },
]

describe('ActionFeed', () => {
  it('renders one row per recommendation with headline and detail', () => {
    const wrapper = mount(ActionFeed, {
      props: { recommendations: recs },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    expect(wrapper.findAll('[data-test="rec-row"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('12th in Saves')
    expect(wrapper.text()).toContain('You rank 12th of 12 in Saves.')
  })

  it('shows an empty state when there are no recommendations', () => {
    const wrapper = mount(ActionFeed, {
      props: { recommendations: [] },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    expect(wrapper.findAll('[data-test="rec-row"]')).toHaveLength(0)
    expect(wrapper.text()).toContain('No moves flagged')
  })
})
