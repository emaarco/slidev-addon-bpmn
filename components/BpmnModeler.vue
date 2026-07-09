<template>
  <div :style="{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: props.width, height: containerHeight }">
    <p v-if="loading">Loading BPMN diagram...</p>
    <p v-if="error" class="text-red-500">{{ error }}</p>

    <div ref="viewerContainerRef" class="bpmn-modeler-container" :style="{
      width: `calc(100% - ${margin * 2}px)`,
      height: `calc(100% - ${margin * 2}px)`,
      margin: `${margin}px`,
    }"></div>

    <ToolbarButton
      v-if="!loading && !error"
      title="Open modeler"
      label="Edit"
      :position="{ top: '12px', right: '12px', zIndex: 10 }"
      @click="openFullscreen"
    >
      <template #icon>
        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
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
          <div ref="modelerContainerRef" :style="{ width: '100%', height: '100%' }"></div>

          <div :style="{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: '8px',
          }">
            <ToolbarButton
              title="Close modeler"
              label="Close"
              @click="closeFullscreen"
            >
              <template #icon>
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </template>
            </ToolbarButton>
            <ToolbarButton
              v-if="props.engine"
              :title="isPanelOpen ? 'Hide properties panel' : 'Show properties panel'"
              :label="isPanelOpen ? 'Hide panel' : 'Show panel'"
              @click="togglePanel"
            >
              <template #icon>
                <svg v-if="isPanelOpen" xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </template>
            </ToolbarButton>
          </div>
        </div>

        <div
          v-if="props.engine"
          v-show="isPanelOpen"
          ref="propertiesPanelRef"
          :style="{
            width: '350px',
            height: '100%',
            overflowY: 'auto',
            borderLeft: '1px solid #ccc',
            background: '#fafafa',
          }"
        ></div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">

import { type Ref, nextTick, onMounted, onUnmounted, ref } from 'vue'
import BpmnViewer from 'bpmn-js/lib/Viewer'
import BpmnModeler from 'bpmn-js/lib/Modeler'
import 'bpmn-js/dist/assets/bpmn-js.css'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css'
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css'
import { onSlideEnter } from '@slidev/client'
import { useBpmn } from '../composables/useBpmn'
import { zeebeEngine } from '../engines/zeebe'
import { camunda7Engine } from '../engines/camunda7'
import type { Engine } from '../engines/types'
import { fitDiagram } from '../internal/fitDiagram'
import ToolbarButton from '../internal/ToolbarButton.vue'

const margin = 5
const containerWaitTimeout = 5000

const { loading, error, fetchBpmnXml, withLoading } = useBpmn()
const viewerContainerRef = ref<HTMLDivElement | null>(null)
const modelerContainerRef = ref<HTMLDivElement | null>(null)
const propertiesPanelRef = ref<HTMLDivElement | null>(null)
const isRendered = ref(false)
const isFullscreen = ref(false)
const isPanelOpen = ref(true)
const currentXml = ref<string | null>(null)
let viewer: InstanceType<typeof BpmnViewer> | null = null
let modeler: InstanceType<typeof BpmnModeler> | null = null
let hasModelerChanges = false

const props = withDefaults(defineProps<{
  bpmnFilePath?: string
  width?: string
  height?: string
  engine?: Engine
  maxScale?: number
}>(), {
  width: '100%',
  height: '500px',
})

function resolveEngineConfig() {
  if (props.engine === 'zeebe') return zeebeEngine
  if (props.engine === 'camunda7') return camunda7Engine
  return null
}

const containerHeight = props.height

// User-overridable enlarge cap for fitDiagram; undefined → fitDiagram's default.
function resolveMaxScale(): number | undefined {
  const n = Number(props.maxScale)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

async function waitForContainer(containerRef: Ref<HTMLDivElement | null>): Promise<boolean> {
  return new Promise((resolve) => {
    const start = Date.now()
    const checkDimensions = () => {
      if (containerRef.value && containerRef.value.clientWidth > 0 && containerRef.value.clientHeight > 0) {
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

async function renderViewer(): Promise<boolean> {
  if (viewer) {
    viewer.destroy()
    viewer = null
  }

  const ready = await waitForContainer(viewerContainerRef)
  if (!ready) return false

  viewer = new BpmnViewer({ container: viewerContainerRef.value! })

  if (!currentXml.value) {
    if (props.bpmnFilePath) {
      currentXml.value = await fetchBpmnXml(props.bpmnFilePath)
    } else {
      const tempModeler = new BpmnModeler({ container: document.createElement('div') })
      await tempModeler.createDiagram()
      const { xml } = await tempModeler.saveXML({ format: true })
      tempModeler.destroy()
      if (xml) currentXml.value = xml
    }
  }

  if (currentXml.value) {
    await viewer.importXML(currentXml.value)
    const canvas = viewer.get('canvas') as any
    canvas.resized()
    fitDiagram(canvas, undefined, resolveMaxScale())
  }
  return true
}

async function renderBpmn() {
  if (isRendered.value) return
  isRendered.value = true

  const result = await withLoading(async () => {
    return renderViewer()
  })

  // result === false → container hidden (preload). Reset guard so onSlideEnter retries.
  // result === undefined → withLoading caught a real error.
  if (result === false || (result === undefined && error.value)) {
    isRendered.value = false
  }
}

async function openFullscreen() {
  if (!currentXml.value) return

  isFullscreen.value = true
  await nextTick()
  await waitForContainer(modelerContainerRef)

  hasModelerChanges = false

  const config = resolveEngineConfig()
  const options: any = { container: modelerContainerRef.value! }
  if (config) {
    options.propertiesPanel = { parent: propertiesPanelRef.value! }
    options.additionalModules = config.additionalModules
    options.moddleExtensions = config.moddleExtensions
  }
  modeler = new BpmnModeler(options)

  await modeler.importXML(currentXml.value!)

  const eventBus = modeler.get('eventBus') as any
  eventBus.on('commandStack.changed', () => { hasModelerChanges = true })
  const canvas = modeler.get('canvas') as any
  canvas.resized()
  fitDiagram(canvas, undefined, resolveMaxScale())

  if (props.engine === 'camunda7') {
    const transactionBoundaries = modeler.get('transactionBoundaries') as any
    transactionBoundaries.show()
  }
}

async function closeFullscreen() {
  if (modeler) {
    if (hasModelerChanges) {
      const { xml } = await modeler.saveXML({ format: true })
      if (xml) currentXml.value = xml
    }
    modeler.destroy()
    modeler = null
  }

  isFullscreen.value = false
  isPanelOpen.value = true

  if (hasModelerChanges) {
    await nextTick()
    await renderViewer()
  }
}

async function togglePanel() {
  isPanelOpen.value = !isPanelOpen.value
  await nextTick()
  if (modeler) {
    const canvas = modeler.get('canvas') as any
    canvas.resized()
  }
}

defineExpose({ openFullscreen, closeFullscreen, togglePanel })

onMounted(async () => {
  await nextTick()
  await renderBpmn()
})

onSlideEnter(async () => {
  await renderBpmn()
})

onUnmounted(() => {
  viewer?.destroy()
  viewer = null
  modeler?.destroy()
  modeler = null
})

</script>

<style scoped>
/* bpmn-js watermark anchored bottom-right; shrink so it stays subordinate in
   small tiles. The fullscreen overlay uses its own viewer instance and is not
   targeted by this scoped rule. */
.bpmn-modeler-container :deep(.bjs-powered-by) {
  transform: scale(0.7);
  transform-origin: bottom right;
}
</style>
