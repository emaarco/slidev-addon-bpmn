import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type VueWrapper, mount } from '@vue/test-utils'

import FullscreenOverlay from '../../../shared/ui/FullscreenOverlay.vue'

function overlay(): HTMLElement | null {
  return document.body.querySelector('.fullscreen-overlay')
}

function pressKey(): void {
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
}

describe('FullscreenOverlay.vue', () => {
  let wrapper: VueWrapper
  let modelerShortcuts: ReturnType<typeof vi.fn>
  let slideNavigation: ReturnType<typeof vi.fn>

  function mountOverlay(open: boolean) {
    wrapper = mount(FullscreenOverlay, {
      attachTo: document.body,
      props: { open },
      slots: {
        default: '<div class="canvas">canvas</div>',
        toolbar: '<button>Close</button>',
        aside: '<div class="panel">panel</div>',
      },
    })
  }

  beforeEach(() => {
    modelerShortcuts = vi.fn()
    slideNavigation = vi.fn()
    document.addEventListener('keydown', modelerShortcuts)
    window.addEventListener('keydown', slideNavigation)
  })

  afterEach(() => {
    wrapper.unmount()
    document.removeEventListener('keydown', modelerShortcuts)
    window.removeEventListener('keydown', slideNavigation)
  })

  it('renders nothing while closed', () => {
    mountOverlay(false)

    expect(overlay()).toBeNull()
  })

  it('teleports the open overlay to the page body with all its slots', () => {
    mountOverlay(true)

    expect(overlay()!.parentElement).toBe(document.body)
    expect(overlay()!.querySelector('.canvas')).not.toBeNull()
    expect(overlay()!.querySelector('.fullscreen-overlay-toolbar button')!.textContent).toBe('Close')
    expect(overlay()!.querySelector('.panel')).not.toBeNull()
  })

  it('lets the modeler see key strokes but keeps them from the slide navigation while open', async () => {
    mountOverlay(false)
    await wrapper.setProps({ open: true })

    pressKey()

    expect(modelerShortcuts).toHaveBeenCalledOnce()
    expect(slideNavigation).not.toHaveBeenCalled()
  })

  it('keeps key strokes from the slide navigation when mounted open', () => {
    mountOverlay(true)

    pressKey()

    expect(slideNavigation).not.toHaveBeenCalled()
  })

  it('hands key strokes back to the slide navigation after closing', async () => {
    mountOverlay(false)
    await wrapper.setProps({ open: true })
    await wrapper.setProps({ open: false })

    pressKey()

    expect(overlay()).toBeNull()
    expect(slideNavigation).toHaveBeenCalledOnce()
  })

  it('hands key strokes back to the slide navigation when unmounted while open', async () => {
    mountOverlay(false)
    await wrapper.setProps({ open: true })

    wrapper.unmount()
    pressKey()

    expect(slideNavigation).toHaveBeenCalledOnce()
  })

  it('leaves key strokes to the slide navigation while closed', () => {
    mountOverlay(false)

    pressKey()

    expect(slideNavigation).toHaveBeenCalledOnce()
  })
})
