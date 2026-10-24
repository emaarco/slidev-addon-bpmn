import { fitDiagram } from '../../../shared/lib/utils/fitDiagram'

const NATIVE_SIZE_SCALE = 1

export function fitActiveDrd(dmnJs: any): void {
  const canvas = dmnJs.getActiveViewer?.()?.get?.('canvas')
  if (!canvas) return
  canvas.resized()
  fitDiagram(canvas, undefined, NATIVE_SIZE_SCALE)
}
