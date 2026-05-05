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
    // Inner is large enough that fitting does not trigger the MAX_SCALE clamp.
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

  it('clamps a tiny diagram at native scale and centres it (no enlargement past 1×)', () => {
    // A 36×36 start event in a 1500×500 card. Padded fit would scale ~12×;
    // we want the box to span the full outer (scale = 1) centred on the bbox.
    const canvas = createCanvas(
      { x: 100, y: 100, width: 36, height: 36 },
      { width: 1500, height: 500 },
    )

    fitDiagram(canvas)

    // bbox centre (118, 118) → box origin = (118 - 750, 118 - 250) = (-632, -132).
    // Box dims = outer dims (scale = 1).
    expect(canvas._setter).toHaveBeenLastCalledWith({
      x: -632,
      y: -132,
      width: 1500,
      height: 500,
    })
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
