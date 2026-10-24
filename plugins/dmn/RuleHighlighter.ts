/**
 * Marks rules in a rendered dmn-js decision table. Rows render in document order,
 * so rule index N is the Nth `<tbody>` row. Reported rules get `sim-match`; rules
 * that matched but were dropped by the hit policy get `sim-candidate`.
 */
export class RuleHighlighter {
  constructor(private readonly container: HTMLElement) {}

  highlight(reportedRules: number[], matchedRules: number[]): void {
    const rows = this.rows()
    rows.forEach((row, index) => {
      row.classList.toggle('sim-match', reportedRules.includes(index))
      row.classList.toggle('sim-candidate', matchedRules.includes(index) && !reportedRules.includes(index))
    })

    const focusIndex = reportedRules[0] ?? matchedRules[0]
    if (focusIndex !== undefined) this.scrollIntoTable(rows[focusIndex])
  }

  clear(): void {
    this.highlight([], [])
  }

  private rows(): HTMLElement[] {
    return [...this.container.querySelectorAll<HTMLElement>('.dmn-decision-table-container tbody tr')]
  }

  // The table scrolls internally when it is taller than the slide allows; scroll
  // its own container (never the page) so the focused rule is visible.
  private scrollIntoTable(row: HTMLElement | undefined): void {
    const scroller = this.container.querySelector<HTMLElement>('.tjs-table-container')
    if (!row || !scroller) return

    const rowRect = row.getBoundingClientRect()
    const scrollRect = scroller.getBoundingClientRect()
    if (rowRect.top < scrollRect.top || rowRect.bottom > scrollRect.bottom) {
      scroller.scrollTop += (rowRect.top - scrollRect.top) - (scrollRect.height - rowRect.height) / 2
    }
  }
}
