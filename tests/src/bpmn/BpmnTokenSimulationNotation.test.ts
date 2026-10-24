import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('bpmn-js/lib/Viewer', async () => ({ default: (await import('./fakeBpmnJs')).FakeBpmnViewer }))
vi.mock('bpmn-js-token-simulation/lib/viewer', () => ({ default: 'token-simulation-viewer' }))
vi.mock('@emaarco/bpmn-js-data-simulation', () => ({ default: 'data-simulation' }))
vi.mock('../../../src/bpmn/engines/zeebe', () => ({
  zeebeEngine: { additionalModules: ['zeebe-module'], moddleExtensions: { zeebe: { name: 'zeebe' } } },
}))
vi.mock('../../../src/bpmn/engines/camunda7', () => ({
  camunda7Engine: { additionalModules: ['camunda7-module'], moddleExtensions: { camunda: { name: 'camunda' } } },
}))

import { BpmnSimulationViewer } from '../../../src/bpmn/BpmnSimulationViewer'
import { BpmnTokenSimulationNotation } from '../../../src/bpmn/BpmnTokenSimulationNotation'
import { silencedNotificationsModule } from '../../../src/bpmn/tokenSimulationViewerModules'
import { bpmnJs, SMALL_DIAGRAM } from './fakeBpmnJs'

const SCENARIOS = { scenarios: [{ id: 'small-order' }] }

describe('BpmnTokenSimulationNotation', () => {
  const container = document.createElement('div')

  beforeEach(() => bpmnJs.reset())

  it('names its diagram kind BPMN', () => {
    expect(new BpmnTokenSimulationNotation({}).kind).toBe('BPMN')
  })

  it('creates a simulation viewer with the plain token simulation', async () => {
    const viewer = await new BpmnTokenSimulationNotation({}).createViewer(container)

    expect(viewer).toBeInstanceOf(BpmnSimulationViewer)
    expect(bpmnJs.lastViewer().options).toEqual({
      container,
      additionalModules: ['token-simulation-viewer', silencedNotificationsModule],
    })
  })

  it('silences the token simulation notifications', () => {
    const [, notifications] = silencedNotificationsModule.notifications as [string, { showNotification: () => void }]

    expect(notifications.showNotification()).toBeUndefined()
  })

  it('fits the viewer no further than the max scale', async () => {
    bpmnJs.viewbox = SMALL_DIAGRAM
    const viewer = await new BpmnTokenSimulationNotation({ maxScale: 1 }).createViewer(container)

    viewer.fit!()

    expect(bpmnJs.lastViewer().fittedViewbox()).toMatchObject({ width: 800, height: 500 })
  })

  describe('with data simulation', () => {
    it.each([
      ['zeebe' as const, { zeebe: { name: 'zeebe' } }],
      ['camunda7' as const, { camunda: { name: 'camunda' } }],
    ])('adds the data simulation with the %s moddle and the loaded scenarios', async (engine, moddleExtensions) => {
      const notation = new BpmnTokenSimulationNotation({
        dataSimulation: { engine, loadScenarios: vi.fn().mockResolvedValue(SCENARIOS) },
      })

      await notation.createViewer(container)

      expect(bpmnJs.lastViewer().options).toEqual({
        container,
        additionalModules: ['token-simulation-viewer', 'data-simulation', silencedNotificationsModule],
        moddleExtensions,
        dataSimulation: { engine, scenarios: SCENARIOS },
      })
    })

    it('asks for the scenarios for every viewer it creates', async () => {
      const loadScenarios = vi.fn().mockResolvedValue(SCENARIOS)
      const notation = new BpmnTokenSimulationNotation({ dataSimulation: { engine: 'zeebe', loadScenarios } })

      await notation.createViewer(container)
      await notation.createViewer(container)

      expect(loadScenarios).toHaveBeenCalledTimes(2)
      expect(bpmnJs.viewers.map(viewer => viewer.options.dataSimulation.scenarios)).toEqual([SCENARIOS, SCENARIOS])
    })

    it('creates no viewer when the scenarios cannot be loaded', async () => {
      const loadScenarios = vi.fn().mockRejectedValue(new Error('Failed to fetch BPMN file: 404'))
      const notation = new BpmnTokenSimulationNotation({ dataSimulation: { engine: 'zeebe', loadScenarios } })

      await expect(notation.createViewer(container)).rejects.toThrow('Failed to fetch BPMN file: 404')
      expect(bpmnJs.viewers).toHaveLength(0)
    })
  })
})
