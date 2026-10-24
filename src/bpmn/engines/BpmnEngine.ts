export interface BpmnEngine {
  additionalModules: any[]
  moddleExtensions: Record<string, any>
  supportsTransactionBoundaries: boolean
}
