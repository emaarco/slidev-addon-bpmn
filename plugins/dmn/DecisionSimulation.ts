import {
  type DecisionModel,
  type EvaluationResult,
  type RawValue,
  evaluateDecision,
  parseDecisionModelFromXml,
} from '@emaarco/dmn-js-simulation'

export class DecisionSimulation {
  private readonly model: DecisionModel

  constructor(dmnXml: string, decisionId?: string) {
    this.model = parseDecisionModelFromXml(dmnXml, decisionId)
  }

  get inputs(): DecisionModel['inputs'] {
    return this.model.inputs
  }

  emptyValues(): RawValue[] {
    return this.model.inputs.map(() => '')
  }

  // An incomplete input set can never match a concrete rule.
  isComplete(values: RawValue[]): boolean {
    return this.model.inputs.length > 0
      && values.length === this.model.inputs.length
      && values.every(value => value !== '' && value !== null && value !== undefined)
  }

  evaluate(values: RawValue[]): EvaluationResult {
    return evaluateDecision(this.model, values)
  }
}
