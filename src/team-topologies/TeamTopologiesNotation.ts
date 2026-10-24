import { Modeler, Viewer } from '@miragon/team-topologies-renderer'
import {
  type TtDocument,
  emptyDocument,
  parseDocument,
  serializeDocument,
} from '@miragon/team-topologies-schema-model'
import type { ModelerContainers, ModelerNotation, ModelerSession, StaticNotation } from '../shared/lib/notation'

export class TeamTopologiesNotation implements StaticNotation, ModelerNotation {
  readonly kind = 'Team Topologies'
  readonly blankSource = serializeDocument(emptyDocument())

  async exportSvg(source: string, container: HTMLElement): Promise<string> {
    const teamTopologies = this.parse(source)

    const viewer = new Viewer({ container })
    try {
      viewer.importDocument(teamTopologies)
      return viewer.saveSVG().svg
    } finally {
      viewer.destroy()
    }
  }

  async openModeler(source: string, { canvas }: ModelerContainers): Promise<ModelerSession> {
    const modeler = new Modeler({ container: canvas })
    modeler.importDocument(this.parse(source))

    return {
      exportSource: () => serializeDocument(modeler.exportDocument()),
      destroy: () => modeler.destroy(),
    }
  }

  private parse(source: string): TtDocument {
    const parsed = parseDocument(JSON.parse(source))
    if (!parsed.ok) {
      throw new Error(parsed.error)
    }
    return parsed.document
  }
}
