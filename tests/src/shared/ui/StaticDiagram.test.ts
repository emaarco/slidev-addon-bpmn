import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import type { StaticNotation } from '../../../../src/shared/lib/notation'
import StaticDiagram from '../../../../src/shared/ui/StaticDiagram.vue'

const SAMPLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="50" height="50"/></svg>'

function mockFetchSuccess(source = 'diagram source') {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(source),
  }))
}

function mockFetchFailure() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: false,
    status: 404,
  }))
}

function eventStormingNotation(exportSvg: ReturnType<typeof vi.fn>): StaticNotation {
  return { kind: 'Event Storming', rendering: 'static', exportSvg }
}

function mountStaticDiagram(exportSvg = vi.fn().mockResolvedValue(SAMPLE_SVG)) {
  const wrapper = mount(StaticDiagram, {
    props: {
      filePath: 'board.storm',
      width: '80%',
      height: '300px',
      notation: eventStormingNotation(exportSvg),
    },
  })
  return { wrapper, exportSvg }
}

describe('StaticDiagram.vue', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('shows a loading state that names the diagram kind', () => {
    mockFetchSuccess()

    const { wrapper } = mountStaticDiagram()

    expect(wrapper.text()).toContain('Loading Event Storming diagram...')
  })

  it('renders the exported SVG once the file is loaded', async () => {
    mockFetchSuccess()

    const { wrapper } = mountStaticDiagram()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Loading')
    expect(wrapper.html()).toContain('<svg')
    expect(wrapper.html()).toContain('<rect')
  })

  it('passes the fetched file content and an off-screen container to the exporter', async () => {
    mockFetchSuccess('title Order Checkout')

    const { exportSvg } = mountStaticDiagram()
    await flushPromises()

    expect(exportSvg).toHaveBeenCalledOnce()
    const [source, container] = exportSvg.mock.calls[0]
    expect(source).toBe('title Order Checkout')
    expect(container).toBeInstanceOf(HTMLElement)
  })

  it('applies width and height to the wrapper', async () => {
    mockFetchSuccess()

    const { wrapper } = mountStaticDiagram()
    await flushPromises()

    const style = wrapper.find('.static-diagram').attributes('style')
    expect(style).toContain('width: 80%')
    expect(style).toContain('height: 300px')
  })

  it('shows an error that names the diagram kind when the file cannot be fetched', async () => {
    mockFetchFailure()

    const { wrapper, exportSvg } = mountStaticDiagram()
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to load Event Storming')
    expect(wrapper.text()).toContain('404')
    expect(exportSvg).not.toHaveBeenCalled()
  })

  it('renders a given source without fetching a file', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const exportSvg = vi.fn().mockResolvedValue(SAMPLE_SVG)

    const wrapper = mount(StaticDiagram, {
      props: { source: 'title New Board', width: '100%', height: 'auto', notation: eventStormingNotation(exportSvg) },
    })
    await flushPromises()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(exportSvg.mock.calls[0][0]).toBe('title New Board')
    expect(wrapper.html()).toContain('<svg')
  })

  it('renders again when the source changes', async () => {
    const exportSvg = vi.fn().mockResolvedValue(SAMPLE_SVG)
    const wrapper = mount(StaticDiagram, {
      props: { source: 'title Before', width: '100%', height: 'auto', notation: eventStormingNotation(exportSvg) },
    })
    await flushPromises()

    await wrapper.setProps({ source: 'title After' })
    await flushPromises()

    expect(exportSvg).toHaveBeenCalledTimes(2)
    expect(exportSvg.mock.calls[1][0]).toBe('title After')
  })

  it('reports the source it rendered', async () => {
    mockFetchSuccess('title Order Checkout')

    const { wrapper } = mountStaticDiagram()
    await flushPromises()

    expect(wrapper.emitted('rendered')).toEqual([['title Order Checkout']])
  })

  it('does not report a source it failed to render', async () => {
    mockFetchSuccess()

    const { wrapper } = mountStaticDiagram(vi.fn().mockRejectedValue(new Error('unknown sticky kind')))
    await flushPromises()

    expect(wrapper.emitted('rendered')).toBeUndefined()
  })

  it('shows the exporter error when the diagram cannot be rendered', async () => {
    mockFetchSuccess()

    const { wrapper } = mountStaticDiagram(vi.fn().mockRejectedValue(new Error('unknown sticky kind')))
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to load Event Storming: unknown sticky kind')
    expect(wrapper.html()).not.toContain('<svg')
  })
})
