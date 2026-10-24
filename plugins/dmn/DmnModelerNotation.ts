import type { LiveNotation, LiveViewer, ModelerContainers, ModelerNotation, ModelerSession } from '../../shared/lib/notation'
import { DmnModelerSession } from './DmnModelerSession'
import { DrdLiveViewer } from './DrdLiveViewer'
import type { Engine } from './engines/types'

const BLANK_DMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" xmlns:dmndi="https://www.omg.org/spec/DMN/20191111/DMNDI/" id="blank_definitions" name="New Decision Model" namespace="http://camunda.org/schema/1.0/dmn">
  <dmndi:DMNDI>
    <dmndi:DMNDiagram id="DMNDiagram_1" />
  </dmndi:DMNDI>
</definitions>`

export class DmnModelerNotation implements LiveNotation, ModelerNotation {
  readonly kind = 'DMN'
  readonly blankSource = BLANK_DMN
  readonly hasPropertiesPanel: boolean

  constructor(private readonly engine?: Engine) {
    this.hasPropertiesPanel = !!engine
  }

  async createViewer(container: HTMLElement): Promise<LiveViewer> {
    return new DrdLiveViewer(container)
  }

  openModeler(source: string, containers: ModelerContainers): Promise<ModelerSession> {
    return DmnModelerSession.open(source, containers, this.engine)
  }
}
