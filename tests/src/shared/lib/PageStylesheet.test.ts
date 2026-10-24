import { afterEach, describe, expect, it } from 'vitest'

import { PageStylesheet } from '../../../../src/shared/lib/PageStylesheet'

const CSS = '.djs-palette { top: 12px; }'

function appliedStyles(): HTMLStyleElement[] {
  return [...document.head.querySelectorAll('style')].filter(style => style.textContent === CSS)
}

describe('PageStylesheet', () => {
  afterEach(() => {
    appliedStyles().forEach(style => style.remove())
  })

  it('applies nothing until attached', () => {
    new PageStylesheet(CSS)

    expect(appliedStyles()).toHaveLength(0)
  })

  it('adds the stylesheet to the page head when attached', () => {
    new PageStylesheet(CSS).attach()

    expect(appliedStyles()).toHaveLength(1)
  })

  it('adds the stylesheet only once when attached twice', () => {
    const stylesheet = new PageStylesheet(CSS)

    stylesheet.attach()
    stylesheet.attach()

    expect(appliedStyles()).toHaveLength(1)
  })

  it('removes the stylesheet when detached', () => {
    const stylesheet = new PageStylesheet(CSS)
    stylesheet.attach()

    stylesheet.detach()

    expect(appliedStyles()).toHaveLength(0)
  })

  it('tolerates being detached without having been attached', () => {
    expect(() => new PageStylesheet(CSS).detach()).not.toThrow()
  })

  it('can be attached again after being detached', () => {
    const stylesheet = new PageStylesheet(CSS)
    stylesheet.attach()
    stylesheet.detach()

    stylesheet.attach()

    expect(appliedStyles()).toHaveLength(1)
  })

  it('removes only its own stylesheet', () => {
    const first = new PageStylesheet(CSS)
    const second = new PageStylesheet(CSS)
    first.attach()
    second.attach()

    first.detach()

    expect(appliedStyles()).toHaveLength(1)
  })
})
