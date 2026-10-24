import { Modeler, Viewer } from '@miragon/event-storming-renderer'
import commandStackMissingInReadOnlyViewer from 'diagram-js/lib/command/index.js'
import type { ModelerContainers, ModelerNotation, ModelerSession, StaticNotation } from '../shared/lib/notation'

export class EventStormingNotation implements StaticNotation, ModelerNotation {
  readonly kind = 'Event Storming'
  readonly rendering = 'static'
  readonly blankSource = 'title New Board'

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
    const importedSource = modeler.exportDSL()

    return {
      exportChanges: async () => {
        const source = modeler.exportDSL()
        return source === importedSource ? null : source
      },
      destroy: () => modeler.destroy(),
    }
  }
}
