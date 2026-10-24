import DmnModeler from 'dmn-js/lib/Modeler'
import type { ModelerContainers, ModelerSession } from '../shared/lib/notation'
import { type Engine, dmnEngines } from './engines/dmnEngines'
import { fitActiveDrd } from './utils/fitActiveDrd'

export class DmnModelerSession implements ModelerSession {
  private constructor(
    private readonly modeler: any,
    private readonly importedXml: string,
  ) {}

  static async open(source: string, containers: ModelerContainers, engine?: Engine): Promise<DmnModelerSession> {
    const modeler = new DmnModeler(DmnModelerSession.modelerConfig(containers, engine))
    try {
      await modeler.importXML(source)
    } catch (err) {
      modeler.destroy()
      throw err
    }
    fitActiveDrd(modeler)
    return new DmnModelerSession(modeler, await DmnModelerSession.serialize(modeler))
  }

  async exportChanges(): Promise<string | null> {
    const xml = await DmnModelerSession.serialize(this.modeler)
    return xml === this.importedXml ? null : xml
  }

  resized(): void {
    this.modeler.getActiveViewer?.()?.get?.('canvas')?.resized()
  }

  destroy(): void {
    this.modeler.destroy()
  }

  private static modelerConfig(containers: ModelerContainers, engine?: Engine): Record<string, unknown> {
    const config: Record<string, unknown> = { container: containers.canvas }
    if (!engine) return config

    const engineConfig = dmnEngines[engine]
    const drd: Record<string, unknown> = { additionalModules: engineConfig.drdModules }
    if (containers.propertiesPanel) drd.propertiesPanel = { parent: containers.propertiesPanel }
    config.drd = drd
    config.moddleExtensions = engineConfig.moddleExtensions
    return config
  }

  private static async serialize(modeler: any): Promise<string> {
    const { xml } = await modeler.saveXML({ format: true })
    return xml
  }
}
