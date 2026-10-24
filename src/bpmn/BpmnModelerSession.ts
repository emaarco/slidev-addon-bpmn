import BpmnModeler from 'bpmn-js/lib/Modeler'
import tokenSimulationModeler from 'bpmn-js-token-simulation'
import type { ModelerContainers, ModelerSession } from '../shared/lib/notation'
import { fitDiagram } from '../shared/lib/utils/fitDiagram'
import { type Engine, bpmnEngines } from './engines/bpmnEngines'

export interface BpmnModelerOptions {
  engine?: Engine
  tokenSimulation: boolean
  transactionBoundaries: boolean
  maxScale?: number
}

export class BpmnModelerSession implements ModelerSession {
  private hasChanges = false

  private constructor(private readonly modeler: InstanceType<typeof BpmnModeler>) {
    const eventBus = modeler.get('eventBus') as any
    eventBus.on('commandStack.changed', () => { this.hasChanges = true })
  }

  static async open(source: string, containers: ModelerContainers, options: BpmnModelerOptions): Promise<BpmnModelerSession> {
    const modeler = new BpmnModeler(BpmnModelerSession.modelerConfig(containers, options))
    try {
      await modeler.importXML(source)
    } catch (err) {
      modeler.destroy()
      throw err
    }

    const session = new BpmnModelerSession(modeler)
    session.fit(options.maxScale)
    if (options.transactionBoundaries) session.showTransactionBoundaries(options.engine)
    return session
  }

  async exportChanges(): Promise<string | null> {
    if (!this.hasChanges) return null
    const { xml } = await this.modeler.saveXML({ format: true })
    return xml ?? null
  }

  resized(): void {
    this.canvas().resized()
  }

  destroy(): void {
    this.modeler.destroy()
  }

  private fit(maxScale?: number): void {
    const canvas = this.canvas()
    canvas.resized()
    fitDiagram(canvas, undefined, maxScale)
  }

  private showTransactionBoundaries(engine?: Engine): void {
    if (!engine || !bpmnEngines[engine].supportsTransactionBoundaries) {
      console.warn('[BpmnModeler] transactionBoundaries requires engine="camunda7"; ignoring.')
      return
    }
    const transactionBoundaries = this.modeler.get('transactionBoundaries') as any
    transactionBoundaries.show()
  }

  private canvas(): any {
    return this.modeler.get('canvas')
  }

  private static modelerConfig(containers: ModelerContainers, options: BpmnModelerOptions): Record<string, unknown> {
    const config: Record<string, unknown> = { container: containers.canvas }
    const additionalModules: any[] = []

    if (options.engine) {
      const engine = bpmnEngines[options.engine]
      config.moddleExtensions = engine.moddleExtensions
      additionalModules.push(...engine.additionalModules)
    }
    if (containers.propertiesPanel) config.propertiesPanel = { parent: containers.propertiesPanel }
    if (options.tokenSimulation) additionalModules.push(tokenSimulationModeler)
    if (additionalModules.length) config.additionalModules = additionalModules

    return config
  }
}
