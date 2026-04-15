import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const { mockDestroy, mockImportXML, mockCreateDiagram, mockResized, mockZoom, mockGet, MockBpmnModeler } = vi.hoisted(() => ({
  mockDestroy: vi.fn(),
  mockImportXML: vi.fn(),
  mockCreateDiagram: vi.fn(),
  mockResized: vi.fn(),
  mockZoom: vi.fn(),
  mockGet: vi.fn(),
  MockBpmnModeler: vi.fn(),
}))

vi.mock('bpmn-js/lib/Modeler', () => ({
  default: MockBpmnModeler,
}))

vi.mock('bpmn-js/dist/assets/bpmn-js.css', () => ({}))
vi.mock('bpmn-js/dist/assets/diagram-js.css', () => ({}))

const { slideEnterCallbacks } = vi.hoisted(() => ({
  slideEnterCallbacks: [] as Array<() => void>,
}))

vi.mock('@slidev/client', () => ({
  onSlideEnter: vi.fn((cb: () => void) => {
    slideEnterCallbacks.push(cb)
  }),
}))

import BpmnModeler from '../../components/BpmnModeler.vue'

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

describe('BpmnModeler.vue', () => {
  beforeEach(() => {
    slideEnterCallbacks.length = 0
    mockDestroy.mockClear()
    mockImportXML.mockClear()
    mockCreateDiagram.mockClear()
    mockResized.mockClear()
    mockZoom.mockClear()
    mockGet.mockClear()
    MockBpmnModeler.mockClear()

    mockImportXML.mockResolvedValue(undefined)
    mockCreateDiagram.mockResolvedValue(undefined)
    mockGet.mockReturnValue({ resized: mockResized, zoom: mockZoom })
    MockBpmnModeler.mockImplementation(function () {
      return {
        importXML: mockImportXML,
        createDiagram: mockCreateDiagram,
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
    const wrapper = mount(BpmnModeler, { props: { bpmnFilePath: 'test.bpmn' } })
    expect(wrapper.text()).toContain('Loading BPMN modeler...')
  })

  it('defaults containerHeight to 500px', () => {
    mockFetchSuccess()
    const wrapper = mount(BpmnModeler, { props: { bpmnFilePath: 'test.bpmn' } })
    const outerDiv = wrapper.find('div').element as HTMLDivElement
    expect(outerDiv.style.height).toBe('500px')
  })

  it('uses provided height for containerHeight', () => {
    mockFetchSuccess()
    const wrapper = mount(BpmnModeler, {
      props: { bpmnFilePath: 'test.bpmn', height: '700px' },
    })
    const outerDiv = wrapper.find('div').element as HTMLDivElement
    expect(outerDiv.style.height).toBe('700px')
  })

  it('renders with a file path when container has dimensions', async () => {
    mockFetchSuccess()
    const wrapper = mount(BpmnModeler, { props: { bpmnFilePath: 'test.bpmn' } })
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    expect(mockImportXML).toHaveBeenCalled()
    expect(mockCreateDiagram).not.toHaveBeenCalled()
    expect(mockResized).toHaveBeenCalled()
    expect(mockZoom).toHaveBeenCalledWith('fit-viewport', 'auto')
  })

  it('creates a blank diagram when no file path is provided', async () => {
    const wrapper = mount(BpmnModeler, {})
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    expect(mockCreateDiagram).toHaveBeenCalled()
    expect(mockImportXML).not.toHaveBeenCalled()
    expect(mockResized).toHaveBeenCalled()
    expect(mockZoom).toHaveBeenCalledWith('fit-viewport', 'auto')
  })

  it('shows error when container dimensions timeout', async () => {
    vi.useFakeTimers()
    mockFetchSuccess()
    const wrapper = mount(BpmnModeler, { props: { bpmnFilePath: 'test.bpmn' } })

    await vi.advanceTimersByTimeAsync(6000)
    await flushPromises()

    expect(wrapper.text()).toContain('Container dimensions not available within timeout')
  })

  it('prevents duplicate rendering', async () => {
    mockFetchSuccess()
    const wrapper = mount(BpmnModeler, { props: { bpmnFilePath: 'test.bpmn' } })
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    const callCountAfterMount = MockBpmnModeler.mock.calls.length

    // Trigger onSlideEnter — should NOT create another modeler
    const lastCallback = slideEnterCallbacks[slideEnterCallbacks.length - 1]
    if (lastCallback) {
      await lastCallback()
      await flushPromises()
    }

    expect(MockBpmnModeler.mock.calls.length).toBe(callCountAfterMount)
  })

  it('allows retry after error', async () => {
    vi.useFakeTimers()
    mockFetchSuccess()
    const wrapper = mount(BpmnModeler, { props: { bpmnFilePath: 'test.bpmn' } })

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

  it('shows error on fetch failure', async () => {
    mockFetchFailure()
    const wrapper = mount(BpmnModeler, { props: { bpmnFilePath: 'missing.bpmn' } })
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to load BPMN')
  })

  it('destroys modeler on unmount', async () => {
    mockFetchSuccess()
    const wrapper = mount(BpmnModeler, { props: { bpmnFilePath: 'test.bpmn' } })
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    wrapper.unmount()
    expect(mockDestroy).toHaveBeenCalled()
  })

  it('does not error on unmount before render completes', async () => {
    vi.useFakeTimers()
    mockFetchSuccess()
    const wrapper = mount(BpmnModeler, { props: { bpmnFilePath: 'test.bpmn' } })
    expect(() => wrapper.unmount()).not.toThrow()
  })
})
