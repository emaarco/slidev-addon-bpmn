import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
  CamundaPlatformPropertiesProviderModule,
} from 'bpmn-js-properties-panel'
import camundaModdle from 'camunda-bpmn-moddle/resources/camunda.json'
import CamundaTransactionBoundariesModule from 'camunda-transaction-boundaries'
import type { EngineConfig } from './types'

const raw = CamundaTransactionBoundariesModule as any
const CamundaTransactionBoundaries = raw?.__init__ ? raw : (raw?.default ?? raw)

export const camunda7Engine: EngineConfig = {
  additionalModules: [
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    CamundaPlatformPropertiesProviderModule,
    CamundaTransactionBoundaries,
  ],
  moddleExtensions: { camunda: camundaModdle },
}
