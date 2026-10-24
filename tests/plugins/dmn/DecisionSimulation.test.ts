import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DecisionSimulation } from '../../../plugins/dmn/DecisionSimulation'

const readPublicFile = (path: string) => readFileSync(resolve(process.cwd(), 'public', path), 'utf-8')
const exampleXml = readPublicFile('example.dmn')
const firstHitPolicyXml = readPublicFile('hit-policies/first.dmn')

describe('DecisionSimulation', () => {
  it('exposes the decision-table inputs of the parsed model', () => {
    const simulation = new DecisionSimulation(exampleXml)

    expect(simulation.inputs.map(input => input.label)).toEqual(['Season', 'Number of Guests'])
    expect(simulation.inputs[0].options).toEqual(['Fall', 'Winter', 'Spring'])
    expect(simulation.inputs[1].typeRef).toBe('integer')
  })

  it('selects the decision by id', () => {
    const simulation = new DecisionSimulation(exampleXml, 'Decision_Dish')
    expect(simulation.inputs).toHaveLength(2)
  })

  it('throws for an unknown decision id', () => {
    expect(() => new DecisionSimulation(exampleXml, 'Unknown_Decision')).toThrow('Unknown_Decision')
  })

  it('starts with one empty value per input', () => {
    expect(new DecisionSimulation(exampleXml).emptyValues()).toEqual(['', ''])
  })

  it('is complete only when every input has a value', () => {
    const simulation = new DecisionSimulation(exampleXml)

    expect(simulation.isComplete(['', ''])).toBe(false)
    expect(simulation.isComplete(['Fall', ''])).toBe(false)
    expect(simulation.isComplete(['Fall', null as never])).toBe(false)
    expect(simulation.isComplete(['Fall', undefined as never])).toBe(false)
    expect(simulation.isComplete(['Fall'])).toBe(false)
    expect(simulation.isComplete(['Fall', 8])).toBe(true)
    expect(simulation.isComplete(['Fall', 0])).toBe(true)
  })

  it('evaluates the matching rule and its output', () => {
    const result = new DecisionSimulation(exampleXml).evaluate(['Fall', '8'])

    expect(result.matchedRuleIndices).toEqual([0])
    expect(result.reportedRuleIndices).toEqual([0])
    expect(result.outputs).toEqual([{ Dish: 'Spareribs' }])
  })

  it('reports no rule when nothing matches', () => {
    const result = new DecisionSimulation(exampleXml).evaluate(['Summer', 3])

    expect(result.matchedRuleIndices).toEqual([])
    expect(result.reportedRuleIndices).toEqual([])
    expect(result.outputs).toEqual([])
  })

  it('separates the reported rule from the other matches under the FIRST hit policy', () => {
    const result = new DecisionSimulation(firstHitPolicyXml).evaluate([600])

    expect(result.matchedRuleIndices).toEqual([0, 1, 2])
    expect(result.reportedRuleIndices).toEqual([0])
  })
})
