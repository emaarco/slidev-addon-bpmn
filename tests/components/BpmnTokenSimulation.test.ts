import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const { mockDestroy, mockImportXML, mockResized, mockViewbox, mockGet, MockBpmnViewer } = vi.hoisted(() => ({
  mockDestroy: vi.fn(),
  mockImportXML: vi.fn(),
  mockResized: vi.fn(),
  mockViewbox: vi.fn(),
  mockGet: vi.fn(),
  MockBpmnViewer: vi.fn(),
}))

vi.mock('bpmn-js/lib/Viewer', () => ({
  default: MockBpmnViewer,
}))

vi.mock('bpmn-js-token-simulation/lib/viewer', () => ({
  default: {},
}))

const { slideEnterCallbacks } = vi.hoisted(() => ({
  slideEnterCallbacks: [] as Array<() => void>,
}))

vi.mock('@slidev/client', () => ({
  onSlideEnter: vi.fn((cb: () => void) => {
    slideEnterCallbacks.push(cb)
  }),
}))

import BpmnTokenSimulation from '../../components/BpmnTokenSimulation.vue'

function mockFetchSuccess(xml = '<definitions></definitions>') {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(xml),
  }))
}

function mockFetchFailure() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: false,
    status: 404,
  }))
}

function giveContainerDimensions(wrapper: ReturnType<typeof mount>) {
  const containerEl = wrapper.find('div[style*="calc"]').element as HTMLDivElement
  if (containerEl) {
    Object.defineProperty(containerEl, 'clientWidth', { value: 800, configurable: true })
    Object.defineProperty(containerEl, 'clientHeight', { value: 500, configurable: true })
  }
}

describe('BpmnTokenSimulation.vue', () => {
  beforeEach(() => {
    slideEnterCallbacks.length = 0
    mockDestroy.mockClear()
    mockImportXML.mockClear()
    mockResized.mockClear()
    mockViewbox.mockClear()
    mockGet.mockClear()
    MockBpmnViewer.mockClear()

    mockImportXML.mockResolvedValue(undefined)
    // Default viewbox getter returns a sensible inner bbox so fitDiagram has something
    // to work with; tests that assert on the setter inspect the most recent call.
    mockViewbox.mockImplementation((box?: unknown) => {
      if (box) return undefined
      return {
        inner: { x: 0, y: 0, width: 1000, height: 500 },
        outer: { width: 800, height: 500 },
      }
    })
    mockGet.mockReturnValue({ resized: mockResized, viewbox: mockViewbox })
    MockBpmnViewer.mockImplementation(function () {
      return {
        importXML: mockImportXML,
        destroy: mockDestroy,
        get: mockGet,
      }
    })

    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('shows loading state initially', () => {
    mockFetchSuccess()
    const wrapper = mount(BpmnTokenSimulation, { props: { bpmnFilePath: 'test.bpmn' } })
    expect(wrapper.text()).toContain('Loading BPMN diagram...')
  })

  it('defaults containerHeight to 500px when height is auto', () => {
    mockFetchSuccess()
    const wrapper = mount(BpmnTokenSimulation, { props: { bpmnFilePath: 'test.bpmn' } })
    const outerDiv = wrapper.find('div').element as HTMLDivElement
    expect(outerDiv.style.height).toBe('500px')
  })

  it('uses provided height for containerHeight', () => {
    mockFetchSuccess()
    const wrapper = mount(BpmnTokenSimulation, {
      props: { bpmnFilePath: 'test.bpmn', height: '700px' },
    })
    const outerDiv = wrapper.find('div').element as HTMLDivElement
    expect(outerDiv.style.height).toBe('700px')
  })

  it('sizes the root to the width prop while the inner container fills it', () => {
    mockFetchSuccess()
    const wrapper = mount(BpmnTokenSimulation, {
      props: { bpmnFilePath: 'test.bpmn', width: '90%' },
    })
    const rootDiv = wrapper.find('div').element as HTMLDivElement
    const innerDiv = wrapper.find('div[style*="calc"]').element as HTMLDivElement
    // The root carries the actual width; the inner container fills it (100% - margins)
    // instead of re-applying the % — which used to shrink a 90% viewer to ~81% and centre it.
    expect(rootDiv.style.width).toBe('90%')
    expect(innerDiv.style.width).toBe('calc(100% - 10px)')
    expect(innerDiv.style.height).toBe('calc(100% - 10px)')
  })

  it('renders successfully when container has dimensions', async () => {
    mockFetchSuccess()
    const wrapper = mount(BpmnTokenSimulation, { props: { bpmnFilePath: 'test.bpmn' } })
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    expect(mockImportXML).toHaveBeenCalled()
    expect(mockResized).toHaveBeenCalled()
    // fitDiagram() fires a getter call (no args) and one setter call carrying the
    // padded viewbox object.
    const setterCalls = mockViewbox.mock.calls.filter((args) => args.length === 1 && typeof args[0] === 'object')
    expect(setterCalls.length).toBeGreaterThanOrEqual(1)
    expect(setterCalls[0][0]).toMatchObject({
      x: expect.any(Number),
      y: expect.any(Number),
      width: expect.any(Number),
      height: expect.any(Number),
    })
  })

  it('bails silently when container dimensions never arrive (Slidev preload)', async () => {
    vi.useFakeTimers()
    mockFetchSuccess()
    const wrapper = mount(BpmnTokenSimulation, { props: { bpmnFilePath: 'test.bpmn' } })

    await vi.advanceTimersByTimeAsync(6000)
    await flushPromises()

    // No error message surfaced; no viewer constructed.
    expect(wrapper.text()).not.toContain('Container dimensions not available within timeout')
    expect(wrapper.text()).not.toContain('Failed to load BPMN')
    expect(MockBpmnViewer).not.toHaveBeenCalled()
  })

  it('prevents duplicate rendering', async () => {
    mockFetchSuccess()
    const wrapper = mount(BpmnTokenSimulation, { props: { bpmnFilePath: 'test.bpmn' } })
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    const callCountAfterMount = MockBpmnViewer.mock.calls.length

    // Trigger onSlideEnter — should NOT create another viewer
    const lastCallback = slideEnterCallbacks[slideEnterCallbacks.length - 1]
    if (lastCallback) {
      await lastCallback()
      await flushPromises()
    }

    expect(MockBpmnViewer.mock.calls.length).toBe(callCountAfterMount)
  })

  it('renders on slide-enter after onMounted bailed (preloaded then visible)', async () => {
    vi.useFakeTimers()
    mockFetchSuccess()
    const wrapper = mount(BpmnTokenSimulation, { props: { bpmnFilePath: 'test.bpmn' } })

    await vi.advanceTimersByTimeAsync(6000)
    await flushPromises()
    expect(MockBpmnViewer).not.toHaveBeenCalled()

    giveContainerDimensions(wrapper)

    const lastCallback = slideEnterCallbacks[slideEnterCallbacks.length - 1]
    if (lastCallback) {
      await lastCallback()
      await vi.advanceTimersByTimeAsync(100)
      await flushPromises()
    }

    expect(mockImportXML).toHaveBeenCalled()
  })

  it('destroys viewer on unmount', async () => {
    mockFetchSuccess()
    const wrapper = mount(BpmnTokenSimulation, { props: { bpmnFilePath: 'test.bpmn' } })
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    wrapper.unmount()
    expect(mockDestroy).toHaveBeenCalled()
  })

  it('does not error on unmount before render completes', async () => {
    vi.useFakeTimers()
    mockFetchSuccess()
    const wrapper = mount(BpmnTokenSimulation, { props: { bpmnFilePath: 'test.bpmn' } })
    expect(() => wrapper.unmount()).not.toThrow()
  })

  it('shows error on fetch failure', async () => {
    mockFetchFailure()
    const wrapper = mount(BpmnTokenSimulation, { props: { bpmnFilePath: 'missing.bpmn' } })
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to load BPMN')
  })
})
