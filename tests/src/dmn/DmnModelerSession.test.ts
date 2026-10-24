import { describe, it, expect, vi, beforeEach } from 'vitest'

const { MockDmnModeler, modeler } = vi.hoisted(() => ({
  MockDmnModeler: vi.fn(),
  modeler: {
    importXML: vi.fn(),
    saveXML: vi.fn(),
    getActiveViewer: vi.fn(),
    destroy: vi.fn(),
  },
}))

vi.mock('dmn-js/lib/Modeler', () => ({ default: MockDmnModeler }))
vi.mock('../../../src/dmn/engines/camunda', () => ({
  camundaEngine: { additionalModules: ['CAMUNDA_MODULE'], moddleExtensions: { camunda: { name: 'Camunda' } } },
}))

import { DmnModelerSession } from '../../../src/dmn/DmnModelerSession'

function modelerConfig(): any {
  return MockDmnModeler.mock.calls[0][0]
}

describe('DmnModelerSession', () => {
  let canvas: HTMLDivElement
  let propertiesPanel: HTMLDivElement
  let drdCanvas: { resized: ReturnType<typeof vi.fn>, viewbox: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    canvas = document.createElement('div')
    propertiesPanel = document.createElement('div')
    drdCanvas = { resized: vi.fn(), viewbox: vi.fn() }
    modeler.importXML.mockResolvedValue(undefined)
    modeler.saveXML.mockResolvedValue({ xml: '<definitions id="saved"/>' })
    modeler.getActiveViewer.mockReturnValue({ get: (name: string) => (name === 'canvas' ? drdCanvas : undefined) })
    MockDmnModeler.mockImplementation(function () { return modeler })
  })

  it('creates a plain modeler in the canvas container without an engine', async () => {
    await DmnModelerSession.open('<xml/>', { canvas })

    expect(modelerConfig()).toEqual({ container: canvas })
  })

  it('nests the engine modules and properties panel under the drd key', async () => {
    await DmnModelerSession.open('<xml/>', { canvas, propertiesPanel }, 'camunda')

    expect(modelerConfig().container).toBe(canvas)
    expect(modelerConfig().drd).toEqual({
      additionalModules: ['CAMUNDA_MODULE'],
      propertiesPanel: { parent: propertiesPanel },
    })
  })

  it('registers the engine moddle extensions at the top level', async () => {
    await DmnModelerSession.open('<xml/>', { canvas, propertiesPanel }, 'camunda')

    expect(modelerConfig().moddleExtensions).toEqual({ camunda: { name: 'Camunda' } })
    expect(modelerConfig().drd.moddleExtensions).toBeUndefined()
  })

  it('imports the source', async () => {
    await DmnModelerSession.open('<definitions id="source"/>', { canvas })

    expect(modeler.importXML).toHaveBeenCalledWith('<definitions id="source"/>')
  })

  it('fits the active DRD at native scale after import', async () => {
    drdCanvas.viewbox.mockImplementation((box?: unknown) => box ? undefined : {
      inner: { x: 0, y: 0, width: 100, height: 100 },
      outer: { width: 1000, height: 1000 },
    })

    await DmnModelerSession.open('<xml/>', { canvas })

    expect(drdCanvas.resized).toHaveBeenCalled()
    expect(drdCanvas.viewbox).toHaveBeenLastCalledWith({ x: -450, y: -450, width: 1000, height: 1000 })
  })

  it('opens even when no DRD is active', async () => {
    modeler.getActiveViewer.mockReturnValue(undefined)

    await expect(DmnModelerSession.open('<xml/>', { canvas })).resolves.toBeInstanceOf(DmnModelerSession)
  })

  it('propagates an import failure', async () => {
    modeler.importXML.mockRejectedValue(new Error('broken XML'))

    await expect(DmnModelerSession.open('<xml/>', { canvas })).rejects.toThrow('broken XML')
  })

  it('destroys the modeler when the import fails', async () => {
    modeler.importXML.mockRejectedValue(new Error('broken XML'))

    await DmnModelerSession.open('<xml/>', { canvas }).catch(() => {})

    expect(modeler.destroy).toHaveBeenCalledOnce()
  })

  it('exports the formatted XML', async () => {
    const session = await DmnModelerSession.open('<xml/>', { canvas })

    await expect(session.exportSource()).resolves.toBe('<definitions id="saved"/>')
    expect(modeler.saveXML).toHaveBeenCalledWith({ format: true })
  })

  it('tells the active canvas about a resize', async () => {
    const session = await DmnModelerSession.open('<xml/>', { canvas })
    drdCanvas.resized.mockClear()

    session.resized()

    expect(drdCanvas.resized).toHaveBeenCalledOnce()
  })

  it('ignores a resize without an active viewer', async () => {
    const session = await DmnModelerSession.open('<xml/>', { canvas })
    modeler.getActiveViewer.mockReturnValue(undefined)

    expect(() => session.resized()).not.toThrow()
  })

  it('destroys the modeler', async () => {
    const session = await DmnModelerSession.open('<xml/>', { canvas })

    session.destroy()

    expect(modeler.destroy).toHaveBeenCalledOnce()
  })
})
