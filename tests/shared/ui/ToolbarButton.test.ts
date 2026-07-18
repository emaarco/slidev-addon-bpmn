import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ToolbarButton from '../../../shared/ui/ToolbarButton.vue'

describe('ToolbarButton.vue', () => {
  it('renders the label when provided', () => {
    const wrapper = mount(ToolbarButton, { props: { title: 'Open', label: 'Expand' } })
    expect(wrapper.text()).toContain('Expand')
  })

  it('omits the label span when label prop is missing', () => {
    const wrapper = mount(ToolbarButton, { props: { title: 'Open' } })
    expect(wrapper.find('span').exists()).toBe(false)
  })

  it('renders the icon slot content', () => {
    const wrapper = mount(ToolbarButton, {
      props: { title: 'Open', label: 'Expand' },
      slots: { icon: '<svg data-testid="icon" />' },
    })
    expect(wrapper.find('[data-testid="icon"]').exists()).toBe(true)
  })

  it('forwards the title prop to the button title attribute', () => {
    const wrapper = mount(ToolbarButton, { props: { title: 'Open in fullscreen', label: 'Expand' } })
    expect(wrapper.find('button').attributes('title')).toBe('Open in fullscreen')
  })

  it('emits click with the native event when the button is clicked', async () => {
    const wrapper = mount(ToolbarButton, { props: { title: 'Open', label: 'Expand' } })
    await wrapper.find('button').trigger('click')

    const events = wrapper.emitted('click')
    expect(events).toHaveLength(1)
    expect(events![0][0]).toBeInstanceOf(MouseEvent)
  })

  it('flows inline (no absolute positioning) when no position prop is given', () => {
    const wrapper = mount(ToolbarButton, { props: { title: 'Open', label: 'Expand' } })
    const style = wrapper.find('button').attributes('style') ?? ''
    expect(style).not.toContain('position: absolute')
  })

  it('applies absolute positioning and offsets when position prop is given', () => {
    const wrapper = mount(ToolbarButton, {
      props: {
        title: 'Open',
        label: 'Expand',
        position: { top: '12px', right: '12px', zIndex: 10 },
      },
    })
    const style = wrapper.find('button').attributes('style') ?? ''
    expect(style).toContain('position: absolute')
    expect(style).toContain('top: 12px')
    expect(style).toContain('right: 12px')
    expect(style).toContain('z-index: 10')
  })
})
