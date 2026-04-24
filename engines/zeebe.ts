import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
  ZeebePropertiesProviderModule,
} from 'bpmn-js-properties-panel'
import ZeebeBehaviorsModule from 'camunda-bpmn-js-behaviors/lib/camunda-cloud'
import zeebeModdle from 'zeebe-bpmn-moddle/resources/zeebe.json'
import type { EngineConfig } from './types'

export const zeebeEngine: EngineConfig = {
  additionalModules: [
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    ZeebePropertiesProviderModule,
    ZeebeBehaviorsModule,
  ],
  moddleExtensions: { zeebe: zeebeModdle },
}
