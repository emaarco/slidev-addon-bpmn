import type { EngineConfig } from '../../shared/lib/engineConfig'
import { camundaEngine } from './camunda'
import type { Engine } from './types'

export const dmnEngines: Record<Engine, EngineConfig> = {
  camunda: camundaEngine,
}
