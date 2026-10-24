import { describe, it, expect, vi, beforeEach } from 'vitest'

const { MockDmnViewer, viewer } = vi.hoisted(() => ({
  MockDmnViewer: vi.fn(),
  viewer: {
    importXML: vi.fn(),
    getViews: vi.fn(),
    open: vi.fn(),
    destroy: vi.fn(),
  },
}))

vi.mock('dmn-js/lib/Viewer', () => ({ default: MockDmnViewer }))

import { DecisionTableNotation } from '../../../plugins/dmn/DecisionTableNotation'
import { DecisionTableViewer } from '../../../plugins/dmn/DecisionTableViewer'

const DRD_VIEW = { type: 'drd' }
const FIRST_TABLE = { type: 'decisionTable', element: { id: 'Decision_First' } }
const SECOND_TABLE = { type: 'decisionTable', element: { id: 'Decision_Second' } }

describe('DecisionTableViewer', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    viewer.importXML.mockResolvedValue(undefined)
    viewer.getViews.mockReturnValue([DRD_VIEW, FIRST_TABLE, SECOND_TABLE])
    viewer.open.mockResolvedValue(undefined)
    MockDmnViewer.mockImplementation(function () { return viewer })
  })

  it('creates a dmn-js viewer in the container', () => {
    new DecisionTableViewer(container)

    expect(MockDmnViewer).toHaveBeenCalledWith({ container })
  })

  it('imports the source and opens the first decision table', async () => {
    await new DecisionTableViewer(container).show('<definitions/>')

    expect(viewer.importXML).toHaveBeenCalledWith('<definitions/>')
    expect(viewer.open).toHaveBeenCalledWith(FIRST_TABLE)
  })

  it('opens the decision table selected by decisionId', async () => {
    await new DecisionTableViewer(container, 'Decision_Second').show('<definitions/>')

    expect(viewer.open).toHaveBeenCalledWith(SECOND_TABLE)
  })

  it('throws when the file has no decision table', async () => {
    viewer.getViews.mockReturnValue([DRD_VIEW])

    await expect(new DecisionTableViewer(container).show('<xml/>')).rejects.toThrow('No decision table view found')
    expect(viewer.open).not.toHaveBeenCalled()
  })

  it('throws when no decision table has the requested decisionId', async () => {
    await expect(new DecisionTableViewer(container, 'Decision_Missing').show('<xml/>')).rejects.toThrow('No decision table view found')
  })

  it('destroys the dmn-js viewer', () => {
    new DecisionTableViewer(container).destroy()

    expect(viewer.destroy).toHaveBeenCalledOnce()
  })
})

describe('DecisionTableNotation', () => {
  beforeEach(() => {
    viewer.importXML.mockResolvedValue(undefined)
    viewer.getViews.mockReturnValue([FIRST_TABLE, SECOND_TABLE])
    viewer.open.mockResolvedValue(undefined)
    MockDmnViewer.mockImplementation(function () { return viewer })
  })

  it('identifies itself as DMN', () => {
    expect(new DecisionTableNotation().kind).toBe('DMN')
  })

  it('creates viewers that open its decision', async () => {
    const tableViewer = await new DecisionTableNotation('Decision_Second').createViewer(document.createElement('div'))
    await tableViewer.show('<xml/>')

    expect(viewer.open).toHaveBeenCalledWith(SECOND_TABLE)
  })
})
