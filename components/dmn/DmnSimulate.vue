<template>
  <div class="dmn-simulate-host" :style="{ width: props.width }">
    <!-- When fullscreen, teleport the whole component (form + dmn-js viewer +
         result) out to <body> so `position: fixed` is relative to the viewport,
         not the CSS-transform-scaled Slidev slide. Teleport relocates the existing
         DOM nodes, so the dmn-js viewer instance stays intact — no re-render. -->
    <Teleport to="body" :disabled="!isFullscreen">
      <div class="dmn-simulate" :class="{ 'dmn-simulate--fullscreen': isFullscreen }">
        <p v-if="loading">Loading DMN decision table...</p>
        <p v-else-if="error" class="text-red-500">{{ error }}</p>

        <form v-if="simulation" class="sim-inputs" @submit.prevent="runSimulation">
          <div v-for="(input, i) in simulation.inputs" :key="input.id" class="sim-field">
            <label>{{ input.label }}</label>
            <select v-if="input.options.length" v-model="values[i]">
              <option value="">–</option>
              <option v-for="option in input.options" :key="option" :value="option">{{ option }}</option>
            </select>
            <input
              v-else
              v-model="values[i]"
              :type="isNumericType(input.typeRef) ? 'number' : 'text'"
              :placeholder="input.typeRef"
            />
          </div>
          <button
            type="submit"
            class="sim-run"
            :disabled="!isComplete"
            :title="isComplete ? 'Run the simulation' : 'Fill in every input first'"
          >Simulate</button>
          <button type="button" class="sim-reset" @click="reset">Reset</button>
          <button
            type="button"
            class="sim-fullscreen"
            :title="isFullscreen ? 'Exit fullscreen' : 'Show fullscreen'"
            @click="toggleFullscreen"
          >
            <svg v-if="isFullscreen" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>
            </svg>
            {{ isFullscreen ? 'Exit' : 'Fullscreen' }}
          </button>
        </form>

        <div
          ref="containerRef"
          class="dmn-table-wrapper"
          :class="{ 'hide-annotations': !props.showAnnotations, 'hide-drd-button': !props.showDrdButton }"
          :style="wrapperStyle"
        ></div>

        <div
          v-if="result"
          class="sim-result"
          :class="{ 'sim-result--miss': !result.matchedRuleIndices.length, 'sim-result--warn': !!result.violation }"
        >
          <span class="sim-arrow">→</span>

          <!-- COLLECT with an aggregation collapses to a single scalar -->
          <span v-if="result.aggregation" class="sim-output">
            {{ result.aggregation.fn }}({{ result.aggregation.output }}) =
            <strong>{{ result.aggregation.value }}</strong>
          </span>

          <!-- One pill per reported output row (list policies show several) -->
          <template v-else-if="result.outputs.length">
            <span v-for="(output, oi) in result.outputs" :key="oi" class="sim-output">
              <template v-for="(value, key) in output" :key="key">
                {{ key }} = <strong>{{ formatValue(value) }}</strong>
              </template>
            </span>
          </template>

          <span v-else class="sim-none">no matching rule</span>

          <span v-if="result.violation" class="sim-violation">⚠ {{ result.violation }}</span>

          <span v-if="result.reportedRuleIndices.length" class="sim-rule">
            {{ result.reportedRuleIndices.length > 1 ? 'Rules' : 'Rule' }}
            {{ result.reportedRuleIndices.map(i => i + 1).join(', ') }}
          </span>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { type CSSProperties, computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import '../../src/dmn/dmn.css'
import { onSlideEnter } from '@slidev/client'
import { type EvaluationResult, type RawValue, isNumericType } from '@emaarco/dmn-js-simulation'
import { DecisionSimulation } from '../../src/dmn/DecisionSimulation'
import { DecisionTableNotation } from '../../src/dmn/DecisionTableNotation'
import { RuleHighlighter } from '../../src/dmn/RuleHighlighter'
import { formatValue } from '../../src/dmn/utils/formatValue'
import { DiagramFileLoader } from '../../src/shared/lib/DiagramFileLoader'
import { EmbeddedViewer } from '../../src/shared/lib/EmbeddedViewer'

const props = withDefaults(defineProps<{
  dmnFilePath: string
  width?: string
  height?: string
  decisionId?: string
  fontSize?: string
  fullscreenFontSize?: string
  showAnnotations?: boolean
  showDrdButton?: boolean
}>(), {
  width: '100%',
  height: '340px',
  fontSize: '12px',
  fullscreenFontSize: '12px',
  showAnnotations: false,
  showDrdButton: false,
})

const fileLoader = new DiagramFileLoader('DMN')
const { loading, error } = fileLoader
const embeddedViewer = new EmbeddedViewer(new DecisionTableNotation(props.decisionId))
const containerRef = ref<HTMLDivElement | null>(null)
const simulation = shallowRef<DecisionSimulation | null>(null)
const values = ref<RawValue[]>([])
const result = ref<EvaluationResult | null>(null)
const isFullscreen = ref(false)
let ruleHighlighter: RuleHighlighter

const isComplete = computed(() => !!simulation.value?.isComplete(values.value))

// In fullscreen the table flexes to fill the viewport; in the slide it keeps the
// author-defined fixed height. Same dmn-js node either way — only the box changes.
const wrapperStyle = computed<CSSProperties>(() => {
  if (isFullscreen.value) {
    const base = { '--dmn-table-font-size': props.fullscreenFontSize } as CSSProperties
    return { ...base, flex: '1 1 auto', minHeight: '0', width: '100%', margin: '5px 0' }
  }
  const base = { '--dmn-table-font-size': props.fontSize } as CSSProperties
  return {
    ...base,
    width: `calc(${props.width} - ${5 * 2}px)`,
    height: props.height,
    margin: '5px',
  }
})

function toggleFullscreen(): void {
  isFullscreen.value = !isFullscreen.value
}

function closeFullscreenOnEscape(event: KeyboardEvent): void {
  if (event.key === 'Escape') isFullscreen.value = false
}

// Any input change invalidates the previous run, so the table never shows a
// stale match next to fresh inputs.
watch(values, () => {
  if (result.value) clearResult()
}, { deep: true })

async function render(): Promise<void> {
  await fileLoader.withLoading(async () => {
    const dmnXml = await fileLoader.fetchFile(props.dmnFilePath)
    if (!simulation.value) {
      simulation.value = new DecisionSimulation(dmnXml, props.decisionId)
      values.value = simulation.value.emptyValues()
    }
    await embeddedViewer.show(containerRef.value!, dmnXml)
  })
  if (error.value) simulation.value = null
}

function runSimulation(): void {
  if (!simulation.value || !isComplete.value) return
  const evaluation = simulation.value.evaluate(values.value)
  result.value = evaluation
  ruleHighlighter.highlight(evaluation.reportedRuleIndices, evaluation.matchedRuleIndices)
}

function reset(): void {
  if (simulation.value) values.value = simulation.value.emptyValues()
  clearResult()
}

function clearResult(): void {
  result.value = null
  ruleHighlighter.clear()
}

onMounted(() => {
  ruleHighlighter = new RuleHighlighter(containerRef.value!)
  window.addEventListener('keydown', closeFullscreenOnEscape)
  render()
})

onSlideEnter(render)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', closeFullscreenOnEscape)
  embeddedViewer.destroy()
})
</script>

<style>
.dmn-simulate {
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* Fullscreen overlay: teleported to <body>, so `fixed` is viewport-relative and
   escapes the scaled Slidev slide. The table wrapper flexes to fill the space. */
.dmn-simulate.dmn-simulate--fullscreen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  width: 100vw;
  height: 100vh;
  padding: 20px 28px;
  box-sizing: border-box;
  background: white;
  overflow: hidden;
}

/* --- Simulation input form --- */
.dmn-simulate .sim-inputs {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
  padding: 8px 5px;
}

.dmn-simulate .sim-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.dmn-simulate .sim-field label {
  font-size: 11px;
  font-weight: 600;
  color: #555;
}

.dmn-simulate .sim-field input,
.dmn-simulate .sim-field select {
  font-size: 13px;
  padding: 4px 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  min-width: 120px;
}

.dmn-simulate .sim-run,
.dmn-simulate .sim-reset,
.dmn-simulate .sim-fullscreen {
  font-size: 13px;
  padding: 5px 12px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid #ccc;
}

.dmn-simulate .sim-fullscreen {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: white;
  color: #555;
}

.dmn-simulate .sim-run {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
  font-weight: 600;
}

.dmn-simulate .sim-run:disabled {
  background: #cbd5e1;
  border-color: #cbd5e1;
  color: #eef2f7;
  cursor: not-allowed;
}

.dmn-simulate .sim-reset {
  background: white;
  color: #555;
}

/* --- Simulation result line --- */
.dmn-simulate .sim-result {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  padding: 8px 10px;
  margin: 5px;
  font-size: 14px;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 6px;
  color: #065f46;
}

.dmn-simulate .sim-result--miss {
  background: #fef2f2;
  border-color: #fecaca;
  color: #991b1b;
}

.dmn-simulate .sim-result--warn {
  background: #fffbeb;
  border-color: #fde68a;
  color: #92400e;
}

.dmn-simulate .sim-arrow {
  font-weight: 700;
}

/* Each reported output row as a pill — several appear for list policies. */
.dmn-simulate .sim-output {
  padding: 1px 6px;
  background: rgba(6, 95, 70, 0.08);
  border-radius: 4px;
}

.dmn-simulate .sim-violation {
  flex-basis: 100%;
  font-size: 12px;
  font-weight: 600;
}

.dmn-simulate .sim-rule {
  margin-left: auto;
  font-size: 12px;
  opacity: 0.75;
}

/* --- Highlight rows in the dmn-js table --- */
/* Reported rule(s): the actual result of the hit policy. */
.dmn-simulate .dmn-decision-table-container tbody tr.sim-match td {
  background: #fef9c3 !important;
  box-shadow: inset 0 0 0 9999px rgba(250, 204, 21, 0.18);
}

/* Candidate rule(s): matched, but dropped by the policy (e.g. FIRST/PRIORITY). */
.dmn-simulate .dmn-decision-table-container tbody tr.sim-candidate td {
  background: #f1f5f9 !important;
  box-shadow: inset 0 0 0 9999px rgba(148, 163, 184, 0.14);
}

/* --- Table styling: overrides of src/dmn/decisionTable.css --- */
.dmn-simulate .dmn-table-wrapper .dmn-decision-table-container .decision-table-name {
  font-size: calc(var(--dmn-table-font-size, 12px) * 1.25) !important;
}

/* dmn-js pins the header labels' margin to fixed px; express it in `em` to keep
   the header row height proportional to the font. */
.dmn-simulate .dmn-table-wrapper .dmn-decision-table-container thead .input-label,
.dmn-simulate .dmn-table-wrapper .dmn-decision-table-container thead .input-expression,
.dmn-simulate .dmn-table-wrapper .dmn-decision-table-container thead .output-label,
.dmn-simulate .dmn-table-wrapper .dmn-decision-table-container thead .output-name {
  font-size: calc(var(--dmn-table-font-size, 12px) * 1) !important;
  margin: 1em 0.4em !important;
}

/* --- Pin the bpmn.io watermark to a consistent spot ---
   dmn-js anchors its (license-required) logo to the decision-table container,
   whose height tracks the row count — so the logo floats below short tables but
   overlaps the last row of tall ones. Re-anchor it to the fixed-height wrapper
   so it always sits in the same bottom-right corner. The logo stays fully
   visible and clickable, as the bpmn.io license requires. */
.dmn-simulate .dmn-table-wrapper {
  position: relative;
}

.dmn-simulate .dmn-table-wrapper .dmn-js-parent,
.dmn-simulate .dmn-table-wrapper .dmn-decision-table-container,
.dmn-simulate .dmn-table-wrapper .tjs-container {
  position: static !important;
}

.dmn-simulate .dmn-table-wrapper .bjs-powered-by {
  bottom: 6px !important;
  right: 8px !important;
}

/* --- Fullscreen: give the rows room to breathe ---
   With the larger fullscreen font, tighter cell padding would leave the rows
   cramped and pile up whitespace below the table. Roomier vertical padding makes
   each row taller so the table reads well from the back of a room and fills more
   of the viewport. Must come after the `padding: 2px` rule to win on source order. */
.dmn-simulate--fullscreen .dmn-table-wrapper th:not(:first-child),
.dmn-simulate--fullscreen .dmn-table-wrapper td:not(:first-child) {
  padding: 10px 8px !important;
}
</style>
