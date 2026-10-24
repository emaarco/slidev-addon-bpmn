import type { EngineConfig } from '../../shared/lib/engineConfig'
import { camunda7Engine } from './camunda7'
import type { Engine } from './types'
import { zeebeEngine } from './zeebe'

export const bpmnEngines: Record<Engine, EngineConfig> = {
  zeebe: zeebeEngine,
  camunda7: camunda7Engine,
}
