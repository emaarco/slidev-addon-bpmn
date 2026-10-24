import { vi } from 'vitest'

interface Viewbox {
  inner: { x: number; y: number; width: number; height: number }
  outer: { width: number; height: number }
}

const LARGE_DIAGRAM: Viewbox = {
  inner: { x: 0, y: 0, width: 1000, height: 500 },
  outer: { width: 800, height: 500 },
}

export const SMALL_DIAGRAM: Viewbox = {
  inner: { x: 0, y: 0, width: 100, height: 50 },
  outer: { width: 800, height: 500 },
}

export const bpmnJs = {
  viewers: [] as FakeBpmnDiagram[],
  modelers: [] as FakeBpmnDiagram[],
  viewbox: LARGE_DIAGRAM as Viewbox,
  savedXml: '<definitions>edited</definitions>' as string | undefined,
  importError: null as Error | null,

  reset(): void {
    this.viewers = []
    this.modelers = []
    this.viewbox = LARGE_DIAGRAM
    this.savedXml = '<definitions>edited</definitions>'
    this.importError = null
  },

  lastViewer(): FakeBpmnDiagram {
    return this.viewers[this.viewers.length - 1]
  },

  lastModeler(): FakeBpmnDiagram {
    return this.modelers[this.modelers.length - 1]
  },
}

export type FakeBpmnDiagram = ReturnType<typeof createFakeBpmnDiagram>

function createFakeBpmnDiagram(options: Record<string, any>) {
  const listeners = new Map<string, Array<() => void>>()
  const canvas = {
    resized: vi.fn(),
    viewbox: vi.fn((box?: object) => (box ? undefined : bpmnJs.viewbox)),
  }
  const transactionBoundaries = { show: vi.fn() }
  const eventBus = {
    on: vi.fn((event: string, listener: () => void) => {
      listeners.set(event, [...(listeners.get(event) ?? []), listener])
    }),
  }
  const services: Record<string, unknown> = { canvas, eventBus, transactionBoundaries }

  return {
    options,
    canvas,
    transactionBoundaries,
    importXML: vi.fn(async (_xml: string) => {
      if (bpmnJs.importError) throw bpmnJs.importError
      return { warnings: [] }
    }),
    saveXML: vi.fn(async (_options?: object) => ({ xml: bpmnJs.savedXml })),
    destroy: vi.fn(),
    get: vi.fn((service: string) => services[service]),
    fire(event: string): void {
      listeners.get(event)?.forEach(listener => listener())
    },
    fittedViewbox(): Record<string, number> | undefined {
      const setterCalls = canvas.viewbox.mock.calls.filter(([box]) => box !== undefined)
      return setterCalls[setterCalls.length - 1]?.[0] as Record<string, number> | undefined
    },
  }
}

export const FakeBpmnViewer = vi.fn(function (options: Record<string, any>) {
  const viewer = createFakeBpmnDiagram(options)
  bpmnJs.viewers.push(viewer)
  return viewer
})

export const FakeBpmnModeler = vi.fn(function (options: Record<string, any>) {
  const modeler = createFakeBpmnDiagram(options)
  bpmnJs.modelers.push(modeler)
  return modeler
})
