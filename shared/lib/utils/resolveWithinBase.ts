export function resolveWithinBase(path: string): string {
  const base = import.meta.env.BASE_URL
  const pathWithinBase = path.startsWith(base) ? path.slice(base.length) : path.replace(/^\//, '')
  return new URL(pathWithinBase, window.location.origin + base).href
}
