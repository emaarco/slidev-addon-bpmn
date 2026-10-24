import {
  DmnPropertiesPanelModule,
  DmnPropertiesProviderModule,
  CamundaPropertiesProviderModule,
} from 'dmn-js-properties-panel'
import camundaModdle from 'camunda-dmn-moddle/resources/camunda.json'
import type { EngineConfig } from '../../shared/lib/engineConfig'

/**
 * Camunda Platform properties panel for the DMN modeler.
 *
 * The modules are passed to the modeler under its `drd:` key, while the moddle
 * extension is registered at the top level so the `camunda:` namespace is known
 * during import, editing and export.
 */
export const camundaEngine: EngineConfig = {
  additionalModules: [
    DmnPropertiesPanelModule,
    DmnPropertiesProviderModule,
    CamundaPropertiesProviderModule,
  ],
  moddleExtensions: { camunda: camundaModdle },
}
