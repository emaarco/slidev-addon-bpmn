export type Engine = 'zeebe' | 'camunda7'

export interface EngineConfig {
  additionalModules: any[]
  moddleExtensions: Record<string, any>
}
