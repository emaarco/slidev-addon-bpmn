import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils'

enableAutoUnmount(afterEach)

const { MockDmnViewer, viewer, viewerCanvas, MockDmnModeler, modeler, modelerCanvas } = vi.hoisted(() => {
  const viewerCanvas = { resized: vi.fn(), viewbox: vi.fn() }
  const modelerCanvas = { resized: vi.fn(), viewbox: vi.fn() }
  return {
    MockDmnViewer: vi.fn(),
    viewerCanvas,
    viewer: {
      importXML: vi.fn(),
      getViews: vi.fn(),
      open: vi.fn(),
      getActiveViewer: vi.fn(),
      destroy: vi.fn(),
    },
    MockDmnModeler: vi.fn(),
    modelerCanvas,
    modeler: {
      importXML: vi.fn(),
      saveXML: vi.fn(),
      getActiveViewer: vi.fn(),
      destroy: vi.fn(),
    },
  }
})

vi.mock('dmn-js/lib/Viewer', () => ({ default: MockDmnViewer }))
vi.mock('dmn-js/lib/Modeler', () => ({ default: MockDmnModeler }))
vi.mock('../../../plugins/dmn/engines/camunda', () => ({
  camundaEngine: { additionalModules: ['MODULE'], moddleExtensions: { camunda: {} } },
}))
vi.mock('@slidev/client', () => ({ onSlideEnter: vi.fn() }))

import DmnModeler from '../../../components/dmn/DmnModeler.vue'

const DRD_VIEW = { type: 'drd' }
const ORIGINAL_XML = '<definitions id="orig"></definitions>'
const CHANGED_XML = '<definitions id="changed"></definitions>'

function mockFetchSuccess(xml = ORIGINAL_XML) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(xml) })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function mockFetchFailure() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
}

function givePreviewSize(wrapper: VueWrapper) {
  const element = wrapper.find('.live-diagram-canvas').element
  Object.defineProperty(element, 'clientWidth', { value: 800, configurable: true })
  Object.defineProperty(element, 'clientHeight', { value: 500, configurable: true })
}

function mountModeler(props: Record<string, unknown> = { dmnFilePath: 'test.dmn' }) {
  const wrapper = mount(DmnModeler, { props })
  givePreviewSize(wrapper)
  return wrapper
}

// Drains the requestAnimationFrame polyfill (setTimeout 0), nextTick and the promise queue.
async function settle() {
  for (let i = 0; i < 6; i++) {
    await new Promise(resolve => setTimeout(resolve, 0))
    await flushPromises()
  }
}

function bodyButton(title: string): HTMLButtonElement | undefined {
  return [...document.body.querySelectorAll('button')].find(button => button.title === title)
}

async function clickBodyButton(title: string) {
  bodyButton(title)!.click()
  await settle()
}

async function openModeler(wrapper: VueWrapper) {
  await wrapper.find('button[title="Open modeler"]').trigger('click')
  await settle()
}

function modelerOptions(): any {
  return MockDmnModeler.mock.calls[0][0]
}

describe('DmnModeler.vue', () => {
  beforeEach(() => {
    viewer.importXML.mockResolvedValue(undefined)
    viewer.open.mockResolvedValue(undefined)
    viewer.getViews.mockReturnValue([DRD_VIEW])
    viewer.getActiveViewer.mockReturnValue({ get: (name: string) => (name === 'canvas' ? viewerCanvas : undefined) })
    MockDmnViewer.mockImplementation(function () { return viewer })

    modeler.importXML.mockResolvedValue(undefined)
    modeler.saveXML.mockResolvedValue({ xml: ORIGINAL_XML })
    modeler.getActiveViewer.mockReturnValue({ get: (name: string) => (name === 'canvas' ? modelerCanvas : undefined) })
    MockDmnModeler.mockImplementation(function () { return modeler })

    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('shows a loading state while the file is fetched', async () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
    const wrapper = mountModeler()
    await flushPromises()

    expect(wrapper.text()).toContain('Loading DMN diagram...')
    expect(wrapper.find('button[title="Open modeler"]').exists()).toBe(false)
  })

  it('renders the DRD preview after a successful load', async () => {
    mockFetchSuccess()
    const wrapper = mountModeler()
    await settle()

    expect(MockDmnViewer).toHaveBeenCalledWith({ container: wrapper.find('.live-diagram-canvas').element })
    expect(viewer.importXML).toHaveBeenCalledWith(ORIGINAL_XML)
    expect(viewer.open).toHaveBeenCalledWith(DRD_VIEW)
    expect(wrapper.find('button[title="Open modeler"]').exists()).toBe(true)
  })

  it('keeps a small DRD at native size instead of enlarging it to fill the card', async () => {
    viewerCanvas.viewbox.mockImplementation((box?: unknown) => box ? undefined : {
      inner: { x: 0, y: 0, width: 100, height: 100 },
      outer: { width: 1000, height: 1000 },
    })
    mockFetchSuccess()
    mountModeler()
    await settle()

    expect(viewerCanvas.viewbox).toHaveBeenLastCalledWith({ x: -450, y: -450, width: 1000, height: 1000 })
  })

  it('sizes its box with the width and height props', () => {
    mockFetchSuccess()
    const wrapper = mountModeler({ dmnFilePath: 'test.dmn', width: '640px', height: '320px' })

    expect((wrapper.element as HTMLElement).style.width).toBe('640px')
    expect((wrapper.element as HTMLElement).style.height).toBe('320px')
  })

  it('shows an error on fetch failure', async () => {
    mockFetchFailure()
    const wrapper = mountModeler()
    await settle()

    expect(wrapper.text()).toContain('Failed to load DMN')
    expect(wrapper.find('button[title="Open modeler"]').exists()).toBe(false)
  })

  it('previews a blank diagram when no dmnFilePath is given', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    mountModeler({})
    await settle()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(viewer.importXML).toHaveBeenCalledWith(expect.stringContaining('New Decision Model'))
  })

  it('opens the fullscreen modeler with the loaded XML when Edit is clicked', async () => {
    mockFetchSuccess()
    const wrapper = mountModeler()
    await settle()

    await openModeler(wrapper)

    const canvas = document.body.querySelector('.diagram-modeler-canvas')
    expect(canvas).not.toBeNull()
    expect(modelerOptions()).toEqual({ container: canvas })
    expect(modeler.importXML).toHaveBeenCalledWith(ORIGINAL_XML)
    expect(bodyButton('Show properties panel') ?? bodyButton('Hide properties panel')).toBeUndefined()
  })

  it('nests the Camunda properties panel config under the drd key', async () => {
    mockFetchSuccess()
    const wrapper = mountModeler({ dmnFilePath: 'test.dmn', engine: 'camunda' })
    await settle()

    await openModeler(wrapper)

    const panel = document.body.querySelector('.diagram-modeler-properties-panel')
    expect(panel).not.toBeNull()
    expect(modelerOptions().drd).toEqual({ additionalModules: ['MODULE'], propertiesPanel: { parent: panel } })
    expect(modelerOptions().moddleExtensions).toEqual({ camunda: {} })
  })

  it('toggles the properties panel and tells the modeler canvas about the resize', async () => {
    mockFetchSuccess()
    const wrapper = mountModeler({ dmnFilePath: 'test.dmn', engine: 'camunda' })
    await settle()
    await openModeler(wrapper)
    const panel = document.body.querySelector<HTMLElement>('.diagram-modeler-properties-panel')!
    modelerCanvas.resized.mockClear()

    await clickBodyButton('Hide properties panel')

    expect(panel.style.display).toBe('none')
    expect(modelerCanvas.resized).toHaveBeenCalledOnce()

    await clickBodyButton('Show properties panel')

    expect(panel.style.display).toBe('')
  })

  it('saves and re-renders the preview when the model changed on close', async () => {
    mockFetchSuccess()
    const wrapper = mountModeler()
    await settle()
    await openModeler(wrapper)
    modeler.saveXML.mockResolvedValue({ xml: CHANGED_XML })

    await clickBodyButton('Close modeler')

    expect(modeler.saveXML).toHaveBeenCalledWith({ format: true })
    expect(modeler.destroy).toHaveBeenCalledOnce()
    expect(document.body.querySelector('.diagram-modeler-canvas')).toBeNull()
    expect(MockDmnViewer).toHaveBeenCalledTimes(2)
    expect(viewer.importXML).toHaveBeenLastCalledWith(CHANGED_XML)
  })

  it('opens the modeler with the edited XML the next time', async () => {
    mockFetchSuccess()
    const wrapper = mountModeler()
    await settle()
    await openModeler(wrapper)
    modeler.saveXML.mockResolvedValue({ xml: CHANGED_XML })
    await clickBodyButton('Close modeler')

    await openModeler(wrapper)

    expect(modeler.importXML).toHaveBeenLastCalledWith(CHANGED_XML)
  })

  it('does not re-render the preview when nothing changed on close', async () => {
    mockFetchSuccess()
    const wrapper = mountModeler()
    await settle()
    await openModeler(wrapper)

    await clickBodyButton('Close modeler')

    expect(modeler.destroy).toHaveBeenCalledOnce()
    expect(MockDmnViewer).toHaveBeenCalledOnce()
  })

  it('keeps the preview when saving the edited model fails', async () => {
    mockFetchSuccess()
    const wrapper = mountModeler()
    await settle()
    await openModeler(wrapper)
    modeler.saveXML.mockRejectedValue(new Error('save failed'))

    await clickBodyButton('Close modeler')

    expect(modeler.destroy).toHaveBeenCalledOnce()
    expect(MockDmnViewer).toHaveBeenCalledOnce()
    expect(document.body.querySelector('.diagram-modeler-canvas')).toBeNull()
  })

  it('destroys the open modeler and the preview viewer on unmount', async () => {
    mockFetchSuccess()
    const wrapper = mountModeler()
    await settle()
    await openModeler(wrapper)

    wrapper.unmount()

    expect(modeler.destroy).toHaveBeenCalledOnce()
    expect(viewer.destroy).toHaveBeenCalledOnce()
  })
})
