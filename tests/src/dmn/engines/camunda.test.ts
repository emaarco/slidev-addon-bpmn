import { describe, it, expect, vi } from 'vitest'

// Mock the heavy dmn-js / moddle imports so the test stays hermetic and fast —
// it verifies how camunda.ts *wires* them, not their internals.
vi.mock('dmn-js-properties-panel', () => ({
  DmnPropertiesPanelModule: { __id: 'panel' },
  DmnPropertiesProviderModule: { __id: 'provider' },
  CamundaPropertiesProviderModule: { __id: 'camunda-provider' },
}))
vi.mock('camunda-dmn-moddle/resources/camunda.json', () => ({ default: { name: 'Camunda' } }))

import { camundaEngine } from '../../../../src/dmn/engines/camunda'
import {
  DmnPropertiesPanelModule,
  DmnPropertiesProviderModule,
  CamundaPropertiesProviderModule,
} from 'dmn-js-properties-panel'

describe('camundaEngine', () => {
  it('bundles the three DMN properties-panel modules', () => {
    expect(camundaEngine.drdModules).toEqual([
      DmnPropertiesPanelModule,
      DmnPropertiesProviderModule,
      CamundaPropertiesProviderModule,
    ])
  })

  it('registers the camunda moddle extension under the `camunda` namespace', () => {
    expect(camundaEngine.moddleExtensions).toHaveProperty('camunda')
    expect((camundaEngine.moddleExtensions.camunda as { name: string }).name).toBe('Camunda')
  })
})
