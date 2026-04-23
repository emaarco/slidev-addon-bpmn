<template>
  <div :style="{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: props.width, height: containerHeight }">
    <p v-if="loading">Loading BPMN diagram...</p>
    <p v-if="error" class="text-red-500">{{ error }}</p>

    <div ref="viewerContainerRef" :style="{
      width: `calc(${props.width} - ${margin * 2}px)`,
      height: `calc(${containerHeight} - ${margin * 2}px)`,
      margin: `${margin}px`,
    }"></div>

    <button
      v-if="!loading && !error"
      :style="{
        position: 'absolute',
        top: '12px',
        right: '12px',
        zIndex: 10,
        cursor: 'pointer',
        background: 'white',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '6px 8px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '13px',
        color: '#333',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }"
      title="Open modeler"
      @click="openFullscreen"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
      Edit
    </button>

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
        <div ref="modelerContainerRef" :style="{ flex: 1, height: '100%' }"></div>
        <div
          v-if="props.engine"
          ref="propertiesPanelRef"
          :style="{
            width: '350px',
            height: '100%',
            overflowY: 'auto',
            borderLeft: '1px solid #ccc',
            background: '#fafafa',
          }"
        ></div>

        <button
          :style="{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 10000,
            cursor: 'pointer',
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '6px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '13px',
            color: '#333',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }"
          title="Close modeler"
          @click="closeFullscreen"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          Close
        </button>
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

const margin = 5
const containerWaitTimeout = 5000

const { loading, error, fetchBpmnXml, withLoading } = useBpmn()
const viewerContainerRef = ref<HTMLDivElement | null>(null)
const modelerContainerRef = ref<HTMLDivElement | null>(null)
const propertiesPanelRef = ref<HTMLDivElement | null>(null)
const isRendered = ref(false)
const isFullscreen = ref(false)
const currentXml = ref<string | null>(null)
let viewer: InstanceType<typeof BpmnViewer> | null = null
let modeler: InstanceType<typeof BpmnModeler> | null = null
let hasModelerChanges = false

const props = withDefaults(defineProps<{
  bpmnFilePath?: string
  width?: string
  height?: string
  engine?: Engine
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

async function waitForContainer(containerRef: Ref<HTMLDivElement | null>): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const checkDimensions = () => {
      if (containerRef.value && containerRef.value.clientWidth > 0 && containerRef.value.clientHeight > 0) {
        resolve()
      } else if (Date.now() - start > containerWaitTimeout) {
        reject(new Error('Container dimensions not available within timeout'))
      } else {
        requestAnimationFrame(checkDimensions)
      }
    }
    checkDimensions()
  })
}

async function renderViewer() {
  if (viewer) {
    viewer.destroy()
    viewer = null
  }

  await waitForContainer(viewerContainerRef)

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
    canvas.zoom('fit-viewport', 'auto')
    canvas.zoom(Math.min(canvas.zoom() * 0.92, 1), 'auto')
  }
}

async function renderBpmn() {
  if (isRendered.value) return
  isRendered.value = true

  const result = await withLoading(async () => {
    await renderViewer()
  })

  if (result === undefined && error.value) {
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
  canvas.zoom('fit-viewport', 'auto')
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

  if (hasModelerChanges) {
    await nextTick()
    await renderViewer()
  }
}

defineExpose({ openFullscreen, closeFullscreen })

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
