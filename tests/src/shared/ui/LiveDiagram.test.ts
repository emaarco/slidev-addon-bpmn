import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type VueWrapper, flushPromises, mount } from '@vue/test-utils'

const { slideEnterCallbacks } = vi.hoisted(() => ({
  slideEnterCallbacks: [] as Array<() => void>,
}))

vi.mock('@slidev/client', () => ({
  onSlideEnter: vi.fn((cb: () => void) => {
    slideEnterCallbacks.push(cb)
  }),
}))

import type { LiveNotation } from '../../../../src/shared/lib/notation'
import LiveDiagram from '../../../../src/shared/ui/LiveDiagram.vue'

const FILE_SOURCE = '<definitions id="from-file"/>'

type FakeViewer = {
  show: ReturnType<typeof vi.fn>
  fit: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
}

function mockFetchSuccess(source = FILE_SOURCE) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(source) })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function giveSize(element: Element, width: number, height: number) {
  const size = { width, height }
  Object.defineProperty(element, 'clientWidth', { configurable: true, get: () => size.width })
  Object.defineProperty(element, 'clientHeight', { configurable: true, get: () => size.height })
  return size
}

function enterSlide(): void {
  slideEnterCallbacks.forEach(callback => callback())
}

describe('LiveDiagram.vue', () => {
  let wrapper: VueWrapper
  let viewers: FakeViewer[]
  let createViewer: ReturnType<typeof vi.fn>
  let notation: LiveNotation

  function mountLiveDiagram(props: { filePath?: string; source?: string } = { filePath: 'process.bpmn' }, attrs = {}) {
    wrapper = mount(LiveDiagram, {
      attachTo: document.body,
      props: { ...props, notation, width: '80%', height: '300px' },
      attrs,
    })
    return wrapper
  }

  function canvas(): Element {
    return wrapper.find('.live-diagram-canvas').element
  }

  beforeEach(() => {
    slideEnterCallbacks.length = 0
    viewers = []
    createViewer = vi.fn(async () => {
      const viewer = { show: vi.fn().mockResolvedValue(undefined), fit: vi.fn(), destroy: vi.fn() }
      viewers.push(viewer)
      return viewer
    })
    notation = { kind: 'BPMN', createViewer }
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    wrapper.unmount()
  })

  it('shows a loading state that names the diagram kind', () => {
    mockFetchSuccess()

    mountLiveDiagram()

    expect(wrapper.text()).toContain('Loading BPMN diagram...')
  })

  it('fetches the file and shows it in the canvas', async () => {
    mockFetchSuccess()
    mountLiveDiagram()
    giveSize(canvas(), 800, 600)

    await vi.waitFor(() => expect(wrapper.emitted('rendered')).toEqual([[FILE_SOURCE]]))

    expect(createViewer).toHaveBeenCalledWith(canvas())
    expect(viewers[0].show).toHaveBeenCalledWith(FILE_SOURCE)
    expect(wrapper.text()).not.toContain('Loading')
  })

  it('shows a given source without fetching a file', async () => {
    const fetchMock = mockFetchSuccess()
    mountLiveDiagram({ source: '<definitions id="given"/>' })
    giveSize(canvas(), 800, 600)

    await vi.waitFor(() => expect(wrapper.emitted('rendered')).toEqual([['<definitions id="given"/>']]))

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('applies width and height to the wrapper and passes attributes to the canvas', () => {
    mockFetchSuccess()

    mountLiveDiagram({ filePath: 'process.bpmn' }, { 'data-testid': 'simulation-canvas' })

    const style = wrapper.find('.live-diagram').attributes('style')
    expect(style).toContain('width: 80%')
    expect(style).toContain('height: 300px')
    expect(canvas().getAttribute('data-testid')).toBe('simulation-canvas')
    expect(wrapper.find('.live-diagram').attributes('data-testid')).toBeUndefined()
  })

  it('shows an error that names the diagram kind when the file cannot be fetched', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))

    mountLiveDiagram()
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to load BPMN')
    expect(wrapper.text()).toContain('404')
    expect(createViewer).not.toHaveBeenCalled()
    expect(wrapper.emitted('rendered')).toBeUndefined()
  })

  it('shows the viewer error and reports nothing when the diagram cannot be shown', async () => {
    mockFetchSuccess()
    createViewer.mockResolvedValueOnce({ show: vi.fn().mockRejectedValue(new Error('no diagram to display')), destroy: vi.fn() })
    mountLiveDiagram()
    giveSize(canvas(), 800, 600)

    await vi.waitFor(() => expect(wrapper.text()).toContain('Failed to load BPMN: no diagram to display'))

    expect(wrapper.emitted('rendered')).toBeUndefined()
  })

  it('renders on slide enter when the preloaded slide stayed hidden', async () => {
    let now = 0
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    const fetchMock = mockFetchSuccess()
    mountLiveDiagram()
    const size = giveSize(canvas(), 0, 0)
    await flushPromises()
    now = 5001
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Loading'))
    expect(createViewer).not.toHaveBeenCalled()
    expect(wrapper.emitted('rendered')).toBeUndefined()

    size.width = 800
    size.height = 600
    enterSlide()

    await vi.waitFor(() => expect(wrapper.emitted('rendered')).toEqual([[FILE_SOURCE]]))
    expect(createViewer).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('keeps the shown diagram when the slide is entered again', async () => {
    mockFetchSuccess()
    mountLiveDiagram()
    giveSize(canvas(), 800, 600)
    await vi.waitFor(() => expect(wrapper.emitted('rendered')).toHaveLength(1))

    enterSlide()
    await flushPromises()

    expect(createViewer).toHaveBeenCalledOnce()
    expect(viewers[0].destroy).not.toHaveBeenCalled()
  })

  it('renders again when the source changes', async () => {
    mountLiveDiagram({ source: '<definitions id="before"/>' })
    giveSize(canvas(), 800, 600)
    await vi.waitFor(() => expect(wrapper.emitted('rendered')).toHaveLength(1))

    await wrapper.setProps({ source: '<definitions id="after"/>' })

    await vi.waitFor(() => expect(wrapper.emitted('rendered')).toHaveLength(2))
    expect(wrapper.emitted('rendered')![1]).toEqual(['<definitions id="after"/>'])
    expect(viewers[0].destroy).toHaveBeenCalledOnce()
    expect(viewers[1].show).toHaveBeenCalledWith('<definitions id="after"/>')
  })

  it('destroys the viewer when unmounted', async () => {
    mockFetchSuccess()
    mountLiveDiagram()
    giveSize(canvas(), 800, 600)
    await vi.waitFor(() => expect(wrapper.emitted('rendered')).toHaveLength(1))

    wrapper.unmount()

    expect(viewers[0].destroy).toHaveBeenCalledOnce()
  })
})
