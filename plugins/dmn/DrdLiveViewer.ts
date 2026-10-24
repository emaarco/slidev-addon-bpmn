import DmnViewer from 'dmn-js/lib/Viewer'
import type { LiveViewer } from '../../shared/lib/notation'
import { fitActiveDrd } from './utils/fitActiveDrd'

export class DrdLiveViewer implements LiveViewer {
  private readonly viewer: any

  constructor(container: HTMLElement) {
    this.viewer = new DmnViewer({ container })
  }

  async show(source: string): Promise<void> {
    await this.viewer.importXML(source)
    const drdView = this.viewer.getViews().find((view: any) => view.type === 'drd')
    if (drdView) await this.viewer.open(drdView)
  }

  fit(): void {
    fitActiveDrd(this.viewer)
  }

  destroy(): void {
    this.viewer.destroy()
  }
}
