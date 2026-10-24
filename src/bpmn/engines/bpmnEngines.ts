import type { BpmnEngine } from './BpmnEngine'
import { camunda7Engine } from './camunda7'
import { zeebeEngine } from './zeebe'

export const bpmnEngines = {
  zeebe: zeebeEngine,
  camunda7: camunda7Engine,
} satisfies Record<string, BpmnEngine>

export type Engine = keyof typeof bpmnEngines
