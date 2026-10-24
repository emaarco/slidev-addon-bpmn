import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils'

enableAutoUnmount(afterEach)

const { MockDmnViewer, viewer, slideEnterCallbacks } = vi.hoisted(() => ({
  MockDmnViewer: vi.fn(),
  viewer: {
    importXML: vi.fn(),
    getViews: vi.fn(),
    open: vi.fn(),
    destroy: vi.fn(),
  },
  slideEnterCallbacks: [] as Array<() => Promise<void> | void>,
}))

vi.mock('dmn-js/lib/Viewer', () => ({ default: MockDmnViewer }))
vi.mock('@slidev/client', () => ({
  onSlideEnter: (callback: () => void) => { slideEnterCallbacks.push(callback) },
}))

import DmnTable from '../../../components/dmn/DmnTable.vue'

const TABLE_VIEW = { type: 'decisionTable', element: { id: 'decision1' } }
const TABLE_VIEW_2 = { type: 'decisionTable', element: { id: 'decision2' } }

function mockFetchSuccess(xml = '<definitions></definitions>') {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(xml) })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function mockFetchFailure() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
}

function tableWrapper(wrapper: VueWrapper) {
  return wrapper.find('div.dmn-table-wrapper')
}

function giveTableSize(wrapper: VueWrapper) {
  const element = tableWrapper(wrapper).element
  Object.defineProperty(element, 'clientWidth', { value: 800, configurable: true })
  Object.defineProperty(element, 'clientHeight', { value: 500, configurable: true })
}

function mountTable(props: Record<string, unknown> = {}) {
  const wrapper = mount(DmnTable, { props: { dmnFilePath: 'test.dmn', ...props } })
  giveTableSize(wrapper)
  return wrapper
}

// Drains the requestAnimationFrame polyfill (setTimeout 0) and the promise queue.
async function settle() {
  for (let i = 0; i < 4; i++) {
    await new Promise(resolve => setTimeout(resolve, 0))
    await flushPromises()
  }
}

async function enterSlide() {
  await slideEnterCallbacks.at(-1)!()
  await settle()
}

describe('DmnTable.vue', () => {
  beforeEach(() => {
    slideEnterCallbacks.length = 0
    viewer.importXML.mockResolvedValue(undefined)
    viewer.open.mockResolvedValue(undefined)
    viewer.getViews.mockReturnValue([TABLE_VIEW])
    MockDmnViewer.mockImplementation(function () { return viewer })
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('shows a loading state while the file is fetched', async () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
    const wrapper = mountTable()
    await settle()

    expect(wrapper.text()).toContain('Loading DMN diagram...')
  })

  it('defaults the box height to 500px when height is auto', () => {
    mockFetchSuccess()
    const wrapper = mountTable()

    expect((wrapper.element as HTMLElement).style.height).toBe('500px')
  })

  it('uses the given height for the box', () => {
    mockFetchSuccess()
    const wrapper = mountTable({ height: '700px', width: '600px' })

    expect((wrapper.element as HTMLElement).style.height).toBe('700px')
    expect((wrapper.element as HTMLElement).style.width).toBe('600px')
  })

  it('renders the decision table into the table wrapper', async () => {
    mockFetchSuccess('<definitions id="table"></definitions>')
    const wrapper = mountTable()
    await settle()

    expect(MockDmnViewer).toHaveBeenCalledWith({ container: tableWrapper(wrapper).element })
    expect(viewer.importXML).toHaveBeenCalledWith('<definitions id="table"></definitions>')
    expect(viewer.open).toHaveBeenCalledWith(TABLE_VIEW)
    expect(wrapper.text()).not.toContain('Loading')
  })

  it('waits until the slide gives the table a size', async () => {
    mockFetchSuccess()
    const wrapper = mount(DmnTable, { props: { dmnFilePath: 'test.dmn' } })
    await settle()
    expect(MockDmnViewer).not.toHaveBeenCalled()

    giveTableSize(wrapper)
    await settle()

    expect(viewer.open).toHaveBeenCalledWith(TABLE_VIEW)
  })

  it('does not render again when the slide is entered after mounting', async () => {
    const fetchMock = mockFetchSuccess()
    mountTable()
    await settle()

    await enterSlide()

    expect(MockDmnViewer).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('shows an error when the file cannot be fetched', async () => {
    mockFetchFailure()
    const wrapper = mountTable()
    await settle()

    expect(wrapper.text()).toContain('Failed to load DMN')
  })

  it('retries after an error when the slide is entered again', async () => {
    mockFetchFailure()
    const wrapper = mountTable()
    await settle()
    expect(wrapper.text()).toContain('Failed to load DMN')

    mockFetchSuccess()
    await enterSlide()

    expect(viewer.importXML).toHaveBeenCalled()
    expect(wrapper.text()).not.toContain('Failed to load DMN')
  })

  it('shows an error when the file has no decision table', async () => {
    viewer.getViews.mockReturnValue([{ type: 'drd' }])
    mockFetchSuccess()
    const wrapper = mountTable()
    await settle()

    expect(wrapper.text()).toContain('No decision table view found')
  })

  it('opens the decision table selected by decisionId', async () => {
    viewer.getViews.mockReturnValue([TABLE_VIEW, TABLE_VIEW_2])
    mockFetchSuccess()
    mountTable({ decisionId: 'decision2' })
    await settle()

    expect(viewer.open).toHaveBeenCalledWith(TABLE_VIEW_2)
  })

  it('opens the first decision table without a decisionId', async () => {
    viewer.getViews.mockReturnValue([TABLE_VIEW, TABLE_VIEW_2])
    mockFetchSuccess()
    mountTable()
    await settle()

    expect(viewer.open).toHaveBeenCalledWith(TABLE_VIEW)
  })

  it('hides the "View DRD" button and annotations by default', () => {
    mockFetchSuccess()
    const classes = tableWrapper(mountTable()).classes()

    expect(classes).toContain('hide-drd-button')
    expect(classes).toContain('hide-annotations')
  })

  it('keeps the "View DRD" button when showDrdButton is true', () => {
    mockFetchSuccess()

    expect(tableWrapper(mountTable({ showDrdButton: true })).classes()).not.toContain('hide-drd-button')
  })

  it('keeps the annotations when showAnnotations is true', () => {
    mockFetchSuccess()

    expect(tableWrapper(mountTable({ showAnnotations: true })).classes()).not.toContain('hide-annotations')
  })

  it('exposes the font size as a CSS variable on the table wrapper', () => {
    mockFetchSuccess()
    const element = tableWrapper(mountTable({ fontSize: '16px' })).element as HTMLElement

    expect(element.style.getPropertyValue('--dmn-table-font-size')).toBe('16px')
  })

  it('destroys the viewer on unmount', async () => {
    mockFetchSuccess()
    const wrapper = mountTable()
    await settle()
    expect(viewer.destroy).not.toHaveBeenCalled()

    wrapper.unmount()

    expect(viewer.destroy).toHaveBeenCalledOnce()
  })
})
