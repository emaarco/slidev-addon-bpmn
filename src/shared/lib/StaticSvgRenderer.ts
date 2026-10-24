import type { StaticNotation } from './notation'
import { toEmbeddableSvg } from './utils/embeddableSvg'

const OFFSCREEN_WIDTH = '1920px'
const OFFSCREEN_HEIGHT = '1080px'

export class StaticSvgRenderer {
  private static renderedSvgCount = 0

  async render(notation: StaticNotation, source: string): Promise<string> {
    const container = this.createOffscreenContainer()
    try {
      const exportedSvg = await notation.exportSvg(source, container)
      return toEmbeddableSvg(exportedSvg, `-static-${++StaticSvgRenderer.renderedSvgCount}`)
    } finally {
      container.remove()
    }
  }

  private createOffscreenContainer(): HTMLElement {
    const container = document.createElement('div')
    container.style.width = OFFSCREEN_WIDTH
    container.style.height = OFFSCREEN_HEIGHT
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    document.body.appendChild(container)
    return container
  }
}
