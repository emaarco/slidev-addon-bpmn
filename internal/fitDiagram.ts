// Centre the diagram with a pad on every side, proportional to its larger dimension.
const DIAGRAM_PADDING_RATIO = 0.05

// Default cap on how far a diagram may be enlarged past its native pixel size.
// Overridable per call (surfaced as a component prop) via fitDiagram's maxScale arg.
export const DEFAULT_MAX_SCALE = 2

// canvas: bpmn-js Canvas service (typed loosely to mirror existing call-sites).
export function fitDiagram(
  canvas: any,
  ratio: number = DIAGRAM_PADDING_RATIO,
  maxScale: number = DEFAULT_MAX_SCALE,
): void {
  const view = canvas.viewbox()
  const inner = view?.inner
  const outer = view?.outer
  if (!inner || !inner.width || !inner.height) return
  if (!outer || !outer.width || !outer.height) return

  // 1. Pad the inner bbox proportionally on every side.
  const pad = Math.max(inner.width, inner.height) * ratio
  let x = inner.x - pad
  let y = inner.y - pad
  let width = inner.width + pad * 2
  let height = inner.height + pad * 2

  // 2. If fitting would enlarge past maxScale, clamp there, centred on the bbox.
  const fitScale = Math.min(outer.width / width, outer.height / height)
  if (fitScale > maxScale) {
    const cx = inner.x + inner.width / 2
    const cy = inner.y + inner.height / 2
    canvas.viewbox({
      x: cx - outer.width / (2 * maxScale),
      y: cy - outer.height / (2 * maxScale),
      width: outer.width / maxScale,
      height: outer.height / maxScale,
    })
    return
  }

  // 3. Expand the slacker axis to the outer aspect (bpmn-js otherwise anchors slack top-left).
  const outerAspect = outer.width / outer.height
  const boxAspect = width / height
  if (boxAspect < outerAspect) {
    const newWidth = height * outerAspect
    x -= (newWidth - width) / 2
    width = newWidth
  } else if (boxAspect > outerAspect) {
    const newHeight = width / outerAspect
    y -= (newHeight - height) / 2
    height = newHeight
  }

  canvas.viewbox({ x, y, width, height })
}
