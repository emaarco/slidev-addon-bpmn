import { beforeEach, describe, expect, it, vi } from 'vitest'

import { EmbeddedViewer } from '../../../../src/shared/lib/EmbeddedViewer'
import type { LiveNotation } from '../../../../src/shared/lib/notation'

type FakeViewer = {
  show: ReturnType<typeof vi.fn>
  fit: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
}

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = []
  readonly observed: Element[] = []
  disconnected = false

  constructor(private readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this)
  }

  observe(element: Element): void {
    this.observed.push(element)
  }

  disconnect(): void {
    this.disconnected = true
  }

  resizeTo(width: number, height: number): void {
    this.callback([{ contentRect: { width, height } } as ResizeObserverEntry], this as unknown as ResizeObserver)
  }
}

function createContainer(width: number, height: number) {
  const container = document.createElement('div')
  const size = { width, height }
  Object.defineProperty(container, 'clientWidth', { get: () => size.width })
  Object.defineProperty(container, 'clientHeight', { get: () => size.height })
  return { container, size }
}

function nextFrames(count = 3): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, count))
}

function lastResizeObserver(): FakeResizeObserver {
  return FakeResizeObserver.instances.at(-1)!
}

describe('EmbeddedViewer', () => {
  let viewers: FakeViewer[]
  let createViewer: ReturnType<typeof vi.fn>
  let notation: LiveNotation

  beforeEach(() => {
    viewers = []
    createViewer = vi.fn(async () => {
      const viewer = { show: vi.fn().mockResolvedValue(undefined), fit: vi.fn(), destroy: vi.fn() }
      viewers.push(viewer)
      return viewer
    })
    notation = { kind: 'Test', rendering: 'live', createViewer }
    FakeResizeObserver.instances = []
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  })

  it('creates a viewer in the container, shows the source and fits it', async () => {
    const { container } = createContainer(800, 600)

    const shown = await new EmbeddedViewer(notation).show(container, 'source')

    expect(shown).toBe(true)
    expect(createViewer).toHaveBeenCalledWith(container)
    expect(viewers[0].show).toHaveBeenCalledWith('source')
    expect(viewers[0].fit).toHaveBeenCalledOnce()
  })

  it('renders a viewer that cannot fit', async () => {
    createViewer.mockResolvedValueOnce({ show: vi.fn().mockResolvedValue(undefined), destroy: vi.fn() })
    const { container } = createContainer(800, 600)

    await expect(new EmbeddedViewer(notation).show(container, 'source')).resolves.toBe(true)
  })

  it('waits for the container to get a size before creating the viewer', async () => {
    const { container, size } = createContainer(0, 0)
    const embeddedViewer = new EmbeddedViewer(notation)

    const shown = embeddedViewer.show(container, 'source')
    await nextFrames()
    expect(createViewer).not.toHaveBeenCalled()

    size.width = 800
    size.height = 600

    await expect(shown).resolves.toBe(true)
    expect(createViewer).toHaveBeenCalledOnce()
  })

  it('keeps waiting while only one dimension has a size', async () => {
    const { container, size } = createContainer(800, 0)
    const embeddedViewer = new EmbeddedViewer(notation)

    const shown = embeddedViewer.show(container, 'source')
    await nextFrames()
    expect(createViewer).not.toHaveBeenCalled()

    size.height = 600
    await expect(shown).resolves.toBe(true)
  })

  it('gives up when the container stays hidden and renders on a later call', async () => {
    let now = 0
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    const { container, size } = createContainer(0, 0)
    const embeddedViewer = new EmbeddedViewer(notation)

    const shown = embeddedViewer.show(container, 'source')
    await nextFrames()
    now = 5001

    await expect(shown).resolves.toBe(false)
    expect(createViewer).not.toHaveBeenCalled()

    size.width = 800
    size.height = 600
    await expect(embeddedViewer.show(container, 'source')).resolves.toBe(true)
    expect(createViewer).toHaveBeenCalledOnce()
  })

  it('renders the same source only once', async () => {
    const { container } = createContainer(800, 600)
    const embeddedViewer = new EmbeddedViewer(notation)

    await embeddedViewer.show(container, 'source')
    const shownAgain = await embeddedViewer.show(container, 'source')

    expect(shownAgain).toBe(true)
    expect(createViewer).toHaveBeenCalledOnce()
    expect(viewers[0].destroy).not.toHaveBeenCalled()
  })

  it('renders once when the same source is shown concurrently', async () => {
    const { container } = createContainer(800, 600)
    const embeddedViewer = new EmbeddedViewer(notation)

    const results = await Promise.all([
      embeddedViewer.show(container, 'source'),
      embeddedViewer.show(container, 'source'),
    ])

    expect(results).toEqual([true, true])
    expect(createViewer).toHaveBeenCalledOnce()
  })

  it('replaces the viewer when a new source is shown', async () => {
    const { container } = createContainer(800, 600)
    const embeddedViewer = new EmbeddedViewer(notation)
    await embeddedViewer.show(container, 'before')

    await embeddedViewer.show(container, 'after')

    expect(createViewer).toHaveBeenCalledTimes(2)
    expect(viewers[0].destroy).toHaveBeenCalledOnce()
    expect(viewers[1].show).toHaveBeenCalledWith('after')
    expect(viewers[1].destroy).not.toHaveBeenCalled()
  })

  it('shows concurrent calls with different sources one after the other', async () => {
    const { container } = createContainer(800, 600)
    const embeddedViewer = new EmbeddedViewer(notation)

    await Promise.all([
      embeddedViewer.show(container, 'before'),
      embeddedViewer.show(container, 'after'),
    ])

    expect(viewers.map(viewer => viewer.show.mock.calls[0][0])).toEqual(['before', 'after'])
    expect(viewers[0].destroy).toHaveBeenCalledOnce()
    expect(viewers[1].destroy).not.toHaveBeenCalled()
  })

  it('rejects when the source cannot be shown and renders it again on the next call', async () => {
    createViewer.mockResolvedValueOnce({ show: vi.fn().mockRejectedValue(new Error('import failed')), fit: vi.fn(), destroy: vi.fn() })
    const { container } = createContainer(800, 600)
    const embeddedViewer = new EmbeddedViewer(notation)

    await expect(embeddedViewer.show(container, 'source')).rejects.toThrow('import failed')

    await expect(embeddedViewer.show(container, 'source')).resolves.toBe(true)
    expect(createViewer).toHaveBeenCalledTimes(2)
    expect(viewers[0].show).toHaveBeenCalledWith('source')
  })

  it('destroys the viewer that failed to show before creating the next one', async () => {
    const failedViewer = { show: vi.fn().mockRejectedValue(new Error('import failed')), fit: vi.fn(), destroy: vi.fn() }
    createViewer.mockResolvedValueOnce(failedViewer)
    const { container } = createContainer(800, 600)
    const embeddedViewer = new EmbeddedViewer(notation)
    await embeddedViewer.show(container, 'source').catch(() => {})

    await embeddedViewer.show(container, 'source')

    expect(failedViewer.destroy).toHaveBeenCalledOnce()
  })

  it('stops waiting for the container when destroyed', async () => {
    const { container } = createContainer(0, 0)
    const embeddedViewer = new EmbeddedViewer(notation)

    const shown = embeddedViewer.show(container, 'source')
    embeddedViewer.destroy()

    await expect(shown).resolves.toBe(false)
    expect(createViewer).not.toHaveBeenCalled()
  })

  it('destroys a viewer that finishes showing after it was destroyed', async () => {
    let finishShowing!: () => void
    const lateViewer = { show: vi.fn(() => new Promise<void>((resolve) => { finishShowing = resolve })), fit: vi.fn(), destroy: vi.fn() }
    createViewer.mockResolvedValueOnce(lateViewer)
    const { container } = createContainer(800, 600)
    const embeddedViewer = new EmbeddedViewer(notation)

    const shown = embeddedViewer.show(container, 'source')
    await vi.waitFor(() => expect(lateViewer.show).toHaveBeenCalled())
    embeddedViewer.destroy()
    finishShowing()

    await expect(shown).resolves.toBe(false)
    expect(lateViewer.destroy).toHaveBeenCalled()
    expect(lateViewer.fit).not.toHaveBeenCalled()
  })

  it('destroys the rendered viewer and stops refitting when destroyed', async () => {
    const { container } = createContainer(800, 600)
    const embeddedViewer = new EmbeddedViewer(notation)
    await embeddedViewer.show(container, 'source')

    embeddedViewer.destroy()

    expect(viewers[0].destroy).toHaveBeenCalledOnce()
    expect(lastResizeObserver().disconnected).toBe(true)
  })

  it('refits the diagram when the container is resized', async () => {
    const { container } = createContainer(800, 600)
    await new EmbeddedViewer(notation).show(container, 'source')
    viewers[0].fit.mockClear()

    lastResizeObserver().resizeTo(1024, 768)

    expect(lastResizeObserver().observed).toEqual([container])
    expect(viewers[0].fit).toHaveBeenCalledOnce()
  })

  it('refits only once per size', async () => {
    const { container } = createContainer(800, 600)
    await new EmbeddedViewer(notation).show(container, 'source')
    viewers[0].fit.mockClear()

    lastResizeObserver().resizeTo(1024, 768)
    lastResizeObserver().resizeTo(1024.2, 767.8)

    expect(viewers[0].fit).toHaveBeenCalledOnce()
  })

  it('does not refit while the container is collapsed', async () => {
    const { container } = createContainer(800, 600)
    await new EmbeddedViewer(notation).show(container, 'source')
    viewers[0].fit.mockClear()

    lastResizeObserver().resizeTo(0, 768)

    expect(viewers[0].fit).not.toHaveBeenCalled()
  })

  it('stops observing the container of a replaced viewer', async () => {
    const { container } = createContainer(800, 600)
    const embeddedViewer = new EmbeddedViewer(notation)
    await embeddedViewer.show(container, 'before')
    const firstObserver = lastResizeObserver()

    await embeddedViewer.show(container, 'after')

    expect(firstObserver.disconnected).toBe(true)
    expect(lastResizeObserver().disconnected).toBe(false)
  })

  it('renders without refitting where ResizeObserver is unavailable', async () => {
    vi.stubGlobal('ResizeObserver', undefined)
    const { container } = createContainer(800, 600)

    await expect(new EmbeddedViewer(notation).show(container, 'source')).resolves.toBe(true)
  })
})
