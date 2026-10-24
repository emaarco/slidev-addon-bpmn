import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'

vi.mock('bpmn-js/lib/Viewer', async () => ({ default: (await import('../../src/bpmn/fakeBpmnJs')).FakeBpmnViewer }))
vi.mock('bpmn-js/lib/Modeler', async () => ({ default: (await import('../../src/bpmn/fakeBpmnJs')).FakeBpmnModeler }))
vi.mock('bpmn-js-token-simulation', () => ({ default: 'token-simulation-modeler' }))
vi.mock('bpmn-js-token-simulation/lib/viewer', () => ({ default: 'token-simulation-viewer' }))
vi.mock('../../../src/bpmn/engines/zeebe', () => ({
  zeebeEngine: { additionalModules: ['zeebe-module'], moddleExtensions: { zeebe: {} }, supportsTransactionBoundaries: false },
}))
vi.mock('../../../src/bpmn/engines/camunda7', () => ({
  camunda7Engine: { additionalModules: ['camunda7-module'], moddleExtensions: { camunda: {} }, supportsTransactionBoundaries: true },
}))

const { slideEnterCallbacks } = vi.hoisted(() => ({ slideEnterCallbacks: [] as Array<() => Promise<void>> }))

vi.mock('@slidev/client', () => ({
  onSlideEnter: (callback: () => Promise<void>) => slideEnterCallbacks.push(callback),
}))

import BpmnModeler from '../../../components/bpmn/BpmnModeler.vue'
import { bpmnJs, SMALL_DIAGRAM } from '../../src/bpmn/fakeBpmnJs'

enableAutoUnmount(afterEach)

const BPMN_XML = '<definitions id="newsletter"></definitions>'
const EDITED_XML = '<definitions id="newsletter">edited</definitions>'

function mockFetch(response: { ok: boolean; status?: number; text?: () => Promise<string> }) {
  const fetchMock = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function mockFetchSuccess() {
  return mockFetch({ ok: true, text: () => Promise.resolve(BPMN_XML) })
}

function mountModeler(props: Record<string, unknown> = { bpmnFilePath: 'test.bpmn' }) {
  const wrapper = mount(BpmnModeler, { attachTo: document.body, props })
  const canvas = wrapper.find('.live-diagram-canvas').element
  Object.defineProperty(canvas, 'clientWidth', { value: 800, configurable: true })
  Object.defineProperty(canvas, 'clientHeight', { value: 500, configurable: true })
  return wrapper
}

async function settle() {
  for (let i = 0; i < 3; i++) {
    await flushPromises()
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

function button(title: string): HTMLButtonElement | null {
  return document.body.querySelector(`button[title="${title}"]`)
}

async function click(title: string) {
  button(title)!.click()
  await settle()
}

async function mountAndRender(props?: Record<string, unknown>) {
  const wrapper = mountModeler(props)
  await settle()
  return wrapper
}

function overlay(): Element | null {
  return document.body.querySelector('.fullscreen-overlay')
}

describe('BpmnModeler.vue', () => {
  beforeEach(() => {
    bpmnJs.reset()
    bpmnJs.savedXml = EDITED_XML
    slideEnterCallbacks.length = 0
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('preview', () => {
    it('shows the loading state and no Edit button until the diagram is rendered', () => {
      mockFetchSuccess()

      const wrapper = mountModeler()

      expect(wrapper.text()).toContain('Loading BPMN diagram...')
      expect(button('Open modeler')).toBeNull()
    })

    it('defaults to full width and 500px height', () => {
      mockFetchSuccess()

      const root = mountModeler().element as HTMLDivElement

      expect(root.style.width).toBe('100%')
      expect(root.style.height).toBe('500px')
    })

    it('applies the width and height props', () => {
      mockFetchSuccess()

      const root = mountModeler({ bpmnFilePath: 'test.bpmn', width: '80%', height: '700px' }).element as HTMLDivElement

      expect(root.style.width).toBe('80%')
      expect(root.style.height).toBe('700px')
    })

    it('renders the fetched file in a fitted viewer and offers editing', async () => {
      const fetchMock = mockFetchSuccess()

      const wrapper = await mountAndRender()

      expect(fetchMock).toHaveBeenCalledWith(`${window.location.origin}/test.bpmn`)
      expect(bpmnJs.viewers).toHaveLength(1)
      expect(bpmnJs.lastViewer().options.container).toBe(wrapper.find('.live-diagram-canvas').element)
      expect(bpmnJs.lastViewer().importXML).toHaveBeenCalledWith(BPMN_XML)
      expect(bpmnJs.lastViewer().fittedViewbox()).toBeDefined()
      expect(wrapper.text()).not.toContain('Loading BPMN diagram...')
      expect(button('Open modeler')?.textContent).toContain('Edit')
    })

    it('renders a blank diagram without fetching when no file path is given', async () => {
      const fetchMock = mockFetchSuccess()

      await mountAndRender({})

      expect(fetchMock).not.toHaveBeenCalled()
      expect(bpmnJs.lastViewer().importXML).toHaveBeenCalledWith(expect.stringContaining('<bpmn:startEvent id="StartEvent_1" />'))
      expect(button('Open modeler')).not.toBeNull()
    })

    it('shows an error and no Edit button when the file cannot be fetched', async () => {
      mockFetch({ ok: false, status: 404 })

      const wrapper = await mountAndRender({ bpmnFilePath: 'missing.bpmn' })

      expect(wrapper.text()).toContain('Failed to load BPMN: Failed to fetch BPMN file: 404')
      expect(button('Open modeler')).toBeNull()
    })

    it('does not render again when the slide is entered after the first render', async () => {
      mockFetchSuccess()
      await mountAndRender()

      await slideEnterCallbacks[0]()
      await settle()

      expect(bpmnJs.viewers).toHaveLength(1)
    })

    it('loads the token simulation into the preview with tokenSimulation', async () => {
      mockFetchSuccess()

      await mountAndRender({ bpmnFilePath: 'test.bpmn', tokenSimulation: true })

      expect(bpmnJs.lastViewer().options.additionalModules).toContain('token-simulation-viewer')
    })

    it('renders a plain preview without tokenSimulation', async () => {
      mockFetchSuccess()

      await mountAndRender()

      expect(bpmnJs.lastViewer().options).not.toHaveProperty('additionalModules')
    })

    it('caps the preview fit at maxScale', async () => {
      bpmnJs.viewbox = SMALL_DIAGRAM
      mockFetchSuccess()

      await mountAndRender({ bpmnFilePath: 'test.bpmn', maxScale: 1 })

      expect(bpmnJs.lastViewer().fittedViewbox()).toMatchObject({ width: 800, height: 500 })
    })

    it('ignores an invalid maxScale', async () => {
      bpmnJs.viewbox = SMALL_DIAGRAM
      mockFetchSuccess()

      await mountAndRender({ bpmnFilePath: 'test.bpmn', maxScale: 0 })

      expect(bpmnJs.lastViewer().fittedViewbox()).toMatchObject({ width: 400, height: 250 })
    })

    it('destroys the preview viewer on unmount', async () => {
      mockFetchSuccess()
      const wrapper = await mountAndRender()

      wrapper.unmount()

      expect(bpmnJs.lastViewer().destroy).toHaveBeenCalledOnce()
    })
  })

  describe('fullscreen modeler', () => {
    it('opens a modeler on the rendered diagram when Edit is clicked', async () => {
      mockFetchSuccess()
      await mountAndRender()

      await click('Open modeler')

      expect(overlay()).not.toBeNull()
      expect(bpmnJs.modelers).toHaveLength(1)
      expect(bpmnJs.lastModeler().options.container).toBe(document.body.querySelector('.fullscreen-overlay .diagram-modeler-canvas'))
      expect(bpmnJs.lastModeler().importXML).toHaveBeenCalledWith(BPMN_XML)
    })

    it('re-renders the preview with the edited diagram on Close', async () => {
      mockFetchSuccess()
      await mountAndRender()
      await click('Open modeler')
      const modeler = bpmnJs.lastModeler()

      modeler.fire('commandStack.changed')
      await click('Close modeler')

      expect(modeler.saveXML).toHaveBeenCalled()
      expect(modeler.destroy).toHaveBeenCalledOnce()
      expect(overlay()).toBeNull()
      expect(bpmnJs.viewers).toHaveLength(2)
      expect(bpmnJs.viewers[0].destroy).toHaveBeenCalledOnce()
      expect(bpmnJs.lastViewer().importXML).toHaveBeenCalledWith(EDITED_XML)
    })

    it('opens the edited diagram the next time Edit is clicked', async () => {
      mockFetchSuccess()
      await mountAndRender()
      await click('Open modeler')
      bpmnJs.lastModeler().fire('commandStack.changed')
      await click('Close modeler')

      await click('Open modeler')

      expect(bpmnJs.lastModeler().importXML).toHaveBeenCalledWith(EDITED_XML)
    })

    it('keeps the preview when the modeler is closed without edits', async () => {
      mockFetchSuccess()
      await mountAndRender()
      await click('Open modeler')
      const modeler = bpmnJs.lastModeler()

      await click('Close modeler')

      expect(modeler.saveXML).not.toHaveBeenCalled()
      expect(modeler.destroy).toHaveBeenCalledOnce()
      expect(overlay()).toBeNull()
      expect(bpmnJs.viewers).toHaveLength(1)
      expect(bpmnJs.lastViewer().destroy).not.toHaveBeenCalled()
    })

    it('destroys the open modeler and the preview on unmount', async () => {
      mockFetchSuccess()
      const wrapper = await mountAndRender()
      await click('Open modeler')

      wrapper.unmount()

      expect(bpmnJs.lastModeler().destroy).toHaveBeenCalledOnce()
      expect(bpmnJs.lastViewer().destroy).toHaveBeenCalledOnce()
      expect(overlay()).toBeNull()
    })

    it('has no properties panel without an engine', async () => {
      mockFetchSuccess()
      await mountAndRender()

      await click('Open modeler')

      expect(document.body.querySelector('.diagram-modeler-properties-panel')).toBeNull()
      expect(button('Hide properties panel')).toBeNull()
      expect(bpmnJs.lastModeler().options).not.toHaveProperty('propertiesPanel')
    })

    it.each(['zeebe', 'camunda7'])('mounts the properties panel beside the canvas for engine="%s"', async (engine) => {
      mockFetchSuccess()
      await mountAndRender({ bpmnFilePath: 'test.bpmn', engine })

      await click('Open modeler')

      const panel = document.body.querySelector('.fullscreen-overlay .diagram-modeler-properties-panel')
      expect(panel).not.toBeNull()
      expect(bpmnJs.lastModeler().options.propertiesPanel).toEqual({ parent: panel })
      expect(bpmnJs.lastModeler().options.additionalModules).toEqual([`${engine}-module`])
    })

    it('hides the properties panel and resizes the canvas when the panel is toggled', async () => {
      mockFetchSuccess()
      await mountAndRender({ bpmnFilePath: 'test.bpmn', engine: 'zeebe' })
      await click('Open modeler')
      const { canvas } = bpmnJs.lastModeler()
      canvas.resized.mockClear()

      await click('Hide properties panel')

      const panel = document.body.querySelector<HTMLElement>('.diagram-modeler-properties-panel')!
      expect(panel.style.display).toBe('none')
      expect(button('Show properties panel')).not.toBeNull()
      expect(canvas.resized).toHaveBeenCalledOnce()
    })

    it('loads the token simulation into the modeler with tokenSimulation', async () => {
      mockFetchSuccess()
      await mountAndRender({ bpmnFilePath: 'test.bpmn', tokenSimulation: true })

      await click('Open modeler')

      expect(bpmnJs.lastModeler().options.additionalModules).toEqual(['token-simulation-modeler'])
    })

    it('shows transaction boundaries with transactionBoundaries and engine="camunda7"', async () => {
      mockFetchSuccess()
      await mountAndRender({ bpmnFilePath: 'test.bpmn', engine: 'camunda7', transactionBoundaries: true })

      await click('Open modeler')

      expect(bpmnJs.lastModeler().transactionBoundaries.show).toHaveBeenCalledOnce()
    })

    it('does not show transaction boundaries by default', async () => {
      mockFetchSuccess()
      await mountAndRender({ bpmnFilePath: 'test.bpmn', engine: 'camunda7' })

      await click('Open modeler')

      expect(bpmnJs.lastModeler().transactionBoundaries.show).not.toHaveBeenCalled()
    })

    it('warns instead of showing transaction boundaries without engine="camunda7"', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockFetchSuccess()
      await mountAndRender({ bpmnFilePath: 'test.bpmn', engine: 'zeebe', transactionBoundaries: true })

      await click('Open modeler')

      expect(bpmnJs.lastModeler().transactionBoundaries.show).not.toHaveBeenCalled()
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('transactionBoundaries requires engine="camunda7"'))
    })

    it('caps the modeler fit at maxScale', async () => {
      bpmnJs.viewbox = SMALL_DIAGRAM
      mockFetchSuccess()
      await mountAndRender({ bpmnFilePath: 'test.bpmn', maxScale: 1 })

      await click('Open modeler')

      expect(bpmnJs.lastModeler().fittedViewbox()).toMatchObject({ width: 800, height: 500 })
    })
  })
})
