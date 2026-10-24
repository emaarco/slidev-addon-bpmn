import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type VueWrapper, flushPromises, mount } from '@vue/test-utils'

vi.mock('@slidev/client', () => ({
  onSlideEnter: vi.fn(),
}))

import type { LiveNotation, ModelerNotation, PreviewNotation, StaticNotation } from '../../../../src/shared/lib/notation'
import DiagramModeler from '../../../../src/shared/ui/DiagramModeler.vue'

const SAMPLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="50" height="50"/></svg>'
const FILE_SOURCE = 'title Order Checkout'
const EDITED_SOURCE = 'title Order Checkout\nevent Order Placed [620, 300]'
const MODELER_STYLES = '.djs-palette { top: 12px; }'

type FakeSession = {
  exportChanges: ReturnType<typeof vi.fn>
  resized: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
}

function modelerStylesAreApplied(): boolean {
  return [...document.head.querySelectorAll('style')].some(style => style.textContent === MODELER_STYLES)
}

function mockFetchSuccess(source = FILE_SOURCE) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(source),
  }))
}

function findButton(label: string): HTMLButtonElement | undefined {
  return [...document.body.querySelectorAll('button')].find(button => button.textContent?.includes(label))
}

function propertiesPanel(): HTMLElement | null {
  return document.body.querySelector('.diagram-modeler-properties-panel')
}

function pressKey(): void {
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
}

describe('DiagramModeler.vue', () => {
  let wrapper: VueWrapper
  let exportSvg: ReturnType<typeof vi.fn>
  let openModeler: ReturnType<typeof vi.fn>
  let session: FakeSession

  function staticNotation(overrides: Partial<ModelerNotation> = {}): ModelerNotation & StaticNotation {
    return { kind: 'Event Storming', rendering: 'static', blankSource: 'title New Board', exportSvg, openModeler, ...overrides }
  }

  function mountModeler(
    props: { filePath?: string } = { filePath: 'board.storm' },
    notation: ModelerNotation & PreviewNotation = staticNotation(),
  ) {
    wrapper = mount(DiagramModeler, {
      attachTo: document.body,
      props: {
        ...props,
        notation,
        width: '100%',
        height: '500px',
        modelerStyles: MODELER_STYLES,
      },
    })
  }

  async function mountRenderedModeler(notation?: ModelerNotation & PreviewNotation) {
    mockFetchSuccess()
    mountModeler({ filePath: 'board.storm' }, notation)
    await flushPromises()
  }

  async function openModelerFullscreen() {
    findButton('Edit')!.click()
    await flushPromises()
  }

  async function closeModeler() {
    findButton('Close')!.click()
    await flushPromises()
  }

  async function openAndCloseModeler() {
    await openModelerFullscreen()
    await closeModeler()
  }

  beforeEach(() => {
    session = { exportChanges: vi.fn().mockResolvedValue(null), resized: vi.fn(), destroy: vi.fn() }
    exportSvg = vi.fn().mockResolvedValue(SAMPLE_SVG)
    openModeler = vi.fn().mockResolvedValue(session)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    wrapper.unmount()
  })

  it('shows the preview and offers editing once the file is rendered', async () => {
    mockFetchSuccess()

    mountModeler()
    expect(findButton('Edit')).toBeUndefined()
    await flushPromises()

    expect(wrapper.html()).toContain('<svg')
    expect(findButton('Edit')).toBeDefined()
  })

  it('does not offer editing when the file cannot be loaded', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))

    mountModeler()
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to load Event Storming')
    expect(findButton('Edit')).toBeUndefined()
  })

  it('starts from the blank source without fetching when no file is given', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    mountModeler({})
    await flushPromises()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(exportSvg.mock.calls[0][0]).toBe('title New Board')
    expect(findButton('Edit')).toBeDefined()
  })

  it('opens the modeler fullscreen with the rendered source', async () => {
    await mountRenderedModeler()

    await openModelerFullscreen()

    expect(openModeler).toHaveBeenCalledOnce()
    const [source, { canvas, propertiesPanel }] = openModeler.mock.calls[0]
    expect(source).toBe(FILE_SOURCE)
    expect(document.body.contains(canvas)).toBe(true)
    expect(propertiesPanel).toBeUndefined()
    expect(findButton('Close')).toBeDefined()
  })

  it('shows the edited diagram in the preview after closing', async () => {
    session.exportChanges.mockResolvedValue(EDITED_SOURCE)
    await mountRenderedModeler()

    await openAndCloseModeler()

    expect(exportSvg).toHaveBeenCalledTimes(2)
    expect(exportSvg.mock.calls[1][0]).toBe(EDITED_SOURCE)
    expect(findButton('Close')).toBeUndefined()
  })

  it('reopens the modeler with the edited source', async () => {
    session.exportChanges.mockResolvedValue(EDITED_SOURCE)
    await mountRenderedModeler()
    await openAndCloseModeler()

    await openModelerFullscreen()

    expect(openModeler.mock.calls[1][0]).toBe(EDITED_SOURCE)
  })

  it('leaves the preview alone when nothing was edited', async () => {
    await mountRenderedModeler()

    await openAndCloseModeler()

    expect(exportSvg).toHaveBeenCalledOnce()
  })

  it('destroys the modeler when closing', async () => {
    await mountRenderedModeler()

    await openAndCloseModeler()

    expect(session.destroy).toHaveBeenCalledOnce()
  })

  it('keeps the preview when the edited diagram cannot be exported', async () => {
    session.exportChanges.mockImplementation(() => {
      throw new Error('export failed')
    })
    await mountRenderedModeler()

    await openAndCloseModeler()

    expect(exportSvg).toHaveBeenCalledOnce()
    expect(session.destroy).toHaveBeenCalledOnce()
    expect(wrapper.html()).toContain('<svg')
  })

  it('keeps the preview when an asynchronous export fails', async () => {
    session.exportChanges.mockRejectedValue(new Error('export failed'))
    await mountRenderedModeler()

    await openAndCloseModeler()

    expect(exportSvg).toHaveBeenCalledOnce()
    expect(session.destroy).toHaveBeenCalledOnce()
    expect(findButton('Close')).toBeUndefined()
  })

  it('destroys a modeler that finishes opening after the overlay was closed', async () => {
    let finishOpening!: (opened: FakeSession) => void
    openModeler.mockReturnValueOnce(new Promise((resolve) => { finishOpening = resolve }))
    await mountRenderedModeler()
    await openModelerFullscreen()

    await closeModeler()
    finishOpening(session)
    await flushPromises()

    expect(session.destroy).toHaveBeenCalledOnce()
    expect(session.exportChanges).not.toHaveBeenCalled()
    expect(findButton('Close')).toBeUndefined()
    expect(modelerStylesAreApplied()).toBe(false)
  })

  it('closes the overlay when the modeler cannot be opened', async () => {
    openModeler.mockRejectedValueOnce(new Error('broken source'))
    await mountRenderedModeler()

    await openModelerFullscreen()

    expect(findButton('Close')).toBeUndefined()
    expect(modelerStylesAreApplied()).toBe(false)
    expect(console.error).toHaveBeenCalled()
    expect(findButton('Edit')).toBeDefined()
  })

  it('keeps only the modeler of the latest Edit when an earlier one finishes opening late', async () => {
    const lateSession: FakeSession = { exportChanges: vi.fn(), resized: vi.fn(), destroy: vi.fn() }
    let finishFirstOpening!: (opened: FakeSession) => void
    openModeler.mockReturnValueOnce(new Promise((resolve) => { finishFirstOpening = resolve }))
    await mountRenderedModeler()
    await openModelerFullscreen()
    await closeModeler()
    await openModelerFullscreen()

    finishFirstOpening(lateSession)
    await flushPromises()
    await closeModeler()

    expect(lateSession.destroy).toHaveBeenCalledOnce()
    expect(lateSession.exportChanges).not.toHaveBeenCalled()
    expect(session.exportChanges).toHaveBeenCalledOnce()
  })

  it('applies the modeler styles only while the modeler is open', async () => {
    await mountRenderedModeler()
    expect(modelerStylesAreApplied()).toBe(false)

    await openModelerFullscreen()
    expect(modelerStylesAreApplied()).toBe(true)

    await closeModeler()
    expect(modelerStylesAreApplied()).toBe(false)
  })

  it('removes the modeler styles when the slide is unmounted with the modeler open', async () => {
    await mountRenderedModeler()
    await openModelerFullscreen()

    wrapper.unmount()

    expect(modelerStylesAreApplied()).toBe(false)
  })

  it('lets the modeler see key strokes but keeps them from the slide navigation while open', async () => {
    const modelerShortcuts = vi.fn()
    const slideNavigation = vi.fn()
    document.addEventListener('keydown', modelerShortcuts)
    window.addEventListener('keydown', slideNavigation)
    await mountRenderedModeler()
    await openModelerFullscreen()

    pressKey()

    expect(modelerShortcuts).toHaveBeenCalledOnce()
    expect(slideNavigation).not.toHaveBeenCalled()
    document.removeEventListener('keydown', modelerShortcuts)
    window.removeEventListener('keydown', slideNavigation)
  })

  it('hands key strokes back to the slide navigation after closing', async () => {
    const slideNavigation = vi.fn()
    window.addEventListener('keydown', slideNavigation)
    await mountRenderedModeler()
    await openAndCloseModeler()

    pressKey()

    expect(slideNavigation).toHaveBeenCalledOnce()
    window.removeEventListener('keydown', slideNavigation)
  })

  it('destroys an open modeler when the slide is unmounted', async () => {
    await mountRenderedModeler()
    await openModelerFullscreen()

    wrapper.unmount()

    expect(session.destroy).toHaveBeenCalledOnce()
  })

  describe('with a properties panel', () => {
    const notationWithPanel = () => staticNotation({ hasPropertiesPanel: true })

    it('hands the modeler a properties panel container next to the canvas', async () => {
      await mountRenderedModeler(notationWithPanel())

      await openModelerFullscreen()

      const [, containers] = openModeler.mock.calls[0]
      expect(containers.propertiesPanel).toBe(propertiesPanel())
      expect(document.body.contains(containers.canvas)).toBe(true)
    })

    it('offers no panel toggle without a properties panel', async () => {
      await mountRenderedModeler()

      await openModelerFullscreen()

      expect(propertiesPanel()).toBeNull()
      expect(findButton('panel')).toBeUndefined()
    })

    it('hides the panel and tells the modeler it was resized', async () => {
      await mountRenderedModeler(notationWithPanel())
      await openModelerFullscreen()

      findButton('Hide panel')!.click()
      await flushPromises()

      expect(propertiesPanel()!.style.display).toBe('none')
      expect(findButton('Show panel')).toBeDefined()
      expect(session.resized).toHaveBeenCalledOnce()
    })

    it('shows the hidden panel again', async () => {
      await mountRenderedModeler(notationWithPanel())
      await openModelerFullscreen()
      findButton('Hide panel')!.click()
      await flushPromises()

      findButton('Show panel')!.click()
      await flushPromises()

      expect(propertiesPanel()!.style.display).toBe('')
      expect(session.resized).toHaveBeenCalledTimes(2)
    })

    it('opens with the panel shown after it was hidden in the last session', async () => {
      await mountRenderedModeler(notationWithPanel())
      await openModelerFullscreen()
      findButton('Hide panel')!.click()
      await flushPromises()
      await closeModeler()

      await openModelerFullscreen()

      expect(propertiesPanel()!.style.display).toBe('')
      expect(findButton('Hide panel')).toBeDefined()
    })
  })

  describe('with a live preview', () => {
    let previewViewers: Array<{ show: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> }>

    function liveNotation(): ModelerNotation & LiveNotation {
      return {
        kind: 'BPMN',
        rendering: 'live',
        blankSource: '<definitions/>',
        openModeler,
        createViewer: vi.fn(async () => {
          const viewer = { show: vi.fn().mockResolvedValue(undefined), destroy: vi.fn() }
          previewViewers.push(viewer)
          return viewer
        }),
      }
    }

    async function mountLiveModeler() {
      mockFetchSuccess()
      mountModeler({ filePath: 'process.bpmn' }, liveNotation())
      const previewCanvas = wrapper.find('.live-diagram-canvas').element
      Object.defineProperty(previewCanvas, 'clientWidth', { get: () => 800 })
      Object.defineProperty(previewCanvas, 'clientHeight', { get: () => 600 })
      await vi.waitFor(() => expect(findButton('Edit')).toBeDefined())
    }

    beforeEach(() => {
      previewViewers = []
    })

    it('shows the file in a live viewer instead of a static SVG', async () => {
      await mountLiveModeler()

      expect(previewViewers).toHaveLength(1)
      expect(previewViewers[0].show).toHaveBeenCalledWith(FILE_SOURCE)
      expect(wrapper.find('.static-diagram').exists()).toBe(false)
    })

    it('opens the modeler with the source the live viewer shows', async () => {
      await mountLiveModeler()

      await openModelerFullscreen()

      expect(openModeler.mock.calls[0][0]).toBe(FILE_SOURCE)
    })

    it('shows the edited diagram in the live viewer after closing', async () => {
      session.exportChanges.mockResolvedValue(EDITED_SOURCE)
      await mountLiveModeler()

      await openAndCloseModeler()

      await vi.waitFor(() => expect(previewViewers).toHaveLength(2))
      expect(previewViewers[1].show).toHaveBeenCalledWith(EDITED_SOURCE)
      expect(previewViewers[0].destroy).toHaveBeenCalledOnce()
    })
  })
})
