import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

const { mockViewerDestroy, mockImportXML, mockResized, mockViewbox, mockGet, MockBpmnViewer } = vi.hoisted(() => ({
  mockViewerDestroy: vi.fn(),
  mockImportXML: vi.fn(),
  mockResized: vi.fn(),
  mockViewbox: vi.fn(),
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
vi.mock('bpmn-js-token-simulation/assets/css/bpmn-js-token-simulation.css', () => ({}))

vi.mock('bpmn-js-token-simulation', () => ({ default: 'token-sim-modeler' }))
vi.mock('bpmn-js-token-simulation/lib/viewer', () => ({ default: 'token-sim-viewer' }))

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
    mockViewbox.mockClear()
    mockGet.mockClear()
    MockBpmnViewer.mockClear()
    mockModelerDestroy.mockClear()
    mockCreateDiagram.mockClear()
    mockSaveXML.mockClear()
    MockBpmnModeler.mockClear()

    mockImportXML.mockResolvedValue(undefined)
    mockCreateDiagram.mockResolvedValue(undefined)
    mockSaveXML.mockResolvedValue({ xml: '<definitions></definitions>' })
    // Default viewbox getter returns a sensible inner bbox; setter calls capture
    // the resulting fitDiagram payload for assertions below.
    mockViewbox.mockImplementation((box?: unknown) => {
      if (box) return undefined
      return {
        inner: { x: 0, y: 0, width: 1000, height: 500 },
        outer: { width: 800, height: 500 },
      }
    })
    mockGet.mockReturnValue({ resized: mockResized, viewbox: mockViewbox, on: vi.fn() })
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
    // fitDiagram() runs after import: one getter call (no args) plus one setter
    // call carrying the padded viewbox object.
    const setterCalls = mockViewbox.mock.calls.filter((args) => args.length === 1 && typeof args[0] === 'object')
    expect(setterCalls.length).toBeGreaterThanOrEqual(1)
    expect(setterCalls[0][0]).toMatchObject({
      x: expect.any(Number),
      y: expect.any(Number),
      width: expect.any(Number),
      height: expect.any(Number),
    })
  })

  it('re-fits the inline viewer when its container resizes after the initial fit', async () => {
    let observerCallback: ((entries: Array<{ contentRect: { width: number, height: number } }>) => void) | null = null
    vi.stubGlobal('ResizeObserver', class {
      constructor(cb: (entries: Array<{ contentRect: { width: number, height: number } }>) => void) {
        observerCallback = cb
      }
      observe() {}
      disconnect() {}
    })

    mockFetchSuccess()
    const wrapper = mount(BpmnModelerComponent, { props: { bpmnFilePath: 'test.bpmn' } })
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    const resizedBefore = mockResized.mock.calls.length
    const setterBefore = mockViewbox.mock.calls.filter((args) => args.length === 1 && typeof args[0] === 'object').length
    expect(observerCallback).not.toBeNull()

    observerCallback!([{ contentRect: { width: 450, height: 290 } }])
    await flushPromises()

    const setterAfter = mockViewbox.mock.calls.filter((args) => args.length === 1 && typeof args[0] === 'object').length
    expect(mockResized.mock.calls.length).toBeGreaterThan(resizedBefore)
    expect(setterAfter).toBeGreaterThan(setterBefore)
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

  it('bails silently when container dimensions never arrive (Slidev preload)', async () => {
    vi.useFakeTimers()
    mockFetchSuccess()
    const wrapper = mount(BpmnModelerComponent, { props: { bpmnFilePath: 'test.bpmn' } })

    await vi.advanceTimersByTimeAsync(6000)
    await flushPromises()

    expect(wrapper.text()).not.toContain('Container dimensions not available within timeout')
    expect(wrapper.text()).not.toContain('Failed to load BPMN')
    expect(MockBpmnViewer).not.toHaveBeenCalled()
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
      return { resized: mockResized, viewbox: mockViewbox, on: vi.fn() }
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

  it('passes no additionalModules to the inline viewer when tokenSimulation is off', async () => {
    mockFetchSuccess()
    const wrapper = mount(BpmnModelerComponent, { props: { bpmnFilePath: 'test.bpmn' } })
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    const options = MockBpmnViewer.mock.calls[0][0]
    expect(options).not.toHaveProperty('additionalModules')
  })

  it('wires the token-simulation viewer module into the inline viewer when tokenSimulation is on', async () => {
    mockFetchSuccess()
    const wrapper = mount(BpmnModelerComponent, {
      props: { bpmnFilePath: 'test.bpmn', tokenSimulation: true },
    })
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    const options = MockBpmnViewer.mock.calls[0][0]
    expect(options.additionalModules).toContain('token-sim-viewer')
  })

  it('wires the token-simulation modeler module into the fullscreen modeler when tokenSimulation is on', async () => {
    mockFetchSuccess()
    const wrapper = mount(BpmnModelerComponent, {
      props: { bpmnFilePath: 'test.bpmn', tokenSimulation: true },
    })
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    MockBpmnModeler.mockClear()
    await withModelerDimensions(() => (wrapper.vm as any).openFullscreen())

    const options = MockBpmnModeler.mock.calls[0][0]
    expect(options.additionalModules).toContain('token-sim-modeler')
  })

  it('combines engine modules and token-simulation in the fullscreen modeler', async () => {
    mockFetchSuccess()
    const wrapper = mount(BpmnModelerComponent, {
      props: { bpmnFilePath: 'test.bpmn', engine: 'zeebe', tokenSimulation: true },
    })
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    MockBpmnModeler.mockClear()
    await withModelerDimensions(() => (wrapper.vm as any).openFullscreen())

    const options = MockBpmnModeler.mock.calls[0][0]
    expect(options.additionalModules).toEqual(['zeebe-mod-a', 'zeebe-mod-b', 'token-sim-modeler'])
    expect(options.propertiesPanel).toBeDefined()
  })

  it('togglePanel flips isPanelOpen and triggers canvas.resized()', async () => {
    mockFetchSuccess()
    const wrapper = mount(BpmnModelerComponent, {
      props: { bpmnFilePath: 'test.bpmn', engine: 'zeebe' },
    })
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    await withModelerDimensions(() => (wrapper.vm as any).openFullscreen())

    mockResized.mockClear()
    await (wrapper.vm as any).togglePanel()
    await flushPromises()

    expect(mockResized).toHaveBeenCalled()
  })

  it('engine="camunda7" wires Camunda Platform modules, moddle and a panel parent', async () => {
    mockGet.mockImplementation((service: string) => {
      if (service === 'transactionBoundaries') return { show: vi.fn() }
      return { resized: mockResized, viewbox: mockViewbox, on: vi.fn() }
    })
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

  it('shows transaction boundaries when transactionBoundaries is on and engine="camunda7"', async () => {
    const mockShow = vi.fn()
    mockGet.mockImplementation((service: string) => {
      if (service === 'transactionBoundaries') return { show: mockShow }
      return { resized: mockResized, viewbox: mockViewbox, on: vi.fn() }
    })
    mockFetchSuccess()
    const wrapper = mount(BpmnModelerComponent, {
      props: { bpmnFilePath: 'test.bpmn', engine: 'camunda7', transactionBoundaries: true },
    })
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    await withModelerDimensions(() => (wrapper.vm as any).openFullscreen())

    expect(mockShow).toHaveBeenCalled()
  })

  it('does not show transaction boundaries by default (engine="camunda7", prop unset)', async () => {
    const mockShow = vi.fn()
    mockGet.mockImplementation((service: string) => {
      if (service === 'transactionBoundaries') return { show: mockShow }
      return { resized: mockResized, viewbox: mockViewbox, on: vi.fn() }
    })
    mockFetchSuccess()
    const wrapper = mount(BpmnModelerComponent, {
      props: { bpmnFilePath: 'test.bpmn', engine: 'camunda7' },
    })
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    await withModelerDimensions(() => (wrapper.vm as any).openFullscreen())

    expect(mockShow).not.toHaveBeenCalled()
  })

  it('warns and skips transaction boundaries when enabled without engine="camunda7"', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockFetchSuccess()
    const wrapper = mount(BpmnModelerComponent, {
      props: { bpmnFilePath: 'test.bpmn', engine: 'zeebe', transactionBoundaries: true },
    })
    giveContainerDimensions(wrapper)

    await new Promise(resolve => setTimeout(resolve, 50))
    await flushPromises()

    await withModelerDimensions(() => (wrapper.vm as any).openFullscreen())

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('transactionBoundaries requires engine="camunda7"'))
    warnSpy.mockRestore()
  })
})
