import { BpmnLiveViewer } from './BpmnLiveViewer'

// The simulation toggle pill ships at a fixed pixel size and dominates small panes:
// scale it linearly toward this reference width, never past its native size.
const TOGGLE_SCALE_REFERENCE_WIDTH = 600
const TOGGLE_SCALE_FLOOR = 0.5

export class BpmnSimulationViewer extends BpmnLiveViewer {
  override fit(): void {
    super.fit()
    const scale = Math.max(TOGGLE_SCALE_FLOOR, Math.min(1, this.container.clientWidth / TOGGLE_SCALE_REFERENCE_WIDTH))
    this.container.style.setProperty('--bts-toggle-scale', String(scale))
  }
}
