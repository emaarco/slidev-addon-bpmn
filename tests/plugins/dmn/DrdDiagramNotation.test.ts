import { describe, it, expect, vi, beforeEach } from 'vitest'

const { MockDmnViewer, viewer } = vi.hoisted(() => ({
  MockDmnViewer: vi.fn(),
  viewer: {
    importXML: vi.fn(),
    getViews: vi.fn(),
    open: vi.fn(),
    getActiveViewer: vi.fn(),
    destroy: vi.fn(),
  },
}))

vi.mock('dmn-js/lib/Viewer', () => ({ default: MockDmnViewer }))

import { DrdDiagramNotation } from '../../../plugins/dmn/DrdDiagramNotation'

const DRD_VIEW = { type: 'drd' }
const SVG = '<svg></svg>'

function viewerConfig(): any {
  return MockDmnViewer.mock.calls[0][0]
}

describe('DrdDiagramNotation', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    viewer.importXML.mockResolvedValue(undefined)
    viewer.getViews.mockReturnValue([{ type: 'decisionTable' }, DRD_VIEW])
    viewer.open.mockResolvedValue(undefined)
    viewer.getActiveViewer.mockReturnValue({ saveSVG: vi.fn().mockResolvedValue({ svg: SVG }) })
    MockDmnViewer.mockImplementation(function () { return viewer })
  })

  it('identifies itself as DMN', () => {
    expect(new DrdDiagramNotation('12px').kind).toBe('DMN')
  })

  it('renders into the given container', async () => {
    await new DrdDiagramNotation('12px').exportSvg('<xml/>', container)

    expect(viewerConfig().container).toBe(container)
  })

  it('imports the source, opens the DRD view and returns its SVG', async () => {
    const svg = await new DrdDiagramNotation('12px').exportSvg('<definitions/>', container)

    expect(viewer.importXML).toHaveBeenCalledWith('<definitions/>')
    expect(viewer.open).toHaveBeenCalledWith(DRD_VIEW)
    expect(svg).toBe(SVG)
  })

  it('passes the font size in pixels to the DRD text renderer', async () => {
    await new DrdDiagramNotation('16px').exportSvg('<xml/>', container)

    expect(viewerConfig().drd.textRenderer.defaultStyle.fontSize).toBe(16)
  })

  it('falls back to a 12px font for an unparsable font size', async () => {
    await new DrdDiagramNotation('large').exportSvg('<xml/>', container)

    expect(viewerConfig().drd.textRenderer.defaultStyle.fontSize).toBe(12)
  })

  it('throws when the file has no DRD view', async () => {
    viewer.getViews.mockReturnValue([{ type: 'decisionTable' }])

    await expect(new DrdDiagramNotation('12px').exportSvg('<xml/>', container)).rejects.toThrow('No DRD view found')
  })

  it('destroys the viewer after exporting', async () => {
    await new DrdDiagramNotation('12px').exportSvg('<xml/>', container)

    expect(viewer.destroy).toHaveBeenCalledOnce()
  })

  it('destroys the viewer when the export fails', async () => {
    viewer.importXML.mockRejectedValue(new Error('invalid XML'))

    await expect(new DrdDiagramNotation('12px').exportSvg('<xml/>', container)).rejects.toThrow('invalid XML')
    expect(viewer.destroy).toHaveBeenCalledOnce()
  })
})
