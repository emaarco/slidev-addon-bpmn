<template>
  <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: props.width, height: containerHeight }">
    <p v-if="loading">Loading BPMN modeler...</p>
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
import BpmnModeler from 'bpmn-js/lib/Modeler'
import 'bpmn-js/dist/assets/bpmn-js.css'
import 'bpmn-js/dist/assets/diagram-js.css'
import { onSlideEnter } from '@slidev/client'
import { useBpmn } from '../composables/useBpmn'

const margin = 5
const containerWaitTimeout = 5000

const { loading, error, fetchBpmnXml, withLoading } = useBpmn()
const containerRef = ref<HTMLDivElement | null>(null)
const isRendered = ref(false)
let modeler: InstanceType<typeof BpmnModeler> | null = null

const props = withDefaults(defineProps<{
  bpmnFilePath?: string
  width?: string
  height?: string
}>(), {
  width: '100%',
  height: '500px',
})

const containerHeight = props.height

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
 * Renders the BPMN modeler.
 * Includes duplicate prevention since Slidev calls both onMounted and onSlideEnter.
 */
async function renderBpmn() {

  // Prevent duplicate rendering
  if (isRendered.value) return
  isRendered.value = true

  const result = await withLoading(async () => {
    await waitForContainer()

    modeler = new BpmnModeler({
      container: containerRef.value!,
    })

    if (props.bpmnFilePath) {
      const bpmnXml = await fetchBpmnXml(props.bpmnFilePath)
      await modeler.importXML(bpmnXml)
    } else {
      await modeler.createDiagram()
    }

    const canvas = modeler.get('canvas') as any
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
  modeler?.destroy()
  modeler = null
})

</script>
