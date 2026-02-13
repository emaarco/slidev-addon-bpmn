<template>
  <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: props.width, height: containerHeight }">
    <p v-if="loading">Loading BPMN diagram...</p>
    <p v-if="error" class="text-red-500">{{ error }}</p>
    <div
        ref="containerRef"
        :style="{
    width: `calc(${props.width} - ${5* 2}px)`,
    height: `calc(${containerHeight} - ${5 * 2}px)`,
    margin: `5px`,
  }"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BpmnViewer from 'bpmn-js/lib/Viewer'
import 'bpmn-js/dist/assets/bpmn-js.css'
import tokenSimulation from 'bpmn-js-token-simulation/lib/viewer'
import { onSlideEnter } from '@slidev/client'
import 'bpmn-js-token-simulation/assets/css/bpmn-js-token-simulation.css'

const loading = ref(false)
const error = ref<string | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

const props = withDefaults(defineProps<{
  bpmnFilePath: string
  width?: string
  height?: string
}>(), {
  width: '100%',
  height: 'auto',
})

// Live containers need explicit height, so fallback to 500px when 'auto'
const containerHeight = props.height === 'auto' ? '500px' : props.height

onSlideEnter(async () => {
  loading.value = true
  error.value = null

  try {
    const url = new URL(props.bpmnFilePath, window.location.origin + import.meta.env.BASE_URL).href
    const response = await fetch(url)

    if (!response.ok) throw new Error(`Failed to fetch BPMN file: ${response.status}`)

    const disableSnackbarModule = {notifications: ['value', {showNotification: () => {}}]}
    const viewer = new BpmnViewer({
      container: containerRef.value!,
      additionalModules: [tokenSimulation, disableSnackbarModule]
    })

    const bpmnXml = await response.text()
    await viewer.importXML(bpmnXml)

    const canvas = viewer.get('canvas') as any

    canvas.resized()
    canvas.zoom('fit-viewport', 'auto')

    error.value = null
  } catch (err) {
    error.value = `Failed to load BPMN: ${err instanceof Error ? err.message : String(err)}`
    console.error('BPMN loading error:', err)
  } finally {
    loading.value = false
  }
})
</script>