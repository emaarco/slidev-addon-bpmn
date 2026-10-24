import type { LiveNotation, LiveViewer } from './notation'

const CONTAINER_WAIT_TIMEOUT_MS = 5000

/**
 * Owns one live diagram-js viewer inside a slide container.
 *
 * Slidev preloads hidden slides with zero-size containers and calls both onMounted
 * and onSlideEnter, so `show` may be called repeatedly: it waits for the container
 * to get a size, renders each source once, refits on resize, and resolves `false`
 * when the container stays hidden so a later call can retry.
 */
export class EmbeddedViewer {
  private viewer: LiveViewer | null = null
  private shownSource: string | null = null
  private pendingRender: Promise<boolean> | null = null
  private resizeObserver: ResizeObserver | null = null
  private destroyed = false

  constructor(private readonly notation: LiveNotation) {}

  async show(container: HTMLElement, source: string): Promise<boolean> {
    while (this.pendingRender) await this.pendingRender
    if (source === this.shownSource) return true

    this.pendingRender = this.render(container, source)
    try {
      return await this.pendingRender
    } finally {
      this.pendingRender = null
    }
  }

  destroy(): void {
    this.destroyed = true
    this.discardViewer()
  }

  private async render(container: HTMLElement, source: string): Promise<boolean> {
    if (!await this.waitForSize(container)) return false

    this.discardViewer()
    this.viewer = await this.notation.createViewer(container)
    await this.viewer.show(source)
    if (this.destroyed) {
      this.discardViewer()
      return false
    }

    this.viewer.fit?.()
    this.shownSource = source
    this.refitOnResize(container)
    return true
  }

  private waitForSize(container: HTMLElement): Promise<boolean> {
    const deadline = Date.now() + CONTAINER_WAIT_TIMEOUT_MS
    return new Promise((resolve) => {
      const check = () => {
        if (this.destroyed) resolve(false)
        else if (container.clientWidth > 0 && container.clientHeight > 0) resolve(true)
        else if (Date.now() > deadline) resolve(false)
        else requestAnimationFrame(check)
      }
      check()
    })
  }

  private refitOnResize(container: HTMLElement): void {
    if (typeof ResizeObserver === 'undefined') return

    let lastSize = ''
    this.resizeObserver = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width)
      const height = Math.round(entry.contentRect.height)
      const size = `${width}x${height}`
      if (width === 0 || height === 0 || size === lastSize) return
      lastSize = size
      this.viewer?.fit?.()
    })
    this.resizeObserver.observe(container)
  }

  private discardViewer(): void {
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.viewer?.destroy()
    this.viewer = null
    this.shownSource = null
  }
}
