import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'

const { viewer, MockBpmnViewer } = vi.hoisted(() => {
  const viewer = { importXML: vi.fn(), saveSVG: vi.fn(), destroy: vi.fn() }
  return { viewer, MockBpmnViewer: vi.fn(function () { return viewer }) }
})

vi.mock('bpmn-js/lib/Viewer', () => ({ default: MockBpmnViewer }))

import Bpmn from '../../../components/bpmn/Bpmn.vue'

enableAutoUnmount(afterEach)

const BPMN_XML = '<definitions id="newsletter"></definitions>'
const SAMPLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="50" height="50"/></svg>'

function mockFetch(response: { ok: boolean; status?: number; text?: () => Promise<string> }) {
  const fetchMock = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function mockFetchSuccess() {
  return mockFetch({ ok: true, text: () => Promise.resolve(BPMN_XML) })
}

describe('Bpmn.vue', () => {
  beforeEach(() => {
    viewer.importXML.mockResolvedValue({ warnings: [] })
    viewer.saveSVG.mockResolvedValue({ svg: SAMPLE_SVG })
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('shows the loading state until the diagram is rendered', () => {
    mockFetchSuccess()

    const wrapper = mount(Bpmn, { props: { bpmnFilePath: 'test.bpmn' } })

    expect(wrapper.text()).toContain('Loading BPMN diagram...')
  })

  it('fetches the file relative to the deck and renders it as an inline SVG', async () => {
    const fetchMock = mockFetchSuccess()

    const wrapper = mount(Bpmn, { props: { bpmnFilePath: 'test.bpmn' } })
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith(`${window.location.origin}/test.bpmn`)
    expect(viewer.importXML).toHaveBeenCalledWith(BPMN_XML)
    expect(wrapper.text()).not.toContain('Loading BPMN diagram...')
    expect(wrapper.find('svg rect').exists()).toBe(true)
  })

  it('renders off-screen and destroys the viewer afterwards', async () => {
    mockFetchSuccess()

    mount(Bpmn, { props: { bpmnFilePath: 'test.bpmn' } })
    await flushPromises()

    const { container } = (MockBpmnViewer.mock.calls[0] as unknown as [{ container: HTMLElement }])[0]
    expect(container.isConnected).toBe(false)
    expect(viewer.destroy).toHaveBeenCalledOnce()
  })

  it('shows an error when the file cannot be fetched', async () => {
    mockFetch({ ok: false, status: 404 })

    const wrapper = mount(Bpmn, { props: { bpmnFilePath: 'missing.bpmn' } })
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to load BPMN: Failed to fetch BPMN file: 404')
    expect(wrapper.find('svg').exists()).toBe(false)
  })

  it('shows an error when the diagram cannot be imported', async () => {
    mockFetchSuccess()
    viewer.importXML.mockRejectedValue(new Error('unparsable content'))

    const wrapper = mount(Bpmn, { props: { bpmnFilePath: 'test.bpmn' } })
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to load BPMN: unparsable content')
    expect(viewer.destroy).toHaveBeenCalledOnce()
  })

  it('applies the width and height props', async () => {
    mockFetchSuccess()

    const wrapper = mount(Bpmn, { props: { bpmnFilePath: 'test.bpmn', width: '800px', height: '600px' } })
    await flushPromises()

    const root = wrapper.element as HTMLDivElement
    expect(root.style.width).toBe('800px')
    expect(root.style.height).toBe('600px')
  })

  it('defaults to full width and automatic height', async () => {
    mockFetchSuccess()

    const wrapper = mount(Bpmn, { props: { bpmnFilePath: 'test.bpmn' } })
    await flushPromises()

    const root = wrapper.element as HTMLDivElement
    expect(root.style.width).toBe('100%')
    expect(root.style.height).toBe('auto')
  })
})
