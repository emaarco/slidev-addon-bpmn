import { describe, it, expect, vi } from 'vitest'

vi.mock('bpmn-js-properties-panel', () => ({
  BpmnPropertiesPanelModule: { __id: 'panel' },
  BpmnPropertiesProviderModule: { __id: 'provider' },
  CamundaPlatformPropertiesProviderModule: { __id: 'c7-provider' },
}))
vi.mock('camunda-bpmn-moddle/resources/camunda.json', () => ({
  default: { name: 'Camunda' },
}))
vi.mock('camunda-transaction-boundaries', () => ({
  default: { __init__: ['transactionBoundaries'] },
}))

import { camunda7Engine } from '../../engines/camunda7'

describe('camunda7Engine', () => {
  it('registers the four Camunda Platform modules', () => {
    expect(camunda7Engine.additionalModules).toHaveLength(4)
  })

  it('exposes the camunda moddle extension', () => {
    expect(camunda7Engine.moddleExtensions).toHaveProperty('camunda')
  })
})
