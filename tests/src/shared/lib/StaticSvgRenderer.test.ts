import { describe, expect, it, vi } from 'vitest'

import type { StaticNotation } from '../../../../src/shared/lib/notation'
import { StaticSvgRenderer } from '../../../../src/shared/lib/StaticSvgRenderer'

const SAMPLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="50" height="50"/></svg>'

function notationExporting(exportSvg: (container: HTMLElement) => Promise<string>): StaticNotation {
  return { kind: 'Test', rendering: 'static', exportSvg: (_source, container) => exportSvg(container) }
}

function renderStaticSvg(exportSvg: (container: HTMLElement) => Promise<string>): Promise<string> {
  return new StaticSvgRenderer().render(notationExporting(exportSvg), 'diagram source')
}

describe('StaticSvgRenderer', () => {
  it('hands the notation the source to export', async () => {
    const exportSvg = vi.fn().mockResolvedValue(SAMPLE_SVG)

    await new StaticSvgRenderer().render({ kind: 'Test', rendering: 'static', exportSvg }, 'title Order Checkout')

    expect(exportSvg).toHaveBeenCalledWith('title Order Checkout', expect.any(HTMLElement))
  })

  it('hands the exporter an off-screen container that is attached to the document', async () => {
    let containerDuringExport: HTMLElement | undefined

    await renderStaticSvg(async (container) => {
      containerDuringExport = container
      expect(document.body.contains(container)).toBe(true)
      return SAMPLE_SVG
    })

    expect(containerDuringExport!.style.left).toBe('-9999px')
    expect(containerDuringExport!.style.width).toBe('1920px')
    expect(containerDuringExport!.style.height).toBe('1080px')
  })

  it('removes the off-screen container after a successful export', async () => {
    const childCountBefore = document.body.childNodes.length

    await renderStaticSvg(async () => SAMPLE_SVG)

    expect(document.body.childNodes.length).toBe(childCountBefore)
  })

  it('removes the off-screen container when the export fails', async () => {
    const childCountBefore = document.body.childNodes.length

    await expect(renderStaticSvg(async () => {
      throw new Error('import failed')
    })).rejects.toThrow('import failed')

    expect(document.body.childNodes.length).toBe(childCountBefore)
  })

  it('tolerates an exporter that already detached the container', async () => {
    const svg = await renderStaticSvg(async (container) => {
      container.remove()
      return SAMPLE_SVG
    })

    expect(svg).toContain('<rect')
  })

  it('strips script and foreignObject elements', async () => {
    const svg = await renderStaticSvg(async () => (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
      + '<script>alert(1)</script><foreignObject><div>html</div></foreignObject><rect width="50" height="50"/>'
      + '</svg>'
    ))

    expect(svg).not.toContain('<script')
    expect(svg).not.toContain('foreignObject')
    expect(svg).toContain('<rect')
  })

  it('pads the viewBox and pins the intrinsic size to the padded box', async () => {
    const svg = await renderStaticSvg(async () => SAMPLE_SVG)

    expect(svg).toContain('viewBox="-2 -2 104 104"')
    expect(svg).toContain('width="104"')
    expect(svg).toContain('height="104"')
  })

  it('centres the diagram when scaled into a box of another aspect ratio', async () => {
    const svg = await renderStaticSvg(async () => SAMPLE_SVG)

    expect(svg).toContain('preserveAspectRatio="xMidYMid meet"')
  })

  it('drops inline width and height so the embedding box controls the size', async () => {
    const svg = await renderStaticSvg(async () => (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="width: 400px; height: 300px"><rect/></svg>'
    ))

    expect(svg).not.toContain('400px')
    expect(svg).not.toContain('300px')
  })

  it('renames ids so two diagrams on one page never share a filter or marker', async () => {
    const svgWithSharedIds = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
      + '<defs><filter id="sticky-shadow"/><marker id="arrow"/></defs>'
      + '<rect filter="url(#sticky-shadow)"/>'
      + '<path style="marker-end: url(\'#arrow\')"/>'
      + '<use href="#arrow"/>'
      + '</svg>'

    const notation = notationExporting(async () => svgWithSharedIds)
    const parse = (svg: string) => new DOMParser().parseFromString(svg, 'image/svg+xml')
    const first = parse(await new StaticSvgRenderer().render(notation, 'first'))
    const second = parse(await new StaticSvgRenderer().render(notation, 'second'))

    const firstFilterId = first.querySelector('filter')!.id
    const firstMarkerId = first.querySelector('marker')!.id
    expect(firstFilterId).not.toBe('sticky-shadow')
    expect(second.querySelector('filter')!.id).not.toBe(firstFilterId)
    expect(first.querySelector('rect')!.getAttribute('filter')).toBe(`url(#${firstFilterId})`)
    expect(first.querySelector('path')!.getAttribute('style')).toContain(`#${firstMarkerId}`)
    expect(first.querySelector('use')!.getAttribute('href')).toBe(`#${firstMarkerId}`)
  })

  it('leaves references to ids outside the diagram untouched', async () => {
    const svg = await renderStaticSvg(async () => (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><filter id="shadow"/></defs><rect fill="url(#page-gradient)" filter="url(#shadow)"/></svg>'
    ))

    expect(svg).toContain('url(#page-gradient)')
  })

  it('leaves an SVG without a viewBox unpadded', async () => {
    const svg = await renderStaticSvg(async () => (
      '<svg xmlns="http://www.w3.org/2000/svg"><rect width="50" height="50"/></svg>'
    ))

    expect(svg).not.toContain('viewBox')
    expect(svg).toContain('<rect')
  })
})
