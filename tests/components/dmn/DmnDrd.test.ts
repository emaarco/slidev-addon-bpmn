import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'

enableAutoUnmount(afterEach)

const { MockDmnViewer, viewer, saveSVG } = vi.hoisted(() => {
  const saveSVG = vi.fn()
  return {
    MockDmnViewer: vi.fn(),
    saveSVG,
    viewer: {
      importXML: vi.fn(),
      getViews: vi.fn(),
      open: vi.fn(),
      getActiveViewer: vi.fn(() => ({ saveSVG })),
      destroy: vi.fn(),
    },
  }
})

vi.mock('dmn-js/lib/Viewer', () => ({ default: MockDmnViewer }))

import DmnDrd from '../../../components/dmn/DmnDrd.vue'

const SAMPLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><rect width="100" height="50"/></svg>'

function mockFetchSuccess(xml = '<definitions></definitions>') {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(xml) }))
}

function mockFetchFailure() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
}

describe('DmnDrd.vue', () => {
  beforeEach(() => {
    viewer.importXML.mockResolvedValue(undefined)
    viewer.open.mockResolvedValue(undefined)
    viewer.getViews.mockReturnValue([{ type: 'drd' }])
    saveSVG.mockResolvedValue({ svg: SAMPLE_SVG })
    MockDmnViewer.mockImplementation(function () { return viewer })
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('shows a loading state while the file is fetched', async () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
    const wrapper = mount(DmnDrd, { props: { dmnFilePath: 'test.dmn' } })
    await flushPromises()

    expect(wrapper.text()).toContain('Loading DMN diagram...')
  })

  it('renders the exported DRD as an inline SVG', async () => {
    mockFetchSuccess('<definitions id="drd"></definitions>')
    const wrapper = mount(DmnDrd, { props: { dmnFilePath: 'test.dmn' } })
    await flushPromises()

    expect(viewer.importXML).toHaveBeenCalledWith('<definitions id="drd"></definitions>')
    expect(viewer.open).toHaveBeenCalledWith({ type: 'drd' })
    expect(wrapper.text()).not.toContain('Loading DMN diagram...')
    expect(wrapper.find('svg rect').exists()).toBe(true)
    expect(wrapper.find('svg').attributes('preserveAspectRatio')).toBe('xMidYMid meet')
  })

  it('shows an error when the file cannot be fetched', async () => {
    mockFetchFailure()
    const wrapper = mount(DmnDrd, { props: { dmnFilePath: 'missing.dmn' } })
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to load DMN')
    expect(wrapper.find('svg').exists()).toBe(false)
  })

  it('shows an error when the file has no DRD view', async () => {
    viewer.getViews.mockReturnValue([{ type: 'decisionTable' }])
    mockFetchSuccess()
    const wrapper = mount(DmnDrd, { props: { dmnFilePath: 'test.dmn' } })
    await flushPromises()

    expect(wrapper.text()).toContain('No DRD view found')
  })

  it('sizes its box with the width and height props', async () => {
    mockFetchSuccess()
    const wrapper = mount(DmnDrd, { props: { dmnFilePath: 'test.dmn', width: '800px', height: '600px' } })
    await flushPromises()

    const box = wrapper.find('.static-diagram').element as HTMLElement
    expect(box.style.width).toBe('800px')
    expect(box.style.height).toBe('600px')
  })

  it('defaults to full width and automatic height', async () => {
    mockFetchSuccess()
    const wrapper = mount(DmnDrd, { props: { dmnFilePath: 'test.dmn' } })
    await flushPromises()

    const box = wrapper.find('.static-diagram').element as HTMLElement
    expect(box.style.width).toBe('100%')
    expect(box.style.height).toBe('auto')
  })

  it('passes the fontSize prop to the DRD text renderer', async () => {
    mockFetchSuccess()
    mount(DmnDrd, { props: { dmnFilePath: 'test.dmn', fontSize: '18px' } })
    await flushPromises()

    expect(MockDmnViewer.mock.calls[0][0].drd.textRenderer.defaultStyle.fontSize).toBe(18)
  })

  it('removes the off-screen container after rendering', async () => {
    mockFetchSuccess()
    const childCountBefore = document.body.childNodes.length
    mount(DmnDrd, { props: { dmnFilePath: 'test.dmn' } })
    await flushPromises()

    expect(document.body.childNodes.length).toBe(childCountBefore)
  })

  it('destroys the viewer after rendering', async () => {
    mockFetchSuccess()
    mount(DmnDrd, { props: { dmnFilePath: 'test.dmn' } })
    await flushPromises()

    expect(viewer.destroy).toHaveBeenCalledOnce()
  })

  it('destroys the viewer when the SVG export fails', async () => {
    saveSVG.mockRejectedValue(new Error('SVG export failed'))
    mockFetchSuccess()
    const wrapper = mount(DmnDrd, { props: { dmnFilePath: 'test.dmn' } })
    await flushPromises()

    expect(viewer.destroy).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('SVG export failed')
  })
})
