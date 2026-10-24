import DmnViewer from 'dmn-js/lib/Viewer'
import type { StaticNotation } from '../shared/lib/notation'

const DEFAULT_FONT_SIZE = 12

export class DrdDiagramNotation implements StaticNotation {
  readonly kind = 'DMN'
  readonly rendering = 'static'
  private readonly fontSize: number

  constructor(fontSize: string) {
    this.fontSize = parseInt(fontSize, 10) || DEFAULT_FONT_SIZE
  }

  async exportSvg(source: string, container: HTMLElement): Promise<string> {
    const viewer = new DmnViewer({
      container,
      drd: { textRenderer: { defaultStyle: { fontSize: this.fontSize } } },
    })
    try {
      await viewer.importXML(source)
      const drdView = viewer.getViews().find((view: any) => view.type === 'drd')
      if (!drdView) {
        throw new Error('No DRD view found in DMN file')
      }
      await viewer.open(drdView)
      const { svg } = await viewer.getActiveViewer().saveSVG()
      return svg
    } finally {
      viewer.destroy()
    }
  }
}
