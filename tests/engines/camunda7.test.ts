import { describe, it, expect, vi } from 'vitest'

vi.mock('bpmn-js-properties-panel', () => ({
  BpmnPropertiesPanelModule: { __id: 'panel' },
  BpmnPropertiesProviderModule: { __id: 'provider' },
  CamundaPlatformPropertiesProviderModule: { __id: 'c7-provider' },
}))
vi.mock('camunda-bpmn-moddle/resources/camunda.json', () => ({
  default: { name: 'Camunda' },
}))
// Mirror the real esbuild interop shape: the package's CJS entry re-exports an
// ESM default, so the default import surfaces the actual didi module nested one
// level deep under `.default`. camunda7.ts must unwrap this.
vi.mock('camunda-transaction-boundaries', () => ({
  default: { default: { __init__: ['transactionBoundaries'], transactionBoundaries: ['type', () => {}] } },
}))

import { camunda7Engine } from '../../engines/camunda7'

describe('camunda7Engine', () => {
  it('registers the four Camunda Platform modules', () => {
    expect(camunda7Engine.additionalModules).toHaveLength(4)
  })

  it('registers a valid transaction-boundaries didi module (unwrapped from nested default)', () => {
    const tbModule = camunda7Engine.additionalModules[3] as any
    expect(tbModule).toHaveProperty('__init__')
    expect(tbModule.__init__).toContain('transactionBoundaries')
  })

  it('exposes the camunda moddle extension', () => {
    expect(camunda7Engine.moddleExtensions).toHaveProperty('camunda')
  })
})
