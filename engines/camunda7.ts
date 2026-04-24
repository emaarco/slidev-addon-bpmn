import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
  CamundaPlatformPropertiesProviderModule,
} from 'bpmn-js-properties-panel'
import camundaModdle from 'camunda-bpmn-moddle/resources/camunda.json'
import CamundaTransactionBoundaries from 'camunda-transaction-boundaries'
import type { EngineConfig } from './types'

export const camunda7Engine: EngineConfig = {
  additionalModules: [
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    CamundaPlatformPropertiesProviderModule,
    CamundaTransactionBoundaries,
  ],
  moddleExtensions: { camunda: camundaModdle },
}
