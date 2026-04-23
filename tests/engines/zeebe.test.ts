import { describe, it, expect, vi } from 'vitest'

vi.mock('bpmn-js-properties-panel', () => ({
  BpmnPropertiesPanelModule: { __id: 'panel' },
  BpmnPropertiesProviderModule: { __id: 'provider' },
  ZeebePropertiesProviderModule: { __id: 'zeebe-provider' },
  CamundaPlatformPropertiesProviderModule: { __id: 'c7-provider' },
}))
vi.mock('camunda-bpmn-js-behaviors/lib/camunda-cloud', () => ({
  default: { __id: 'zeebe-behaviors' },
}))
vi.mock('zeebe-bpmn-moddle/resources/zeebe.json', () => ({
  default: { name: 'Zeebe' },
}))

import { zeebeEngine } from '../../engines/zeebe'

describe('zeebeEngine', () => {
  it('registers the four Zeebe modules', () => {
    expect(zeebeEngine.additionalModules).toHaveLength(4)
  })

  it('exposes the zeebe moddle extension', () => {
    expect(zeebeEngine.moddleExtensions).toHaveProperty('zeebe')
  })
})
