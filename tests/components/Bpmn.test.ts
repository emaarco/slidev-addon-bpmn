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

const SAMPLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="50" height="50"/></svg>'

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
    const maliciousSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><script>alert(1)</script><foreignObject>bad</foreignObject><rect/></svg>'
    mockSaveSVG.mockResolvedValue({ svg: maliciousSvg })
    mockFetchSuccess()

    const wrapper = mount(Bpmn, { props: { bpmnFilePath: 'test.bpmn' } })
    await flushPromises()

    const html = wrapper.html()
    expect(html).not.toContain('<script')
    expect(html).not.toContain('foreignObject')
    expect(html).toContain('<rect')
  })

  it('applies width and height props to wrapper div', async () => {
    mockFetchSuccess()
    const wrapper = mount(Bpmn, {
      props: { bpmnFilePath: 'test.bpmn', width: '800px', height: '600px' },
    })
    await flushPromises()

    const outerDiv = wrapper.find('div').element as HTMLDivElement
    expect(outerDiv.style.width).toBe('800px')
    expect(outerDiv.style.height).toBe('600px')
  })

  it('uses default width and height on wrapper div', async () => {
    mockFetchSuccess()
    const wrapper = mount(Bpmn, { props: { bpmnFilePath: 'test.bpmn' } })
    await flushPromises()

    const outerDiv = wrapper.find('div').element as HTMLDivElement
    expect(outerDiv.style.width).toBe('100%')
    expect(outerDiv.style.height).toBe('auto')
  })

  it('expands viewBox with padding', async () => {
    mockFetchSuccess()
    const wrapper = mount(Bpmn, { props: { bpmnFilePath: 'test.bpmn' } })
    await flushPromises()

    const html = wrapper.html()
    // Original viewBox is "0 0 100 100", pad = 100 * 0.02 = 2
    // Expected: "-2 -2 104 104"
    expect(html).toContain('viewBox="-2 -2 104 104"')
  })

  it('cleans up off-screen container after render', async () => {
    mockFetchSuccess()
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
