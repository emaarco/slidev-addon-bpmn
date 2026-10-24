import {
  DmnPropertiesPanelModule,
  DmnPropertiesProviderModule,
  CamundaPropertiesProviderModule,
} from 'dmn-js-properties-panel'
import camundaModdle from 'camunda-dmn-moddle/resources/camunda.json'
import type { DmnEngine } from './DmnEngine'

export const camundaEngine: DmnEngine = {
  drdModules: [
    DmnPropertiesPanelModule,
    DmnPropertiesProviderModule,
    CamundaPropertiesProviderModule,
  ],
  moddleExtensions: { camunda: camundaModdle },
}
