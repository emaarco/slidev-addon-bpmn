import DmnViewer from 'dmn-js/lib/Viewer'
import type { LiveViewer } from '../shared/lib/notation'

export class DecisionTableViewer implements LiveViewer {
  private readonly viewer: any

  constructor(container: HTMLElement, private readonly decisionId?: string) {
    this.viewer = new DmnViewer({ container })
  }

  async show(source: string): Promise<void> {
    await this.viewer.importXML(source)
    const tableView = this.viewer.getViews().find((view: any) =>
      view.type === 'decisionTable' && (!this.decisionId || view.element?.id === this.decisionId))
    if (!tableView) {
      throw new Error('No decision table view found in DMN file')
    }
    await this.viewer.open(tableView)
  }

  destroy(): void {
    this.viewer.destroy()
  }
}
