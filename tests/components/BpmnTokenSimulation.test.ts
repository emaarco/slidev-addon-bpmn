import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const { mockDestroy, mockImportXML, mockResized, mockZoom, mockGet, MockBpmnViewer } = vi.hoisted(() => ({
  mockDestroy: vi.fn(),
  mockImportXML: vi.fn(),
  mockResized: vi.fn(),
  mockZoom: vi.fn(),
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
    mockZoom.mockClear()
    mockGet.mockClear()
    MockBpmnViewer.mockClear()

    mockImportXML.mockResolvedValue(undefined)
    mockGet.mockReturnValue({ resized: mockResized, zoom: mockZoom })
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

  it('renders successfully when container has dimensions', async () => {
    mockFetchSuccess()
    const wrapper = mount(BpmnTokenSimulation, { props: { bpmnFilePath: 'test.bpmn' } })
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    expect(mockImportXML).toHaveBeenCalled()
    expect(mockResized).toHaveBeenCalled()
    expect(mockZoom).toHaveBeenCalledWith('fit-viewport', 'auto')
  })

  it('shows error when container dimensions timeout', async () => {
    vi.useFakeTimers()
    mockFetchSuccess()
    const wrapper = mount(BpmnTokenSimulation, { props: { bpmnFilePath: 'test.bpmn' } })

    await vi.advanceTimersByTimeAsync(6000)
    await flushPromises()

    expect(wrapper.text()).toContain('Container dimensions not available within timeout')
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

  it('allows retry after error', async () => {
    vi.useFakeTimers()
    mockFetchSuccess()
    const wrapper = mount(BpmnTokenSimulation, { props: { bpmnFilePath: 'test.bpmn' } })

    await vi.advanceTimersByTimeAsync(6000)
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to load BPMN')

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
