import { Modeler, Viewer } from '@miragon/wardley-renderer'
import commandStackMissingInReadOnlyViewer from 'diagram-js/lib/command/index.js'
import type { ModelerContainers, ModelerNotation, ModelerSession, StaticNotation } from '../../shared/lib/notation'

export class WardleyMapNotation implements StaticNotation, ModelerNotation {
  readonly kind = 'Wardley Map'
  readonly blankSource = 'title New Map'

  async exportSvg(source: string, container: HTMLElement): Promise<string> {
    const viewer = new Viewer({ container, additionalModules: [commandStackMissingInReadOnlyViewer] })
    try {
      await viewer.importDSL(source)
      const { svg } = await viewer.saveSVG()
      return svg
    } finally {
      viewer.destroy()
    }
  }

  async openModeler(source: string, { canvas }: ModelerContainers): Promise<ModelerSession> {
    const modeler = new Modeler({ container: canvas })
    await modeler.importDSL(source)

    return {
      exportSource: () => modeler.exportDSL(),
      destroy: () => modeler.destroy(),
    }
  }
}
