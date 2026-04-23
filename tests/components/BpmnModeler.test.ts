import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

const { mockViewerDestroy, mockImportXML, mockResized, mockZoom, mockGet, MockBpmnViewer } = vi.hoisted(() => ({
  mockViewerDestroy: vi.fn(),
  mockImportXML: vi.fn(),
  mockResized: vi.fn(),
  mockZoom: vi.fn(),
  mockGet: vi.fn(),
  MockBpmnViewer: vi.fn(),
}))

const { mockModelerDestroy, mockCreateDiagram, mockSaveXML, MockBpmnModeler } = vi.hoisted(() => ({
  mockModelerDestroy: vi.fn(),
  mockCreateDiagram: vi.fn(),
  mockSaveXML: vi.fn(),
  MockBpmnModeler: vi.fn(),
}))

vi.mock('bpmn-js/lib/Viewer', () => ({
  default: MockBpmnViewer,
}))

vi.mock('bpmn-js/lib/Modeler', () => ({
  default: MockBpmnModeler,
}))

vi.mock('bpmn-js/dist/assets/bpmn-js.css', () => ({}))
vi.mock('bpmn-js/dist/assets/diagram-js.css', () => ({}))
vi.mock('bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css', () => ({}))
vi.mock('@bpmn-io/properties-panel/dist/assets/properties-panel.css', () => ({}))

vi.mock('../../engines/zeebe', () => ({
  zeebeEngine: {
    additionalModules: ['zeebe-mod-a', 'zeebe-mod-b'],
    moddleExtensions: { zeebe: { tag: 'zeebe-moddle' } },
  },
}))
vi.mock('../../engines/camunda7', () => ({
  camunda7Engine: {
    additionalModules: ['c7-mod-a', 'c7-mod-b'],
    moddleExtensions: { camunda: { tag: 'camunda-moddle' } },
  },
}))

const { slideEnterCallbacks } = vi.hoisted(() => ({
  slideEnterCallbacks: [] as Array<() => void>,
}))

vi.mock('@slidev/client', () => ({
  onSlideEnter: vi.fn((cb: () => void) => {
    slideEnterCallbacks.push(cb)
  }),
}))

import BpmnModelerComponent from '../../components/BpmnModeler.vue'

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
    mockViewerDestroy.mockClear()
    mockImportXML.mockClear()
    mockResized.mockClear()
    mockZoom.mockClear()
    mockGet.mockClear()
    MockBpmnViewer.mockClear()
    mockModelerDestroy.mockClear()
    mockCreateDiagram.mockClear()
    mockSaveXML.mockClear()
    MockBpmnModeler.mockClear()

    mockImportXML.mockResolvedValue(undefined)
    mockCreateDiagram.mockResolvedValue(undefined)
    mockSaveXML.mockResolvedValue({ xml: '<definitions></definitions>' })
    mockGet.mockReturnValue({ resized: mockResized, zoom: mockZoom, on: vi.fn() })
    MockBpmnViewer.mockImplementation(function () {
      return {
        importXML: mockImportXML,
        destroy: mockViewerDestroy,
        get: mockGet,
      }
    })
    MockBpmnModeler.mockImplementation(function () {
      return {
        importXML: mockImportXML,
        createDiagram: mockCreateDiagram,
        saveXML: mockSaveXML,
        destroy: mockModelerDestroy,
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
    const wrapper = mount(BpmnModelerComponent, { props: { bpmnFilePath: 'test.bpmn' } })
    expect(wrapper.text()).toContain('Loading BPMN diagram...')
  })

  it('defaults containerHeight to 500px', () => {
    mockFetchSuccess()
    const wrapper = mount(BpmnModelerComponent, { props: { bpmnFilePath: 'test.bpmn' } })
    const outerDiv = wrapper.find('div').element as HTMLDivElement
    expect(outerDiv.style.height).toBe('500px')
  })

  it('uses provided height for containerHeight', () => {
    mockFetchSuccess()
    const wrapper = mount(BpmnModelerComponent, {
      props: { bpmnFilePath: 'test.bpmn', height: '700px' },
    })
    const outerDiv = wrapper.find('div').element as HTMLDivElement
    expect(outerDiv.style.height).toBe('700px')
  })

  it('renders viewer with file path when container has dimensions', async () => {
    mockFetchSuccess()
    const wrapper = mount(BpmnModelerComponent, { props: { bpmnFilePath: 'test.bpmn' } })
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    expect(MockBpmnViewer).toHaveBeenCalled()
    expect(mockImportXML).toHaveBeenCalled()
    expect(mockResized).toHaveBeenCalled()
    expect(mockZoom).toHaveBeenCalledWith('fit-viewport', 'auto')
  })

  it('applies 0.92 zoom factor after fit-viewport', async () => {
    mockZoom.mockReturnValue(1.0)
    mockFetchSuccess()
    const wrapper = mount(BpmnModelerComponent, { props: { bpmnFilePath: 'test.bpmn' } })
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    expect(mockZoom).toHaveBeenCalledWith(expect.any(Number), 'auto')
    const zoomCalls = mockZoom.mock.calls
    const secondZoomArg = zoomCalls[zoomCalls.length - 1][0]
    expect(secondZoomArg).toBeCloseTo(0.92, 1)
  })

  it('shows edit button after successful load', async () => {
    mockFetchSuccess()
    const wrapper = mount(BpmnModelerComponent, { props: { bpmnFilePath: 'test.bpmn' } })
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    const button = wrapper.find('button[title="Open modeler"]')
    expect(button.exists()).toBe(true)
    expect(button.text()).toContain('Edit')
  })

  it('hides edit button while loading', () => {
    mockFetchSuccess()
    const wrapper = mount(BpmnModelerComponent, { props: { bpmnFilePath: 'test.bpmn' } })
    expect(wrapper.find('button[title="Open modeler"]').exists()).toBe(false)
  })

  it('creates blank diagram via temp modeler when no file path provided', async () => {
    const wrapper = mount(BpmnModelerComponent, {})
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    expect(mockCreateDiagram).toHaveBeenCalled()
    expect(MockBpmnViewer).toHaveBeenCalled()
  })

  it('shows error when container dimensions timeout', async () => {
    vi.useFakeTimers()
    mockFetchSuccess()
    const wrapper = mount(BpmnModelerComponent, { props: { bpmnFilePath: 'test.bpmn' } })

    await vi.advanceTimersByTimeAsync(6000)
    await flushPromises()

    expect(wrapper.text()).toContain('Container dimensions not available within timeout')
  })

  it('prevents duplicate rendering', async () => {
    mockFetchSuccess()
    const wrapper = mount(BpmnModelerComponent, { props: { bpmnFilePath: 'test.bpmn' } })
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    const callCountAfterMount = MockBpmnViewer.mock.calls.length

    const lastCallback = slideEnterCallbacks[slideEnterCallbacks.length - 1]
    if (lastCallback) {
      await lastCallback()
      await flushPromises()
    }

    expect(MockBpmnViewer.mock.calls.length).toBe(callCountAfterMount)
  })

  it('shows error on fetch failure', async () => {
    mockFetchFailure()
    const wrapper = mount(BpmnModelerComponent, { props: { bpmnFilePath: 'missing.bpmn' } })
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to load BPMN')
  })

  it('destroys viewer on unmount', async () => {
    mockFetchSuccess()
    const wrapper = mount(BpmnModelerComponent, { props: { bpmnFilePath: 'test.bpmn' } })
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    wrapper.unmount()
    expect(mockViewerDestroy).toHaveBeenCalled()
  })

  it('does not error on unmount before render completes', async () => {
    vi.useFakeTimers()
    mockFetchSuccess()
    const wrapper = mount(BpmnModelerComponent, { props: { bpmnFilePath: 'test.bpmn' } })
    expect(() => wrapper.unmount()).not.toThrow()
  })

  async function withModelerDimensions<T>(fn: () => Promise<T>): Promise<T> {
    // Temporarily give all HTMLElements dimensions so waitForContainer resolves
    // for the teleported modeler container (which has no layout in jsdom)
    const origClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth')
    const origClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight')
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { get: () => 1200, configurable: true })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { get: () => 800, configurable: true })
    try {
      return await fn()
    } finally {
      if (origClientWidth) Object.defineProperty(HTMLElement.prototype, 'clientWidth', origClientWidth)
      if (origClientHeight) Object.defineProperty(HTMLElement.prototype, 'clientHeight', origClientHeight)
    }
  }

  it('edit button click opens fullscreen modeler', async () => {
    mockFetchSuccess()
    const wrapper = mount(BpmnModelerComponent, { props: { bpmnFilePath: 'test.bpmn' } })
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    MockBpmnModeler.mockClear()
    mockImportXML.mockClear()

    await withModelerDimensions(() => (wrapper.vm as any).openFullscreen())

    expect(MockBpmnModeler).toHaveBeenCalled()
    expect(mockImportXML).toHaveBeenCalledWith('<definitions></definitions>')
  })

  it('close button saves XML and re-renders viewer when changes were made', async () => {
    let commandStackChangedCallback: (() => void) | null = null
    mockGet.mockImplementation((service: string) => {
      if (service === 'eventBus') {
        return { on: (_event: string, cb: () => void) => { commandStackChangedCallback = cb } }
      }
      return { resized: mockResized, zoom: mockZoom, on: vi.fn() }
    })

    mockFetchSuccess()
    const wrapper = mount(BpmnModelerComponent, { props: { bpmnFilePath: 'test.bpmn' } })
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    await withModelerDimensions(() => (wrapper.vm as any).openFullscreen())

    expect(commandStackChangedCallback).not.toBeNull()

    // Simulate a diagram change and close the modeler
    mockSaveXML.mockResolvedValue({ xml: '<definitions>changed</definitions>' })
    commandStackChangedCallback!()

    mockImportXML.mockClear()
    await (wrapper.vm as any).closeFullscreen()
    await flushPromises()

    expect(mockSaveXML).toHaveBeenCalled()
    expect(mockModelerDestroy).toHaveBeenCalled()
    expect(mockImportXML).toHaveBeenCalledWith('<definitions>changed</definitions>')
  })

  it('close button skips saveXML when no changes were made', async () => {
    mockFetchSuccess()
    const wrapper = mount(BpmnModelerComponent, { props: { bpmnFilePath: 'test.bpmn' } })
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    await withModelerDimensions(() => (wrapper.vm as any).openFullscreen())

    mockSaveXML.mockClear()
    mockImportXML.mockClear()

    await (wrapper.vm as any).closeFullscreen()
    await flushPromises()

    expect(mockSaveXML).not.toHaveBeenCalled()
    expect(mockModelerDestroy).toHaveBeenCalled()
    expect(mockImportXML).not.toHaveBeenCalled()
  })

  it('passes only { container } to the modeler when no engine prop is set', async () => {
    mockFetchSuccess()
    const wrapper = mount(BpmnModelerComponent, { props: { bpmnFilePath: 'test.bpmn' } })
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    MockBpmnModeler.mockClear()
    await withModelerDimensions(() => (wrapper.vm as any).openFullscreen())

    const options = MockBpmnModeler.mock.calls[0][0]
    expect(options).toHaveProperty('container')
    expect(options).not.toHaveProperty('additionalModules')
    expect(options).not.toHaveProperty('moddleExtensions')
    expect(options).not.toHaveProperty('propertiesPanel')

    expect(document.querySelector('[ref="propertiesPanelRef"]')).toBeNull()
  })

  it('engine="zeebe" wires Zeebe modules, moddle and a panel parent', async () => {
    mockFetchSuccess()
    const wrapper = mount(BpmnModelerComponent, {
      props: { bpmnFilePath: 'test.bpmn', engine: 'zeebe' },
    })
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    MockBpmnModeler.mockClear()
    await withModelerDimensions(() => (wrapper.vm as any).openFullscreen())

    const options = MockBpmnModeler.mock.calls[0][0]
    expect(options.additionalModules).toEqual(['zeebe-mod-a', 'zeebe-mod-b'])
    expect(options.moddleExtensions).toEqual({ zeebe: { tag: 'zeebe-moddle' } })
    expect(options.propertiesPanel).toBeDefined()
    expect(options.propertiesPanel.parent).toBeInstanceOf(HTMLElement)
  })

  it('engine="camunda7" wires Camunda Platform modules, moddle and a panel parent', async () => {
    mockFetchSuccess()
    const wrapper = mount(BpmnModelerComponent, {
      props: { bpmnFilePath: 'test.bpmn', engine: 'camunda7' },
    })
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    MockBpmnModeler.mockClear()
    await withModelerDimensions(() => (wrapper.vm as any).openFullscreen())

    const options = MockBpmnModeler.mock.calls[0][0]
    expect(options.additionalModules).toEqual(['c7-mod-a', 'c7-mod-b'])
    expect(options.moddleExtensions).toEqual({ camunda: { tag: 'camunda-moddle' } })
    expect(options.propertiesPanel).toBeDefined()
    expect(options.propertiesPanel.parent).toBeInstanceOf(HTMLElement)
  })
})
