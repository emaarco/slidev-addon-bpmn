import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type VueWrapper, flushPromises, mount } from '@vue/test-utils'

const { mockViewerImport, mockSaveSVG, mockViewerDestroy, MockViewer, mockModelerImport, mockModelerExport, mockModelerDestroy, MockModeler } = vi.hoisted(() => ({
  mockViewerImport: vi.fn(),
  mockSaveSVG: vi.fn(),
  mockViewerDestroy: vi.fn(),
  MockViewer: vi.fn(),
  mockModelerImport: vi.fn(),
  mockModelerExport: vi.fn(),
  mockModelerDestroy: vi.fn(),
  MockModeler: vi.fn(),
}))

vi.mock('@miragon/event-storming-renderer', () => ({ Viewer: MockViewer, Modeler: MockModeler }))
vi.mock('@slidev/client', () => ({ onSlideEnter: vi.fn() }))

import EventStormingModeler from '../../../components/event-storming/EventStormingModeler.vue'

const SAMPLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="50" height="50"/></svg>'
const FILE_SOURCE = 'title Order Checkout\nevent Order Placed [620, 300]'
const EDITED_SOURCE = 'title Order Checkout\nevent Order Placed [620, 300]\ncommand Place Order [240, 300]'

function mockFetchSuccess(source = FILE_SOURCE) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(source),
  }))
}

function findButton(label: string): HTMLButtonElement | undefined {
  return [...document.body.querySelectorAll('button')].find(button => button.textContent?.includes(label))
}

describe('EventStormingModeler.vue', () => {
  let wrapper: VueWrapper

  function mountModeler(props: { eventStormingFilePath?: string } = { eventStormingFilePath: 'checkout.storm' }) {
    wrapper = mount(EventStormingModeler, { attachTo: document.body, props })
  }

  beforeEach(() => {
    mockSaveSVG.mockResolvedValue({ svg: SAMPLE_SVG })
    MockViewer.mockImplementation(function () {
      return { importDSL: mockViewerImport, saveSVG: mockSaveSVG, destroy: mockViewerDestroy }
    })
    mockModelerExport.mockReturnValue(FILE_SOURCE)
    MockModeler.mockImplementation(function () {
      return { importDSL: mockModelerImport, exportDSL: mockModelerExport, destroy: mockModelerDestroy }
    })

    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    wrapper.unmount()
  })

  it('shows a preview of the file with an Edit button', async () => {
    mockFetchSuccess()

    mountModeler()
    await flushPromises()

    expect(mockViewerImport).toHaveBeenCalledWith(FILE_SOURCE)
    expect(wrapper.html()).toContain('<svg')
    expect(findButton('Edit')).toBeDefined()
  })

  it('uses the default size of the other modelers', async () => {
    mockFetchSuccess()

    mountModeler()
    await flushPromises()

    const style = wrapper.find('.diagram-modeler').attributes('style')
    expect(style).toContain('width: 100%')
    expect(style).toContain('height: 500px')
  })

  it('starts from a blank diagram without fetching when no file is given', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    mountModeler({})
    await flushPromises()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(mockViewerImport).toHaveBeenCalledWith('title New Board')
    expect(findButton('Edit')).toBeDefined()
  })

  it('opens the modeler with the file content', async () => {
    mockFetchSuccess()
    mountModeler()
    await flushPromises()

    findButton('Edit')!.click()
    await flushPromises()

    expect(MockModeler).toHaveBeenCalledOnce()
    expect(mockModelerImport).toHaveBeenCalledWith(FILE_SOURCE)
  })

  it('mounts the modeler into the fullscreen overlay', async () => {
    mockFetchSuccess()
    mountModeler()
    await flushPromises()

    findButton('Edit')!.click()
    await flushPromises()

    const [{ container }] = MockModeler.mock.calls[0]
    expect(container.closest('.fullscreen-overlay')).not.toBeNull()
    expect(document.body.contains(container)).toBe(true)
  })

  it('shows the edited diagram in the preview after closing and destroys the modeler', async () => {
    mockFetchSuccess()
    mountModeler()
    await flushPromises()

    findButton('Edit')!.click()
    await flushPromises()
    mockModelerExport.mockReturnValue(EDITED_SOURCE)
    findButton('Close')!.click()
    await flushPromises()

    expect(mockViewerImport).toHaveBeenLastCalledWith(EDITED_SOURCE)
    expect(mockModelerDestroy).toHaveBeenCalledOnce()
  })

  it('keeps the preview when the modeler closes without edits', async () => {
    mockFetchSuccess()
    mountModeler()
    await flushPromises()
    const rendersBeforeEditing = mockViewerImport.mock.calls.length

    findButton('Edit')!.click()
    await flushPromises()
    findButton('Close')!.click()
    await flushPromises()

    expect(mockViewerImport).toHaveBeenCalledTimes(rendersBeforeEditing)
  })
})
