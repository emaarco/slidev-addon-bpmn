import { camundaEngine } from './camunda'
import type { DmnEngine } from './DmnEngine'

export const dmnEngines = {
  camunda: camundaEngine,
} satisfies Record<string, DmnEngine>

export type Engine = keyof typeof dmnEngines
