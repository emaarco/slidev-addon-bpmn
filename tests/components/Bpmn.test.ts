import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const { mockDestroy, mockImportXML, mockSaveSVG, MockBpmnViewer } = vi.hoisted(() => ({
  mockDestroy: vi.fn(),
  mockImportXML: vi.fn(),
  mockSaveSVG: vi.fn(),
  MockBpmnViewer: vi.fn(),
}))

vi.mock('bpmn-js/lib/Viewer', () => ({
  default: MockBpmnViewer,
}))

import Bpmn from '../../components/Bpmn.vue'

const SAMPLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="50" height="50"/></svg>'

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

describe('Bpmn.vue', () => {
  beforeEach(() => {
    mockDestroy.mockClear()
    mockImportXML.mockClear()
    mockSaveSVG.mockClear()
    MockBpmnViewer.mockClear()

    mockImportXML.mockResolvedValue(undefined)
    mockSaveSVG.mockResolvedValue({ svg: SAMPLE_SVG })
    MockBpmnViewer.mockImplementation(() => ({
      importXML: mockImportXML,
      saveSVG: mockSaveSVG,
      destroy: mockDestroy,
    }))

    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows loading state initially', () => {
    mockFetchSuccess()
    const wrapper = mount(Bpmn, { props: { bpmnFilePath: 'test.bpmn' } })
    expect(wrapper.text()).toContain('Loading BPMN diagram...')
  })

  it('renders SVG after successful load', async () => {
    mockFetchSuccess()
    const wrapper = mount(Bpmn, { props: { bpmnFilePath: 'test.bpmn' } })
    await flushPromises()

    expect(wrapper.text()).not.toContain('Loading BPMN diagram...')
    expect(wrapper.html()).toContain('<svg')
    expect(wrapper.html()).toContain('<rect')
  })

  it('shows error on fetch failure', async () => {
    mockFetchFailure()
    const wrapper = mount(Bpmn, { props: { bpmnFilePath: 'missing.bpmn' } })
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to load BPMN')
    expect(wrapper.html()).not.toContain('<svg')
  })

  it('strips script and foreignObject from SVG', async () => {
    const maliciousSvg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><foreignObject>bad</foreignObject><rect/></svg>'
    mockSaveSVG.mockResolvedValue({ svg: maliciousSvg })
    mockFetchSuccess()

    const wrapper = mount(Bpmn, { props: { bpmnFilePath: 'test.bpmn' } })
    await flushPromises()

    const html = wrapper.html()
    expect(html).not.toContain('<script')
    expect(html).not.toContain('foreignObject')
    expect(html).toContain('<rect')
  })

  it('applies custom width and height props to SVG', async () => {
    mockFetchSuccess()
    const wrapper = mount(Bpmn, {
      props: { bpmnFilePath: 'test.bpmn', width: '800px', height: '600px' },
    })
    await flushPromises()

    const html = wrapper.html()
    expect(html).toContain('max-width: 800px')
    expect(html).toContain('height: 600px')
  })

  it('uses default width and height', async () => {
    mockFetchSuccess()
    const wrapper = mount(Bpmn, { props: { bpmnFilePath: 'test.bpmn' } })
    await flushPromises()

    const html = wrapper.html()
    expect(html).toContain('max-width: 100%')
    expect(html).toContain('height: auto')
  })

  it('sets preserveAspectRatio on the SVG', async () => {
    mockFetchSuccess()
    const wrapper = mount(Bpmn, { props: { bpmnFilePath: 'test.bpmn' } })
    await flushPromises()

    expect(wrapper.html()).toContain('preserveAspectRatio="xMidYMid meet"')
  })

  it('cleans up off-screen container after render', async () => {
    mockFetchSuccess()
    const childCountBefore = document.body.childNodes.length

    mount(Bpmn, { props: { bpmnFilePath: 'test.bpmn' } })
    await flushPromises()

    expect(document.body.childNodes.length).toBe(childCountBefore)
  })

  it('cleans up off-screen container even on error', async () => {
    mockFetchSuccess()
    mockImportXML.mockRejectedValue(new Error('import failed'))
    const childCountBefore = document.body.childNodes.length

    mount(Bpmn, { props: { bpmnFilePath: 'test.bpmn' } })
    await flushPromises()

    expect(document.body.childNodes.length).toBe(childCountBefore)
  })

  it('calls viewer.destroy() after rendering', async () => {
    mockFetchSuccess()
    mount(Bpmn, { props: { bpmnFilePath: 'test.bpmn' } })
    await flushPromises()

    expect(mockDestroy).toHaveBeenCalledOnce()
  })
})
