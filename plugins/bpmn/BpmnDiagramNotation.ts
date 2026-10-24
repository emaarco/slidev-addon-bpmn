import BpmnViewer from 'bpmn-js/lib/Viewer'
import type { StaticNotation } from '../../shared/lib/notation'

export class BpmnDiagramNotation implements StaticNotation {
  readonly kind = 'BPMN'

  async exportSvg(source: string, container: HTMLElement): Promise<string> {
    const viewer = new BpmnViewer({ container })
    try {
      await viewer.importXML(source)
      const { svg } = await viewer.saveSVG()
      return svg
    } finally {
      viewer.destroy()
    }
  }
}
