import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('bpmn-js/lib/Viewer', async () => ({ default: (await import('./fakeBpmnJs')).FakeBpmnViewer }))

import { BpmnSimulationViewer } from '../../../plugins/bpmn/BpmnSimulationViewer'
import { bpmnJs, FakeBpmnViewer, SMALL_DIAGRAM } from './fakeBpmnJs'

function containerOfWidth(width: number): HTMLDivElement {
  const container = document.createElement('div')
  Object.defineProperty(container, 'clientWidth', { value: width, configurable: true })
  return container
}

describe('BpmnSimulationViewer', () => {
  beforeEach(() => bpmnJs.reset())

  it('creates a bpmn-js viewer in the container with the given options', () => {
    const container = containerOfWidth(600)
    const modules = [{ __id: 'token-simulation' }]

    new BpmnSimulationViewer(container, { additionalModules: modules })

    expect(FakeBpmnViewer).toHaveBeenCalledWith({ container, additionalModules: modules })
  })

  it('imports the source on show', async () => {
    await new BpmnSimulationViewer(containerOfWidth(600), {}).show('<definitions/>')

    expect(bpmnJs.lastViewer().importXML).toHaveBeenCalledWith('<definitions/>')
  })

  it('resizes the canvas and fits the diagram on fit', () => {
    new BpmnSimulationViewer(containerOfWidth(600), {}).fit()

    expect(bpmnJs.lastViewer().canvas.resized).toHaveBeenCalled()
    expect(bpmnJs.lastViewer().fittedViewbox()).toBeDefined()
  })

  it('caps the fit at the given max scale', () => {
    bpmnJs.viewbox = SMALL_DIAGRAM

    new BpmnSimulationViewer(containerOfWidth(600), {}, 1).fit()

    expect(bpmnJs.lastViewer().fittedViewbox()).toMatchObject({ width: 800, height: 500 })
  })

  it.each([
    [1200, '1'],
    [600, '1'],
    [450, '0.75'],
    [300, '0.5'],
    [100, '0.5'],
  ])('scales the simulation toggle for a %ipx wide container to %s', (width, expectedScale) => {
    const container = containerOfWidth(width)

    new BpmnSimulationViewer(container, {}).fit()

    expect(container.style.getPropertyValue('--bts-toggle-scale')).toBe(expectedScale)
  })

  it('destroys the bpmn-js viewer', () => {
    new BpmnSimulationViewer(containerOfWidth(600), {}).destroy()

    expect(bpmnJs.lastViewer().destroy).toHaveBeenCalledOnce()
  })
})
