// Centre the diagram in the canvas with a relative pad on every side.
// Pad is computed against the diagram's own larger dimension so the visual
// margin stays proportional regardless of card size.
const DIAGRAM_PADDING_RATIO = 0.05

// Never enlarge a diagram beyond its native pixel size — image-viewer rule.
// Without this, a near-empty diagram (e.g. a single start event) balloons to
// fill the card and looks absurd.
const MAX_SCALE = 1

// canvas: bpmn-js Canvas service (typed loosely to mirror existing call-sites).
export function fitDiagram(canvas: any, ratio: number = DIAGRAM_PADDING_RATIO): void {
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

  // 2. If fitting would enlarge beyond MAX_SCALE, clamp at native and centre
  // on the diagram's bbox centre.
  const fitScale = Math.min(outer.width / width, outer.height / height)
  if (fitScale > MAX_SCALE) {
    const cx = inner.x + inner.width / 2
    const cy = inner.y + inner.height / 2
    canvas.viewbox({
      x: cx - outer.width / (2 * MAX_SCALE),
      y: cy - outer.height / (2 * MAX_SCALE),
      width: outer.width / MAX_SCALE,
      height: outer.height / MAX_SCALE,
    })
    return
  }

  // 3. Expand the slacker axis so the box matches the outer aspect ratio.
  // bpmn-js fits with min-scale and anchors the box's top-left at the canvas
  // origin, which would otherwise leave the slack on one side only.
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
