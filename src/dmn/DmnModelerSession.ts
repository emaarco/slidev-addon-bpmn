import DmnModeler from 'dmn-js/lib/Modeler'
import type { ModelerContainers, ModelerSession } from '../shared/lib/notation'
import { dmnEngines } from './engines/dmnEngines'
import type { Engine } from './engines/types'
import { fitActiveDrd } from './utils/fitActiveDrd'

export class DmnModelerSession implements ModelerSession {
  private constructor(private readonly modeler: any) {}

  static async open(source: string, containers: ModelerContainers, engine?: Engine): Promise<DmnModelerSession> {
    const modeler = new DmnModeler(DmnModelerSession.modelerConfig(containers, engine))
    try {
      await modeler.importXML(source)
    } catch (err) {
      modeler.destroy()
      throw err
    }
    fitActiveDrd(modeler)
    return new DmnModelerSession(modeler)
  }

  async exportSource(): Promise<string> {
    const { xml } = await this.modeler.saveXML({ format: true })
    return xml
  }

  resized(): void {
    this.modeler.getActiveViewer?.()?.get?.('canvas')?.resized()
  }

  destroy(): void {
    this.modeler.destroy()
  }

  // dmn-js modelers are composed of per-view editors: the properties panel belongs
  // to the DRD editor, while the moddle extension must be known to every view.
  private static modelerConfig(containers: ModelerContainers, engine?: Engine): Record<string, unknown> {
    const config: Record<string, unknown> = { container: containers.canvas }
    if (!engine) return config

    const engineConfig = dmnEngines[engine]
    config.drd = {
      additionalModules: engineConfig.additionalModules,
      propertiesPanel: { parent: containers.propertiesPanel },
    }
    config.moddleExtensions = engineConfig.moddleExtensions
    return config
  }
}
