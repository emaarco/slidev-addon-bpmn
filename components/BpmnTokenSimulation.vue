<template>
  <div :style="{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: props.width, height: containerHeight }">
    <p v-if="loading">Loading BPMN diagram...</p>
    <p v-if="error" class="text-red-500">{{ error }}</p>
    <div ref="containerRef" class="bpmn-token-simulation-container" :style="{
    width: `calc(100% - ${margin * 2}px)`,
    height: `calc(100% - ${margin * 2}px)`,
    margin: `${margin}px`,
  }"
    ></div>

    <ToolbarButton
      v-if="props.fullscreen && !loading && !error"
      title="Open in fullscreen"
      label="Expand"
      :position="{ top: '20px', right: '20px', zIndex: 10 }"
      @click="openFullscreen"
    >
      <template #icon>
        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 3 21 3 21 9"/>
          <polyline points="9 21 3 21 3 15"/>
          <line x1="21" y1="3" x2="14" y2="10"/>
          <line x1="3" y1="21" x2="10" y2="14"/>
        </svg>
      </template>
    </ToolbarButton>

    <Teleport to="body">
      <div
        v-if="isFullscreen"
        :style="{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9999,
          background: 'white',
          display: 'flex',
        }"
        @keydown.stop
      >
        <div :style="{ flex: 1, height: '100%', position: 'relative' }">
          <div ref="fullscreenContainerRef" :style="{ width: '100%', height: '100%' }"></div>

          <ToolbarButton
            title="Close fullscreen"
            label="Close"
            :position="{ top: '16px', right: '16px', zIndex: 10000 }"
            @click="closeFullscreen"
          >
            <template #icon>
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </template>
          </ToolbarButton>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">

import { type Ref, nextTick, onMounted, onUnmounted, ref } from 'vue'
import BpmnViewer from 'bpmn-js/lib/Viewer'
import 'bpmn-js/dist/assets/bpmn-js.css'
import tokenSimulation from 'bpmn-js-token-simulation/lib/viewer'
import { onSlideEnter } from '@slidev/client'
import 'bpmn-js-token-simulation/assets/css/bpmn-js-token-simulation.css'
import { useBpmn } from '../composables/useBpmn'
import { fitDiagram } from '../shared/lib/fitDiagram'
import ToolbarButton from '../shared/ui/ToolbarButton.vue'

const margin = 5
const containerWaitTimeout = 5000

const { loading, error, fetchBpmnXml, withLoading } = useBpmn()
const containerRef = ref<HTMLDivElement | null>(null)
const fullscreenContainerRef = ref<HTMLDivElement | null>(null)
const isRendered = ref(false)
const isFullscreen = ref(false)
const currentXml = ref<string | null>(null)
let viewer: InstanceType<typeof BpmnViewer> | null = null
let fullscreenViewer: InstanceType<typeof BpmnViewer> | null = null
let resizeObserver: ResizeObserver | null = null

// Toggle pill (.bts-toggle-mode) ships at a fixed pixel size; on small panes it dominates
// the diagram. Scale linearly toward this reference width, never grow past native size.
const toggleScaleReferenceWidth = 600
const toggleScaleFloor = 0.5

const props = withDefaults(defineProps<{
  bpmnFilePath: string
  width?: string
  height?: string
  fullscreen?: boolean
  maxScale?: number
}>(), {
  width: '100%',
  height: 'auto',
  fullscreen: true,
})

const containerHeight = props.height === 'auto' ? '500px' : props.height

// User-overridable enlarge cap for fitDiagram; undefined → fitDiagram's default.
function resolveMaxScale(): number | undefined {
  const n = Number(props.maxScale)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/**
 * Polls for container dimensions to be ready before rendering.
 * Returns false (not throwing) when dimensions never arrive — this is the normal
 * state for Slidev-preloaded but hidden slides; onSlideEnter retries when visible.
 */
async function waitForContainer(target: Ref<HTMLDivElement | null>): Promise<boolean> {
  return new Promise((resolve) => {
    const start = Date.now()
    const checkDimensions = () => {
      if (target.value && target.value.clientWidth > 0 && target.value.clientHeight > 0) {
        resolve(true)
      } else if (Date.now() - start > containerWaitTimeout) {
        resolve(false)
      } else {
        requestAnimationFrame(checkDimensions)
      }
    }
    checkDimensions()
  })
}

/**
 * Renders the BPMN diagram with token simulation.
 * Includes duplicate prevention since Slidev calls both onMounted and onSlideEnter.
 */
async function renderBpmn() {

  if (isRendered.value) return
  isRendered.value = true

  const ready = await waitForContainer(containerRef)
  if (!ready) {
    // Slide is still hidden (preload). Reset the guard so onSlideEnter can retry.
    isRendered.value = false
    return
  }

  const result = await withLoading(async () => {
    if (!currentXml.value) {
      currentXml.value = await fetchBpmnXml(props.bpmnFilePath)
    }

    viewer = createSimulationViewer(containerRef.value!)
    await viewer.importXML(currentXml.value!)

    const canvas = viewer.get('canvas') as any
    canvas.resized()
    fitDiagram(canvas, undefined, resolveMaxScale())

    observeContainerForToggleScale()
  })

  if (result === undefined && error.value) {
    isRendered.value = false
  }
}

function createSimulationViewer(container: HTMLDivElement): InstanceType<typeof BpmnViewer> {
  const disableSnackbarModule = {notifications: ['value', {showNotification: () => {}}]}
  return new BpmnViewer({
    container,
    additionalModules: [tokenSimulation, disableSnackbarModule],
  })
}

async function openFullscreen() {
  if (!currentXml.value) return
  isFullscreen.value = true
  await nextTick()
  await waitForContainer(fullscreenContainerRef)

  fullscreenViewer = createSimulationViewer(fullscreenContainerRef.value!)
  await fullscreenViewer.importXML(currentXml.value)
  const canvas = fullscreenViewer.get('canvas') as any
  canvas.resized()
  fitDiagram(canvas, undefined, resolveMaxScale())
}

function closeFullscreen() {
  fullscreenViewer?.destroy()
  fullscreenViewer = null
  isFullscreen.value = false
}

defineExpose({ openFullscreen, closeFullscreen })

function observeContainerForToggleScale() {
  if (!containerRef.value) return
  const target = containerRef.value
  const apply = (width: number) => {
    const scale = Math.max(toggleScaleFloor, Math.min(1, width / toggleScaleReferenceWidth))
    target.style.setProperty('--bts-toggle-scale', String(scale))
  }
  apply(target.clientWidth)
  if (typeof ResizeObserver === 'undefined') return
  let lastW = 0
  let lastH = 0
  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      apply(entry.contentRect.width)
      const w = Math.round(entry.contentRect.width)
      const h = Math.round(entry.contentRect.height)
      if (w > 0 && h > 0 && (w !== lastW || h !== lastH)) {
        lastW = w
        lastH = h
        refitDiagram()
      }
    }
  })
  resizeObserver.observe(target)
}

function refitDiagram() {
  if (!viewer) return
  const canvas = viewer.get('canvas') as any
  canvas.resized()
  fitDiagram(canvas, undefined, resolveMaxScale())
}

/**
 * Render on the component mount for PDF export compatibility.
 * In headless export mode, onSlideEnter doesn't fire.
 */
onMounted(async () => {
  await nextTick()
  await renderBpmn()
})

/**
 * Render when the slide becomes active in a live preview.
 * Container dimensions are only valid when the slide is visible.
 */
onSlideEnter(async () => {
  await renderBpmn()
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  viewer?.destroy()
  viewer = null
  fullscreenViewer?.destroy()
  fullscreenViewer = null
})

</script>

<style scoped>
.bpmn-token-simulation-container :deep(.bts-toggle-mode),
.bpmn-token-simulation-container :deep(.bts-palette),
.bpmn-token-simulation-container :deep(.bts-scopes) {
  transform: scale(var(--bts-toggle-scale, 1));
  transform-origin: top left;
}

/* Trim the toggle pill down from its 16px default — smaller and less dominant,
   but still clearly larger than the 11px chrome buttons. Its icon is height:1em,
   so font-size drives the whole pill; composes with the --bts-toggle-scale above. */
.bpmn-token-simulation-container :deep(.bts-toggle-mode) {
  font-size: 13px;
}

/* Bottom-centred speed selector: keep upstream's translate(-50%, 0) and compose
   with scale anchored to the element's bottom-centre so centring is preserved. */
.bpmn-token-simulation-container :deep(.bts-set-animation-speed) {
  transform: translate(-50%, 0) scale(var(--bts-toggle-scale, 1));
  transform-origin: 50% 100%;
}

/* bpmn-js watermark anchored bottom-right; scale alongside the simulation chrome. */
.bpmn-token-simulation-container :deep(.bjs-powered-by) {
  transform: scale(var(--bts-toggle-scale, 1));
  transform-origin: bottom right;
}
</style>
