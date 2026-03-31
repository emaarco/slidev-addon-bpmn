<template>
  <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: props.width, height: containerHeight }">
    <p v-if="loading">Loading BPMN diagram...</p>
    <p v-if="error" class="text-red-500">{{ error }}</p>
    <div ref="containerRef" :style="{
    width: `calc(${props.width} - ${margin * 2}px)`,
    height: `calc(${containerHeight} - ${margin * 2}px)`,
    margin: `${margin}px`,
  }"
    ></div>
  </div>
</template>

<script setup lang="ts">

import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import BpmnViewer from 'bpmn-js/lib/Viewer'
import 'bpmn-js/dist/assets/bpmn-js.css'
import tokenSimulation from 'bpmn-js-token-simulation/lib/viewer'
import { onSlideEnter } from '@slidev/client'
import 'bpmn-js-token-simulation/assets/css/bpmn-js-token-simulation.css'
import { useBpmn } from '../composables/useBpmn'

const margin = 5
const containerWaitTimeout = 5000

const { loading, error, fetchBpmnXml, withLoading } = useBpmn()
const containerRef = ref<HTMLDivElement | null>(null)
const isRendered = ref(false)
let viewer: InstanceType<typeof BpmnViewer> | null = null

const props = withDefaults(defineProps<{
  bpmnFilePath: string
  width?: string
  height?: string
}>(), {
  width: '100%',
  height: 'auto',
})

const containerHeight = props.height === 'auto' ? '500px' : props.height

/**
 * Polls for container dimensions to be ready before rendering.
 * Prevents "non-finite" SVG matrix errors when canvas.zoom() is called.
 */
async function waitForContainer(): Promise<void> {
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

/**
 * Renders the BPMN diagram with token simulation.
 * Includes duplicate prevention since Slidev calls both onMounted and onSlideEnter.
 */
async function renderBpmn() {

  // Prevent duplicate rendering
  if (isRendered.value) return
  isRendered.value = true

  const result = await withLoading(async () => {
    await waitForContainer()
    const bpmnXml = await fetchBpmnXml(props.bpmnFilePath)

    const disableSnackbarModule = {notifications: ['value', {showNotification: () => {}}]}
    viewer = new BpmnViewer({
      container: containerRef.value!,
      additionalModules: [tokenSimulation, disableSnackbarModule]
    })

    await viewer.importXML(bpmnXml)

    const canvas = viewer.get('canvas') as any
    canvas.resized()
    canvas.zoom('fit-viewport', 'auto')
  })

  if (result === undefined && error.value) {
    isRendered.value = false
  }
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
  viewer?.destroy()
  viewer = null
})

</script>
