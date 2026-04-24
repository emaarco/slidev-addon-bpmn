import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
  CamundaPlatformPropertiesProviderModule,
} from 'bpmn-js-properties-panel'
import camundaModdle from 'camunda-bpmn-moddle/resources/camunda.json'
import type { EngineConfig } from './types'

export const camunda7Engine: EngineConfig = {
  additionalModules: [
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    CamundaPlatformPropertiesProviderModule,
  ],
  moddleExtensions: { camunda: camundaModdle },
}
