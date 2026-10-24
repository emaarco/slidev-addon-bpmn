import { describe, it, expect, beforeEach } from 'vitest'
import { RuleHighlighter } from '../../../src/dmn/RuleHighlighter'

const ROW_HEIGHT = 20
const SCROLLER_HEIGHT = 40

let container: HTMLDivElement
let scroller: HTMLDivElement

function buildDecisionTable(ruleCount: number): void {
  container = document.createElement('div')
  container.innerHTML = `
    <div class="tjs-table-container">
      <div class="dmn-decision-table-container">
        <table>
          <thead><tr><th>Season</th></tr></thead>
          <tbody>${'<tr><td>rule</td></tr>'.repeat(ruleCount)}</tbody>
        </table>
      </div>
    </div>`
  scroller = container.querySelector('.tjs-table-container')!
  stubLayout()
}

function stubRect(element: Element, top: number, height: number): void {
  element.getBoundingClientRect = () => ({ top, bottom: top + height, height } as DOMRect)
}

// Rows stack below each other and move up as the scroller scrolls.
function stubLayout(): void {
  stubRect(scroller, 0, SCROLLER_HEIGHT)
  ruleRows().forEach((row, index) => {
    row.getBoundingClientRect = () => {
      const top = index * ROW_HEIGHT - scroller.scrollTop
      return { top, bottom: top + ROW_HEIGHT, height: ROW_HEIGHT } as DOMRect
    }
  })
}

function ruleRows(): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('tbody tr')]
}

function rowClasses(): string[][] {
  return ruleRows().map(row => [...row.classList])
}

describe('RuleHighlighter', () => {
  beforeEach(() => buildDecisionTable(4))

  it('marks reported rules as matches', () => {
    new RuleHighlighter(container).highlight([1], [1])

    expect(rowClasses()).toEqual([[], ['sim-match'], [], []])
  })

  it('marks matched but unreported rules as candidates', () => {
    new RuleHighlighter(container).highlight([0], [0, 2, 3])

    expect(rowClasses()).toEqual([['sim-match'], [], ['sim-candidate'], ['sim-candidate']])
  })

  it('never touches the header row', () => {
    new RuleHighlighter(container).highlight([0], [0])

    expect(container.querySelector('thead tr')!.classList).toHaveLength(0)
  })

  it('replaces the marks of a previous run', () => {
    const highlighter = new RuleHighlighter(container)
    highlighter.highlight([0], [0, 1])
    highlighter.highlight([3], [3])

    expect(rowClasses()).toEqual([[], [], [], ['sim-match']])
  })

  it('clears every mark', () => {
    const highlighter = new RuleHighlighter(container)
    highlighter.highlight([0], [0, 1])
    highlighter.clear()

    expect(rowClasses()).toEqual([[], [], [], []])
  })

  it('scrolls the table container to centre a reported rule below the visible area', () => {
    new RuleHighlighter(container).highlight([3], [3])

    expect(scroller.scrollTop).toBe(3 * ROW_HEIGHT - (SCROLLER_HEIGHT - ROW_HEIGHT) / 2)
  })

  it('scrolls to the first candidate when no rule was reported', () => {
    new RuleHighlighter(container).highlight([], [2, 3])

    expect(scroller.scrollTop).toBe(2 * ROW_HEIGHT - (SCROLLER_HEIGHT - ROW_HEIGHT) / 2)
  })

  it('does not scroll when the focused rule is already visible', () => {
    new RuleHighlighter(container).highlight([1], [1])

    expect(scroller.scrollTop).toBe(0)
  })

  it('does not scroll when nothing matched', () => {
    scroller.scrollTop = 30
    new RuleHighlighter(container).highlight([], [])

    expect(scroller.scrollTop).toBe(30)
  })

  it('tolerates a table without its own scroll container', () => {
    container.innerHTML = '<div class="dmn-decision-table-container"><table><tbody><tr><td></td></tr></tbody></table></div>'

    new RuleHighlighter(container).highlight([0], [0])

    expect(container.querySelector('tr')!.classList).toContain('sim-match')
  })

  it('ignores rule indices without a rendered row', () => {
    expect(() => new RuleHighlighter(container).highlight([9], [9])).not.toThrow()
    expect(rowClasses()).toEqual([[], [], [], []])
  })
})
