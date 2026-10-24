export function parseMaxScale(maxScale: unknown): number | undefined {
  const scale = Number(maxScale)
  return Number.isFinite(scale) && scale > 0 ? scale : undefined
}
