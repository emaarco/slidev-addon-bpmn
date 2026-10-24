import BpmnViewer from 'bpmn-js/lib/Viewer'
import type { LiveViewer } from '../shared/lib/notation'
import { fitDiagram } from '../shared/lib/utils/fitDiagram'

export class BpmnLiveViewer implements LiveViewer {
  private readonly viewer: InstanceType<typeof BpmnViewer>

  constructor(
    protected readonly container: HTMLElement,
    viewerOptions: Record<string, unknown>,
    private readonly maxScale?: number,
  ) {
    this.viewer = new BpmnViewer({ container, ...viewerOptions })
  }

  async show(source: string): Promise<void> {
    await this.viewer.importXML(source)
  }

  fit(): void {
    const canvas = this.viewer.get('canvas') as any
    canvas.resized()
    fitDiagram(canvas, undefined, this.maxScale)
  }

  destroy(): void {
    this.viewer.destroy()
  }
}
