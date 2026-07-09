import { describe, expect, it, vi } from 'vitest'

import { fitDiagram } from '../../internal/fitDiagram'

type Box = { x: number; y: number; width: number; height: number }

function createCanvas(
  inner: Box | null,
  outer: { width: number; height: number } = { width: 1000, height: 1000 },
) {
  const viewbox = vi.fn(() => ({
    inner: inner ?? undefined,
    outer,
  }))
  return { viewbox, _setter: viewbox }
}

describe('fitDiagram', () => {
  it('matches the outer aspect (square outer / square padded box)', () => {
    // Padded box is 1100x1100, outer is 1000x1000 → no aspect expansion needed.
    const canvas = createCanvas({ x: 0, y: 0, width: 1000, height: 1000 })

    fitDiagram(canvas)

    expect(canvas._setter).toHaveBeenLastCalledWith({
      x: -50,
      y: -50,
      width: 1100,
      height: 1100,
    })
  })

  it('expands width to match a wider outer container, keeping the diagram centred', () => {
    // Inner is large enough that fitting does not trigger the clamp.
    const canvas = createCanvas(
      { x: 0, y: 0, width: 2000, height: 1000 },
      { width: 1000, height: 500 },
    )

    fitDiagram(canvas)

    // pad = 2000 * 0.05 = 100. Padded box: x=-100 y=-100 w=2200 h=1200.
    // outerAspect 2, boxAspect 1.83 → expand width. newWidth = 1200 * 2 = 2400.
    // x shifts by -(2400-2200)/2 = -100 → x = -200.
    expect(canvas._setter).toHaveBeenLastCalledWith({
      x: -200,
      y: -100,
      width: 2400,
      height: 1200,
    })
  })

  it('expands height to match a taller outer container, keeping the diagram centred', () => {
    // Box aspect > outer aspect → height grows.
    const canvas = createCanvas(
      { x: 0, y: 0, width: 1000, height: 100 },
      { width: 500, height: 500 },
    )

    fitDiagram(canvas)

    // pad = 1000 * 0.05 = 50. Padded box: x=-50 y=-50 w=1100 h=200.
    // outerAspect 1, boxAspect 5.5. newHeight = 1100/1 = 1100.
    // y shifts by -(1100-200)/2 = -450 → y = -50 - 450 = -500.
    expect(canvas._setter).toHaveBeenLastCalledWith({
      x: -50,
      y: -500,
      width: 1100,
      height: 1100,
    })
  })

  it('clamps a tiny diagram at the default cap (2×) and centres it, instead of ballooning to fit', () => {
    // 36×36 in a 1500×500 card: padded fit ≈12×, capped at 2× native (~72px, not huge).
    const canvas = createCanvas(
      { x: 100, y: 100, width: 36, height: 36 },
      { width: 1500, height: 500 },
    )

    fitDiagram(canvas)

    // bbox centre (118,118); box = outer/2 = 750×250, origin (-257, -7).
    expect(canvas._setter).toHaveBeenLastCalledWith({
      x: -257,
      y: -7,
      width: 750,
      height: 250,
    })
  })

  it('honours an explicit maxScale argument (clamps at the given cap)', () => {
    // Same 36×36 in a 1500×500 card, but maxScale=1 → clamp at native (viewbox = outer).
    const canvas = createCanvas(
      { x: 100, y: 100, width: 36, height: 36 },
      { width: 1500, height: 500 },
    )

    fitDiagram(canvas, undefined, 1)

    // bbox centre (118,118); box = outer/1 = 1500×500, origin (-632, -132).
    expect(canvas._setter).toHaveBeenLastCalledWith({
      x: -632,
      y: -132,
      width: 1500,
      height: 500,
    })
  })

  it('enlarges a small-but-real diagram to fill the card (up to the cap)', () => {
    // Regression guard: a 560×224 process smaller than its 1000×500 pane must scale UP
    // to fill it — old MAX_SCALE=1 clamped to native 1× (width 1000); the 2× cap lets ~1.62 apply.
    const canvas = createCanvas(
      { x: 0, y: 0, width: 560, height: 224 },
      { width: 1000, height: 500 },
    )

    fitDiagram(canvas)

    // pad=28 → box 616×280. fitScale min(1.62, 1.79)=1.62 (<2, no clamp).
    // boxAspect 2.2 > outerAspect 2 → expand height to 616/2=308, y=-28-14=-42.
    expect(canvas._setter).toHaveBeenLastCalledWith({
      x: -28,
      y: -42,
      width: 616,
      height: 308,
    })

    // Genuinely enlarged: viewbox width 616 < outer 1000 → zoom ~1.62×, not native 1×.
    const [box] = canvas._setter.mock.calls.at(-1) as [Box]
    expect(box.width).toBeLessThan(1000)
  })

  it('honours an explicit ratio', () => {
    const canvas = createCanvas({ x: 0, y: 0, width: 1000, height: 1000 })

    fitDiagram(canvas, 0.1)

    // pad = 100. No aspect expansion (square outer).
    expect(canvas._setter).toHaveBeenLastCalledWith({
      x: -100,
      y: -100,
      width: 1200,
      height: 1200,
    })
  })

  it('does not call the viewbox setter when inner is missing', () => {
    const canvas = createCanvas(null)

    fitDiagram(canvas)

    expect(canvas._setter).toHaveBeenCalledTimes(1)
  })

  it('does not call the viewbox setter when inner has zero dimensions', () => {
    const canvas = createCanvas({ x: 0, y: 0, width: 0, height: 0 })

    fitDiagram(canvas)

    expect(canvas._setter).toHaveBeenCalledTimes(1)
  })

  it('does not call the viewbox setter when outer has zero dimensions', () => {
    const canvas = createCanvas(
      { x: 0, y: 0, width: 100, height: 100 },
      { width: 0, height: 0 },
    )

    fitDiagram(canvas)

    expect(canvas._setter).toHaveBeenCalledTimes(1)
  })
})
