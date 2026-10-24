import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('bpmn-js/lib/Modeler', async () => ({ default: (await import('./fakeBpmnJs')).FakeBpmnModeler }))
vi.mock('bpmn-js-token-simulation', () => ({ default: 'token-simulation-modeler' }))
vi.mock('../../../src/bpmn/engines/zeebe', () => ({
  zeebeEngine: { additionalModules: ['zeebe-module-a', 'zeebe-module-b'], moddleExtensions: { zeebe: { name: 'zeebe' } }, supportsTransactionBoundaries: false },
}))
vi.mock('../../../src/bpmn/engines/camunda7', () => ({
  camunda7Engine: { additionalModules: ['camunda7-module'], moddleExtensions: { camunda: { name: 'camunda' } }, supportsTransactionBoundaries: true },
}))

import { type BpmnModelerOptions, BpmnModelerSession } from '../../../src/bpmn/BpmnModelerSession'
import { bpmnJs, SMALL_DIAGRAM } from './fakeBpmnJs'

const SOURCE = '<definitions>imported</definitions>'
const DEFAULT_OPTIONS: BpmnModelerOptions = { tokenSimulation: false, transactionBoundaries: false }

describe('BpmnModelerSession', () => {
  const canvas = document.createElement('div')
  const propertiesPanel = document.createElement('div')

  function open(options: Partial<BpmnModelerOptions> = {}) {
    const containers = options.engine ? { canvas, propertiesPanel } : { canvas }
    return BpmnModelerSession.open(SOURCE, containers, { ...DEFAULT_OPTIONS, ...options })
  }

  beforeEach(() => bpmnJs.reset())

  describe('modeler configuration', () => {
    it('passes only the canvas container without engine and token simulation', async () => {
      await open()

      expect(bpmnJs.lastModeler().options).toEqual({ container: canvas })
    })

    it('wires the Zeebe modules, moddle and properties panel for engine="zeebe"', async () => {
      await open({ engine: 'zeebe' })

      expect(bpmnJs.lastModeler().options).toEqual({
        container: canvas,
        propertiesPanel: { parent: propertiesPanel },
        moddleExtensions: { zeebe: { name: 'zeebe' } },
        additionalModules: ['zeebe-module-a', 'zeebe-module-b'],
      })
    })

    it('wires the Camunda 7 modules, moddle and properties panel for engine="camunda7"', async () => {
      await open({ engine: 'camunda7' })

      expect(bpmnJs.lastModeler().options).toEqual({
        container: canvas,
        propertiesPanel: { parent: propertiesPanel },
        moddleExtensions: { camunda: { name: 'camunda' } },
        additionalModules: ['camunda7-module'],
      })
    })

    it('leaves out the properties panel when given no container for it', async () => {
      await BpmnModelerSession.open(SOURCE, { canvas }, { ...DEFAULT_OPTIONS, engine: 'zeebe' })

      expect(bpmnJs.lastModeler().options.propertiesPanel).toBeUndefined()
      expect(bpmnJs.lastModeler().options.moddleExtensions).toEqual({ zeebe: { name: 'zeebe' } })
    })

    it('adds the token simulation modeler module', async () => {
      await open({ tokenSimulation: true })

      expect(bpmnJs.lastModeler().options).toEqual({ container: canvas, additionalModules: ['token-simulation-modeler'] })
    })

    it('puts the token simulation after the engine modules', async () => {
      await open({ engine: 'zeebe', tokenSimulation: true })

      expect(bpmnJs.lastModeler().options.additionalModules)
        .toEqual(['zeebe-module-a', 'zeebe-module-b', 'token-simulation-modeler'])
    })
  })

  it('imports the source and fits it to the canvas', async () => {
    await open()

    const modeler = bpmnJs.lastModeler()
    expect(modeler.importXML).toHaveBeenCalledWith(SOURCE)
    expect(modeler.canvas.resized).toHaveBeenCalled()
    expect(modeler.fittedViewbox()).toBeDefined()
  })

  it('fits no further than the max scale', async () => {
    bpmnJs.viewbox = SMALL_DIAGRAM

    await open({ maxScale: 1 })

    expect(bpmnJs.lastModeler().fittedViewbox()).toMatchObject({ width: 800, height: 500 })
  })

  it('rejects when the source cannot be imported', async () => {
    bpmnJs.importError = new Error('invalid XML')

    await expect(open()).rejects.toThrow('invalid XML')
  })

  it('destroys the modeler when the source cannot be imported', async () => {
    bpmnJs.importError = new Error('invalid XML')

    await open().catch(() => {})

    expect(bpmnJs.lastModeler().destroy).toHaveBeenCalledOnce()
  })

  describe('transaction boundaries', () => {
    it('shows them with engine="camunda7"', async () => {
      await open({ engine: 'camunda7', transactionBoundaries: true })

      expect(bpmnJs.lastModeler().transactionBoundaries.show).toHaveBeenCalledOnce()
    })

    it('does not show them unless enabled', async () => {
      await open({ engine: 'camunda7' })

      expect(bpmnJs.lastModeler().transactionBoundaries.show).not.toHaveBeenCalled()
    })

    it.each([['zeebe' as const], [undefined]])('warns and skips them with engine=%s', async (engine) => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await open({ engine, transactionBoundaries: true })

      expect(bpmnJs.lastModeler().transactionBoundaries.show).not.toHaveBeenCalled()
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('transactionBoundaries requires engine="camunda7"'))
    })
  })

  describe('exportChanges', () => {
    it('reports no changes without saving when nothing changed', async () => {
      const session = await open()

      expect(await session.exportChanges()).toBeNull()
      expect(bpmnJs.lastModeler().saveXML).not.toHaveBeenCalled()
    })

    it('saves formatted XML after the command stack changed', async () => {
      const session = await open()
      bpmnJs.lastModeler().fire('commandStack.changed')

      expect(await session.exportChanges()).toBe('<definitions>edited</definitions>')
      expect(bpmnJs.lastModeler().saveXML).toHaveBeenCalledWith({ format: true })
    })

    it('reports no changes when saving yields no XML', async () => {
      bpmnJs.savedXml = undefined
      const session = await open()
      bpmnJs.lastModeler().fire('commandStack.changed')

      expect(await session.exportChanges()).toBeNull()
    })
  })

  it('tells the canvas about a resize', async () => {
    const session = await open()
    const { canvas: modelerCanvas } = bpmnJs.lastModeler()
    modelerCanvas.resized.mockClear()

    session.resized()

    expect(modelerCanvas.resized).toHaveBeenCalledOnce()
  })

  it('destroys the modeler', async () => {
    const session = await open()

    session.destroy()

    expect(bpmnJs.lastModeler().destroy).toHaveBeenCalledOnce()
  })
})
