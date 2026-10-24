import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils'

enableAutoUnmount(afterEach)

const { MockDmnViewer, viewer, slideEnterCallbacks } = vi.hoisted(() => ({
  MockDmnViewer: vi.fn(),
  viewer: {
    importXML: vi.fn(),
    getViews: vi.fn(),
    open: vi.fn(),
    destroy: vi.fn(),
  },
  slideEnterCallbacks: [] as Array<() => Promise<void> | void>,
}))

vi.mock('dmn-js/lib/Viewer', () => ({ default: MockDmnViewer }))
vi.mock('@slidev/client', () => ({
  onSlideEnter: (callback: () => void) => { slideEnterCallbacks.push(callback) },
}))

import DmnSimulate from '../../../components/dmn/DmnSimulate.vue'

const exampleXml = readFileSync(resolve(process.cwd(), 'public/example.dmn'), 'utf-8')
const TABLE_VIEW = { type: 'decisionTable', element: { id: 'Decision_Dish' } }
const EXAMPLE_RULE_COUNT = 3

function mockFetch(xml = exampleXml) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(xml) })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function mockFetchFailure() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
}

// Stands in for the rows dmn-js renders when it opens a decision table.
function renderFakeDecisionTable(container: HTMLElement) {
  container.innerHTML = `
    <div class="tjs-table-container">
      <div class="dmn-decision-table-container">
        <table><tbody>${'<tr><td></td></tr>'.repeat(EXAMPLE_RULE_COUNT)}</tbody></table>
      </div>
    </div>`
}

function giveTableSize(wrapper: VueWrapper) {
  const element = wrapper.find('div.dmn-table-wrapper').element
  Object.defineProperty(element, 'clientWidth', { value: 800, configurable: true })
  Object.defineProperty(element, 'clientHeight', { value: 400, configurable: true })
}

function mountSimulate(props: Record<string, unknown> = {}) {
  const wrapper = mount(DmnSimulate, { props: { dmnFilePath: 'example.dmn', ...props } })
  giveTableSize(wrapper)
  return wrapper
}

// Drains the requestAnimationFrame polyfill (setTimeout 0) and the promise queue.
async function settle() {
  for (let i = 0; i < 4; i++) {
    await new Promise(resolve => setTimeout(resolve, 0))
    await flushPromises()
  }
}

async function enterSlide() {
  await slideEnterCallbacks.at(-1)!()
  await settle()
}

async function fillInputs(wrapper: VueWrapper, season: string, guests: string) {
  await wrapper.find('.sim-field select').setValue(season)
  await wrapper.find('.sim-field input[type="number"]').setValue(guests)
}

async function simulate(wrapper: VueWrapper, season: string, guests: string) {
  await fillInputs(wrapper, season, guests)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

function ruleRowClasses(wrapper: VueWrapper): string[][] {
  return wrapper.findAll('tbody tr').map(row => row.classes())
}

function fullscreenOverlay() {
  return document.body.querySelector('.dmn-simulate--fullscreen')
}

describe('DmnSimulate.vue', () => {
  beforeEach(() => {
    slideEnterCallbacks.length = 0
    viewer.importXML.mockResolvedValue(undefined)
    viewer.getViews.mockReturnValue([TABLE_VIEW])
    MockDmnViewer.mockImplementation(function ({ container }: { container: HTMLElement }) {
      viewer.open.mockImplementation(async () => renderFakeDecisionTable(container))
      return viewer
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('shows a loading state while the file is fetched', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
    const wrapper = mountSimulate()

    expect(wrapper.text()).toContain('Loading DMN decision table...')
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('renders the decision table into the table wrapper', async () => {
    mockFetch()
    const wrapper = mountSimulate()
    await settle()

    expect(MockDmnViewer).toHaveBeenCalledWith({ container: wrapper.find('div.dmn-table-wrapper').element })
    expect(viewer.importXML).toHaveBeenCalledWith(exampleXml)
    expect(viewer.open).toHaveBeenCalledWith(TABLE_VIEW)
    expect(wrapper.findAll('tbody tr')).toHaveLength(EXAMPLE_RULE_COUNT)
  })

  it('derives one input control per decision-table input from the parsed model', async () => {
    mockFetch()
    const wrapper = mountSimulate()
    await settle()

    expect(wrapper.findAll('.sim-field label').map(label => label.text())).toEqual(['Season', 'Number of Guests'])
    const options = wrapper.find('.sim-field select').findAll('option').map(option => option.text())
    expect(options).toEqual(['–', 'Fall', 'Winter', 'Spring'])
    expect(wrapper.find('.sim-field input[type="number"]').attributes('placeholder')).toBe('integer')
  })

  it('keeps Simulate disabled until every input has a value', async () => {
    mockFetch()
    const wrapper = mountSimulate()
    await settle()
    const button = wrapper.find('button.sim-run')

    expect(button.attributes('disabled')).toBeDefined()
    await wrapper.find('.sim-field select').setValue('Fall')
    expect(button.attributes('disabled')).toBeDefined()
    await wrapper.find('.sim-field input[type="number"]').setValue('8')
    expect(button.attributes('disabled')).toBeUndefined()
  })

  it('does not evaluate an incomplete form', async () => {
    mockFetch()
    const wrapper = mountSimulate()
    await settle()

    await wrapper.find('.sim-field select').setValue('Fall')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.find('.sim-result').exists()).toBe(false)
  })

  it('evaluates the decision and shows the matched output', async () => {
    mockFetch()
    const wrapper = mountSimulate()
    await settle()

    await simulate(wrapper, 'Fall', '8')

    const result = wrapper.find('.sim-result')
    expect(result.text()).toContain('Dish = Spareribs')
    expect(result.text()).toContain('Rule 1')
    expect(result.classes()).not.toContain('sim-result--miss')
  })

  it('highlights the reported rule in the table', async () => {
    mockFetch()
    const wrapper = mountSimulate()
    await settle()

    await simulate(wrapper, 'Spring', '6')

    expect(ruleRowClasses(wrapper)).toEqual([[], [], ['sim-match']])
  })

  it('reports a miss when no rule matches', async () => {
    mockFetch()
    const wrapper = mountSimulate()
    await settle()

    await simulate(wrapper, 'Winter', '20')

    const result = wrapper.find('.sim-result')
    expect(result.classes()).toContain('sim-result--miss')
    expect(result.text()).toContain('no matching rule')
    expect(ruleRowClasses(wrapper)).toEqual([[], [], []])
  })

  it('clears a result as soon as an input changes', async () => {
    mockFetch()
    const wrapper = mountSimulate()
    await settle()
    await simulate(wrapper, 'Fall', '8')

    await wrapper.find('.sim-field input[type="number"]').setValue('9')

    expect(wrapper.find('.sim-result').exists()).toBe(false)
    expect(ruleRowClasses(wrapper)).toEqual([[], [], []])
  })

  it('resets the inputs, the result and the highlighted rules', async () => {
    mockFetch()
    const wrapper = mountSimulate()
    await settle()
    await simulate(wrapper, 'Fall', '8')

    await wrapper.find('button.sim-reset').trigger('click')

    expect(wrapper.find('.sim-result').exists()).toBe(false)
    expect((wrapper.find('.sim-field select').element as HTMLSelectElement).value).toBe('')
    expect((wrapper.find('.sim-field input').element as HTMLInputElement).value).toBe('')
    expect(wrapper.find('button.sim-run').attributes('disabled')).toBeDefined()
    expect(ruleRowClasses(wrapper)).toEqual([[], [], []])
  })

  it('shows an error and no form when the decision table cannot be found', async () => {
    viewer.getViews.mockReturnValue([{ type: 'drd' }])
    mockFetch()
    const wrapper = mountSimulate()
    await settle()

    expect(wrapper.text()).toContain('Failed to load DMN')
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('shows an error when the file cannot be fetched', async () => {
    mockFetchFailure()
    const wrapper = mountSimulate()
    await settle()

    expect(wrapper.text()).toContain('Failed to load DMN')
  })

  it('retries after an error when the slide is entered again', async () => {
    mockFetchFailure()
    const wrapper = mountSimulate()
    await settle()

    mockFetch()
    await enterSlide()

    expect(wrapper.text()).not.toContain('Failed to load DMN')
    expect(wrapper.findAll('.sim-field')).toHaveLength(2)
    expect(viewer.open).toHaveBeenCalledWith(TABLE_VIEW)
  })

  it('does not fetch or render again when the slide is entered after mounting', async () => {
    const fetchMock = mockFetch()
    mountSimulate()
    await settle()

    await enterSlide()

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(MockDmnViewer).toHaveBeenCalledOnce()
  })

  it('fetches once when the slide is entered while the file is still loading', async () => {
    const fetchMock = mockFetch()
    mountSimulate()

    await enterSlide()

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(MockDmnViewer).toHaveBeenCalledOnce()
  })

  it('keeps the entered values when the slide is entered again', async () => {
    mockFetch()
    const wrapper = mountSimulate()
    await settle()
    await fillInputs(wrapper, 'Fall', '8')

    await enterSlide()

    expect((wrapper.find('.sim-field select').element as HTMLSelectElement).value).toBe('Fall')
    expect(wrapper.find('button.sim-run').attributes('disabled')).toBeUndefined()
  })

  it('applies the font size and height to the table wrapper', async () => {
    mockFetch()
    const wrapper = mountSimulate({ fontSize: '14px', height: '300px' })
    const element = wrapper.find('div.dmn-table-wrapper').element as HTMLElement

    expect(element.style.getPropertyValue('--dmn-table-font-size')).toBe('14px')
    expect(element.style.height).toBe('300px')
  })

  it('hides the "View DRD" button and annotations by default', () => {
    mockFetch()
    const classes = mountSimulate().find('div.dmn-table-wrapper').classes()

    expect(classes).toContain('hide-drd-button')
    expect(classes).toContain('hide-annotations')
  })

  it('keeps the "View DRD" button and annotations when enabled', () => {
    mockFetch()
    const classes = mountSimulate({ showDrdButton: true, showAnnotations: true }).find('div.dmn-table-wrapper').classes()

    expect(classes).not.toContain('hide-drd-button')
    expect(classes).not.toContain('hide-annotations')
  })

  it('moves the simulation to a fullscreen overlay and back', async () => {
    mockFetch()
    const wrapper = mountSimulate({ fullscreenFontSize: '20px' })
    await settle()

    await wrapper.find('button.sim-fullscreen').trigger('click')

    const overlay = fullscreenOverlay()!
    expect(overlay.parentElement).toBe(document.body)
    expect(overlay.querySelector<HTMLElement>('.dmn-table-wrapper')!.style.getPropertyValue('--dmn-table-font-size')).toBe('20px')
    expect(wrapper.find('.dmn-simulate').exists()).toBe(false)

    overlay.querySelector<HTMLButtonElement>('button.sim-fullscreen')!.click()
    await flushPromises()

    expect(fullscreenOverlay()).toBeNull()
    expect(wrapper.find('.dmn-simulate').exists()).toBe(true)
  })

  it('keeps the same viewer when switching to fullscreen', async () => {
    mockFetch()
    const wrapper = mountSimulate()
    await settle()

    await wrapper.find('button.sim-fullscreen').trigger('click')
    await settle()

    expect(MockDmnViewer).toHaveBeenCalledOnce()
    expect(fullscreenOverlay()!.querySelectorAll('tbody tr')).toHaveLength(EXAMPLE_RULE_COUNT)
  })

  it('leaves fullscreen on Escape', async () => {
    mockFetch()
    const wrapper = mountSimulate()
    await settle()
    await wrapper.find('button.sim-fullscreen').trigger('click')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()

    expect(fullscreenOverlay()).toBeNull()
  })

  it('ignores other keys while fullscreen', async () => {
    mockFetch()
    const wrapper = mountSimulate()
    await settle()
    await wrapper.find('button.sim-fullscreen').trigger('click')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    await flushPromises()

    expect(fullscreenOverlay()).not.toBeNull()
  })

  it('destroys the viewer and stops listening for Escape on unmount', async () => {
    mockFetch()
    const removeListener = vi.spyOn(window, 'removeEventListener')
    const wrapper = mountSimulate()
    await settle()

    wrapper.unmount()

    expect(viewer.destroy).toHaveBeenCalledOnce()
    expect(removeListener).toHaveBeenCalledWith('keydown', expect.any(Function))
  })
})
