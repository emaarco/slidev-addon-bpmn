// dmn-js modelers are composed of per-view editors: the properties panel modules
// belong to the DRD editor, while the moddle extension must be known to every view.
export interface DmnEngine {
  drdModules: any[]
  moddleExtensions: Record<string, any>
}
