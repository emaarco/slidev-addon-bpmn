import type { LiveNotation, LiveViewer } from '../../shared/lib/notation'
import { DecisionTableViewer } from './DecisionTableViewer'

export class DecisionTableNotation implements LiveNotation {
  readonly kind = 'DMN'

  constructor(private readonly decisionId?: string) {}

  async createViewer(container: HTMLElement): Promise<LiveViewer> {
    return new DecisionTableViewer(container, this.decisionId)
  }
}
