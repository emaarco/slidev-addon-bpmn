import DataSimulationModule from '@emaarco/bpmn-js-data-simulation'
import tokenSimulationViewer from 'bpmn-js-token-simulation/lib/viewer'
import type { LiveNotation, LiveViewer } from '../shared/lib/notation'
import { BpmnSimulationViewer } from './BpmnSimulationViewer'
import { bpmnEngines } from './engines/bpmnEngines'
import type { Engine } from './engines/types'
import { silencedNotificationsModule, tokenSimulationViewerModules } from './tokenSimulationViewerModules'

export interface BpmnTokenSimulationOptions {
  maxScale?: number
  dataSimulation?: {
    engine: Engine
    loadScenarios: () => Promise<unknown>
  }
}

export class BpmnTokenSimulationNotation implements LiveNotation {
  readonly kind = 'BPMN'

  constructor(private readonly options: BpmnTokenSimulationOptions) {}

  async createViewer(container: HTMLElement): Promise<LiveViewer> {
    return new BpmnSimulationViewer(container, await this.viewerOptions(), this.options.maxScale)
  }

  private async viewerOptions(): Promise<Record<string, unknown>> {
    const dataSimulation = this.options.dataSimulation
    if (!dataSimulation) return { additionalModules: tokenSimulationViewerModules }

    return {
      additionalModules: [tokenSimulationViewer, DataSimulationModule, silencedNotificationsModule],
      moddleExtensions: bpmnEngines[dataSimulation.engine].moddleExtensions,
      dataSimulation: { engine: dataSimulation.engine, scenarios: await dataSimulation.loadScenarios() },
    }
  }
}
