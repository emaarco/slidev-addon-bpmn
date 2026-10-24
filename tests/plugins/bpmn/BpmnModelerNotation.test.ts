import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('bpmn-js/lib/Viewer', async () => ({ default: (await import('./fakeBpmnJs')).FakeBpmnViewer }))
vi.mock('bpmn-js/lib/Modeler', async () => ({ default: (await import('./fakeBpmnJs')).FakeBpmnModeler }))
vi.mock('bpmn-js-token-simulation', () => ({ default: 'token-simulation-modeler' }))
vi.mock('bpmn-js-token-simulation/lib/viewer', () => ({ default: 'token-simulation-viewer' }))
vi.mock('../../../plugins/bpmn/engines/zeebe', () => ({
  zeebeEngine: { additionalModules: ['zeebe-module'], moddleExtensions: { zeebe: {} } },
}))
vi.mock('../../../plugins/bpmn/engines/camunda7', () => ({
  camunda7Engine: { additionalModules: ['camunda7-module'], moddleExtensions: { camunda: {} } },
}))

import { BpmnModelerNotation } from '../../../plugins/bpmn/BpmnModelerNotation'
import { BpmnModelerSession } from '../../../plugins/bpmn/BpmnModelerSession'
import { bpmnJs, FakeBpmnViewer, SMALL_DIAGRAM } from './fakeBpmnJs'

const DEFAULT_OPTIONS = { tokenSimulation: false, transactionBoundaries: false }

describe('BpmnModelerNotation', () => {
  beforeEach(() => bpmnJs.reset())

  it('names its diagram kind BPMN', () => {
    expect(new BpmnModelerNotation(DEFAULT_OPTIONS).kind).toBe('BPMN')
  })

  it('starts a new diagram from a process with a single start event', () => {
    const blank = new DOMParser().parseFromString(new BpmnModelerNotation(DEFAULT_OPTIONS).blankSource, 'application/xml')

    expect(blank.querySelector('parsererror')).toBeNull()
    expect(blank.getElementsByTagName('bpmn:startEvent')).toHaveLength(1)
    expect(blank.getElementsByTagName('bpmndi:BPMNShape')[0].getAttribute('bpmnElement')).toBe('StartEvent_1')
  })

  it('has a properties panel only with an engine', () => {
    expect(new BpmnModelerNotation(DEFAULT_OPTIONS).hasPropertiesPanel).toBe(false)
    expect(new BpmnModelerNotation({ ...DEFAULT_OPTIONS, engine: 'zeebe' }).hasPropertiesPanel).toBe(true)
  })

  describe('createViewer', () => {
    const container = document.createElement('div')

    it('creates a plain viewer without token simulation', async () => {
      await new BpmnModelerNotation(DEFAULT_OPTIONS).createViewer(container)

      expect(FakeBpmnViewer).toHaveBeenCalledWith({ container })
    })

    it('adds the token simulation viewer modules with token simulation', async () => {
      await new BpmnModelerNotation({ ...DEFAULT_OPTIONS, tokenSimulation: true }).createViewer(container)

      const { additionalModules } = bpmnJs.lastViewer().options
      expect(additionalModules[0]).toBe('token-simulation-viewer')
      expect(additionalModules[1].notifications[0]).toBe('value')
    })

    it('fits the preview no further than the max scale', async () => {
      bpmnJs.viewbox = SMALL_DIAGRAM
      const viewer = await new BpmnModelerNotation({ ...DEFAULT_OPTIONS, maxScale: 1 }).createViewer(container)

      viewer.fit!()

      expect(bpmnJs.lastViewer().fittedViewbox()).toMatchObject({ width: 800, height: 500 })
    })

    it('lets the preview grow up to twice its size by default', async () => {
      bpmnJs.viewbox = SMALL_DIAGRAM
      const viewer = await new BpmnModelerNotation(DEFAULT_OPTIONS).createViewer(container)

      viewer.fit!()

      expect(bpmnJs.lastViewer().fittedViewbox()).toMatchObject({ width: 400, height: 250 })
    })
  })

  it('opens a modeler session with its options', async () => {
    const canvas = document.createElement('div')
    const propertiesPanel = document.createElement('div')

    const session = await new BpmnModelerNotation({ ...DEFAULT_OPTIONS, engine: 'zeebe', tokenSimulation: true })
      .openModeler('<definitions/>', { canvas, propertiesPanel })

    expect(session).toBeInstanceOf(BpmnModelerSession)
    expect(bpmnJs.lastModeler().importXML).toHaveBeenCalledWith('<definitions/>')
    expect(bpmnJs.lastModeler().options).toMatchObject({
      container: canvas,
      propertiesPanel: { parent: propertiesPanel },
      additionalModules: ['zeebe-module', 'token-simulation-modeler'],
    })
  })
})
