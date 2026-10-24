import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('bpmn-js/lib/Viewer', async () => ({ default: (await import('../../src/bpmn/fakeBpmnJs')).FakeBpmnViewer }))
vi.mock('bpmn-js-token-simulation/lib/viewer', () => ({ default: 'token-simulation-viewer' }))
vi.mock('@emaarco/bpmn-js-data-simulation', () => ({ default: 'data-simulation' }))
vi.mock('../../../src/bpmn/engines/zeebe', () => ({
  zeebeEngine: { additionalModules: ['zeebe-module'], moddleExtensions: { zeebe: { name: 'zeebe' } }, supportsTransactionBoundaries: false },
}))
vi.mock('../../../src/bpmn/engines/camunda7', () => ({
  camunda7Engine: { additionalModules: ['camunda7-module'], moddleExtensions: { camunda: { name: 'camunda' } }, supportsTransactionBoundaries: true },
}))

const { slideEnterCallbacks } = vi.hoisted(() => ({ slideEnterCallbacks: [] as Array<() => Promise<void>> }))

vi.mock('@slidev/client', () => ({
  onSlideEnter: (callback: () => Promise<void>) => slideEnterCallbacks.push(callback),
}))

import BpmnTokenSimulation from '../../../components/bpmn/BpmnTokenSimulation.vue'
import { bpmnJs, SMALL_DIAGRAM } from '../../src/bpmn/fakeBpmnJs'

enableAutoUnmount(afterEach)

const BPMN_XML = '<definitions id="newsletter"></definitions>'
const SCENARIOS = { scenarios: [{ id: 'small-order' }] }

function mockFetchFiles(files: Record<string, string>) {
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    const path = Object.keys(files).find(file => url.endsWith(`/${file}`))
    return Promise.resolve(path === undefined
      ? { ok: false, status: 404 }
      : { ok: true, text: () => Promise.resolve(files[path]) })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function mockFetchSuccess() {
  return mockFetchFiles({ 'test.bpmn': BPMN_XML })
}

function giveSize(element: Element, width: number, height: number) {
  Object.defineProperty(element, 'clientWidth', { value: width, configurable: true })
  Object.defineProperty(element, 'clientHeight', { value: height, configurable: true })
}

function mountSimulation(props: Record<string, unknown> = {}, canvasWidth = 800) {
  const wrapper = mount(BpmnTokenSimulation, { attachTo: document.body, props: { bpmnFilePath: 'test.bpmn', ...props } })
  giveSize(wrapper.find('.live-diagram-canvas').element, canvasWidth, 500)
  return wrapper
}

async function settle() {
  for (let i = 0; i < 3; i++) {
    await flushPromises()
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

async function mountAndRender(props?: Record<string, unknown>, canvasWidth?: number) {
  const wrapper = mountSimulation(props, canvasWidth)
  await settle()
  return wrapper
}

function button(title: string): HTMLButtonElement | null {
  return document.body.querySelector(`button[title="${title}"]`)
}

async function openFullscreen() {
  button('Open in fullscreen')!.click()
  await nextTick()
  giveSize(document.body.querySelector('.bpmn-token-simulation-fullscreen')!, 1600, 900)
  await settle()
}

function overlay(): Element | null {
  return document.body.querySelector('.fullscreen-overlay')
}

describe('BpmnTokenSimulation.vue', () => {
  beforeEach(() => {
    bpmnJs.reset()
    slideEnterCallbacks.length = 0
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('inline viewer', () => {
    it('shows the loading state and no Expand button until the diagram is rendered', () => {
      mockFetchSuccess()

      const wrapper = mountSimulation()

      expect(wrapper.text()).toContain('Loading BPMN diagram...')
      expect(button('Open in fullscreen')).toBeNull()
    })

    it('defaults to full width and a 500px height for height="auto"', () => {
      mockFetchSuccess()

      const root = mountSimulation().element as HTMLDivElement

      expect(root.style.width).toBe('100%')
      expect(root.style.height).toBe('500px')
    })

    it('applies the width and height props to the root only', () => {
      mockFetchSuccess()

      const wrapper = mountSimulation({ width: '90%', height: '700px' })

      const root = wrapper.element as HTMLDivElement
      const liveDiagram = wrapper.find('.live-diagram').element as HTMLDivElement
      expect(root.style.width).toBe('90%')
      expect(root.style.height).toBe('700px')
      expect(liveDiagram.style.width).toBe('100%')
      expect(liveDiagram.style.height).toBe('100%')
    })

    it('renders the fetched file in a fitted token simulation viewer', async () => {
      const fetchMock = mockFetchSuccess()

      const wrapper = await mountAndRender()

      const canvas = wrapper.find('.live-diagram-canvas').element
      expect(fetchMock).toHaveBeenCalledWith(`${window.location.origin}/test.bpmn`)
      expect(bpmnJs.viewers).toHaveLength(1)
      expect(bpmnJs.lastViewer().options.container).toBe(canvas)
      expect(bpmnJs.lastViewer().options.additionalModules).toContain('token-simulation-viewer')
      expect(bpmnJs.lastViewer().options).not.toHaveProperty('dataSimulation')
      expect(bpmnJs.lastViewer().importXML).toHaveBeenCalledWith(BPMN_XML)
      expect(bpmnJs.lastViewer().fittedViewbox()).toBeDefined()
      expect(wrapper.text()).not.toContain('Loading BPMN diagram...')
    })

    it('scales the simulation toggle down in a narrow viewer', async () => {
      mockFetchSuccess()

      const wrapper = await mountAndRender({}, 300)

      const canvas = wrapper.find('.live-diagram-canvas').element as HTMLElement
      expect(canvas.style.getPropertyValue('--bts-toggle-scale')).toBe('0.5')
    })

    it('caps the fit at maxScale', async () => {
      bpmnJs.viewbox = SMALL_DIAGRAM
      mockFetchSuccess()

      await mountAndRender({ maxScale: 1 })

      expect(bpmnJs.lastViewer().fittedViewbox()).toMatchObject({ width: 800, height: 500 })
    })

    it('shows an error and no Expand button when the file cannot be fetched', async () => {
      mockFetchFiles({})

      const wrapper = await mountAndRender({ bpmnFilePath: 'missing.bpmn' })

      expect(wrapper.text()).toContain('Failed to load BPMN: Failed to fetch BPMN file: 404')
      expect(button('Open in fullscreen')).toBeNull()
      expect(bpmnJs.viewers).toHaveLength(0)
    })

    it('waits for a hidden slide and renders once it is entered with a size', async () => {
      vi.useFakeTimers()
      mockFetchSuccess()
      const wrapper = mount(BpmnTokenSimulation, { attachTo: document.body, props: { bpmnFilePath: 'test.bpmn' } })

      await vi.advanceTimersByTimeAsync(6000)
      expect(bpmnJs.viewers).toHaveLength(0)
      expect(wrapper.text()).not.toContain('Failed to load BPMN')

      giveSize(wrapper.find('.live-diagram-canvas').element, 800, 500)
      const slideEntered = slideEnterCallbacks[0]()
      await vi.advanceTimersByTimeAsync(100)
      await slideEntered

      expect(bpmnJs.viewers).toHaveLength(1)
      expect(button('Open in fullscreen')).not.toBeNull()
    })

    it('does not render again when the slide is entered after the first render', async () => {
      mockFetchSuccess()
      await mountAndRender()

      await slideEnterCallbacks[0]()
      await settle()

      expect(bpmnJs.viewers).toHaveLength(1)
    })

    it('destroys the viewer on unmount', async () => {
      mockFetchSuccess()
      const wrapper = await mountAndRender()

      wrapper.unmount()

      expect(bpmnJs.lastViewer().destroy).toHaveBeenCalledOnce()
    })

    it('unmounts cleanly before the render finished', () => {
      mockFetchSuccess()
      const wrapper = mountSimulation()

      expect(() => wrapper.unmount()).not.toThrow()
    })
  })

  describe('fullscreen viewer', () => {
    it('offers no Expand button with fullscreen=false', async () => {
      mockFetchSuccess()

      await mountAndRender({ fullscreen: false })

      expect(bpmnJs.viewers).toHaveLength(1)
      expect(button('Open in fullscreen')).toBeNull()
    })

    it('opens a second viewer on the rendered diagram when Expand is clicked', async () => {
      mockFetchSuccess()
      await mountAndRender()

      await openFullscreen()

      const fullscreenContainer = document.body.querySelector('.fullscreen-overlay .bpmn-token-simulation-fullscreen')
      expect(overlay()).not.toBeNull()
      expect(bpmnJs.viewers).toHaveLength(2)
      expect(bpmnJs.lastViewer().options.container).toBe(fullscreenContainer)
      expect(bpmnJs.lastViewer().importXML).toHaveBeenCalledWith(BPMN_XML)
      expect(bpmnJs.lastViewer().fittedViewbox()).toBeDefined()
    })

    it('destroys only the fullscreen viewer when Close is clicked', async () => {
      mockFetchSuccess()
      await mountAndRender()
      await openFullscreen()
      const [inlineViewer, fullscreenViewer] = bpmnJs.viewers

      button('Close fullscreen')!.click()
      await settle()

      expect(overlay()).toBeNull()
      expect(fullscreenViewer.destroy).toHaveBeenCalledOnce()
      expect(inlineViewer.destroy).not.toHaveBeenCalled()
    })

    it('destroys both viewers on unmount while fullscreen is open', async () => {
      mockFetchSuccess()
      const wrapper = await mountAndRender()
      await openFullscreen()

      wrapper.unmount()

      expect(bpmnJs.viewers.map(viewer => viewer.destroy.mock.calls.length)).toEqual([1, 1])
      expect(overlay()).toBeNull()
    })
  })

  describe('data simulation', () => {
    it.each([
      ['zeebe', { zeebe: { name: 'zeebe' } }],
      ['camunda7', { camunda: { name: 'camunda' } }],
    ])('runs with the %s moddle and the fetched scenarios', async (engine, moddleExtensions) => {
      mockFetchFiles({ 'test.bpmn': BPMN_XML, 'test.scenarios.json': JSON.stringify(SCENARIOS) })

      await mountAndRender({ engine, scenariosFilePath: 'test.scenarios.json' })

      expect(bpmnJs.lastViewer().options).toMatchObject({
        additionalModules: expect.arrayContaining(['data-simulation']),
        moddleExtensions,
        dataSimulation: { engine, scenarios: SCENARIOS },
      })
    })

    it('runs the plain token simulation for an engine without scenarios', async () => {
      mockFetchSuccess()

      await mountAndRender({ engine: 'zeebe' })

      expect(bpmnJs.lastViewer().options.additionalModules).not.toContain('data-simulation')
      expect(bpmnJs.lastViewer().options).not.toHaveProperty('dataSimulation')
    })

    it('runs the plain token simulation for scenarios without an engine', async () => {
      const fetchMock = mockFetchSuccess()

      await mountAndRender({ scenariosFilePath: 'test.scenarios.json' })

      expect(bpmnJs.lastViewer().options).not.toHaveProperty('dataSimulation')
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('fetches the scenarios once for the inline and the fullscreen viewer', async () => {
      const fetchMock = mockFetchFiles({ 'test.bpmn': BPMN_XML, 'test.scenarios.json': JSON.stringify(SCENARIOS) })
      await mountAndRender({ engine: 'zeebe', scenariosFilePath: 'test.scenarios.json' })

      await openFullscreen()

      const scenarioFetches = fetchMock.mock.calls.filter(([url]) => url.endsWith('/test.scenarios.json'))
      expect(scenarioFetches).toHaveLength(1)
      expect(bpmnJs.viewers.map(viewer => viewer.options.dataSimulation.scenarios)).toEqual([SCENARIOS, SCENARIOS])
    })

    it('shows an error when the scenarios cannot be fetched', async () => {
      mockFetchSuccess()

      const wrapper = await mountAndRender({ engine: 'zeebe', scenariosFilePath: 'missing.scenarios.json' })

      expect(wrapper.text()).toContain('Failed to load BPMN: Failed to fetch BPMN file: 404')
      expect(bpmnJs.viewers).toHaveLength(0)
    })

    it('fetches the scenarios again on slide enter after a failed fetch', async () => {
      mockFetchSuccess()
      const wrapper = await mountAndRender({ engine: 'zeebe', scenariosFilePath: 'test.scenarios.json' })
      expect(wrapper.text()).toContain('Failed to load BPMN')

      const retriedFetch = mockFetchFiles({ 'test.bpmn': BPMN_XML, 'test.scenarios.json': JSON.stringify(SCENARIOS) })
      await slideEnterCallbacks[0]()
      await settle()

      expect(retriedFetch).toHaveBeenCalledWith(`${window.location.origin}/test.scenarios.json`)
      expect(wrapper.text()).not.toContain('Failed to load BPMN')
      expect(bpmnJs.lastViewer().options.dataSimulation.scenarios).toEqual(SCENARIOS)
    })
  })
})
