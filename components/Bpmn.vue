<template>
  <div>
    <p v-if="loading">Loading BPMN diagram...</p>
    <p v-if="error" class="text-red-500">{{ error }}</p>
    <div v-if="svg" v-html="svg"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import BpmnViewer from 'bpmn-js/lib/Viewer'
import 'bpmn-js/dist/assets/bpmn-js.css'

const loading = ref(true)
const error = ref<string | null>(null)
const svg = ref<string | null>(null)

const props = withDefaults(defineProps<{
  bpmnFilePath: string
  width?: string
  height?: string
}>(), {
  width: '100%',
  height: 'auto',
})

onMounted(async () => {
  loading.value = true
  error.value = null

  try {
    await loadAndRenderBpmn(props.bpmnFilePath)
  } catch (err) {
    error.value = `Failed to load BPMN: ${err instanceof Error ? err.message : String(err)}`
    console.error('BPMN loading error:', err)
  } finally {
    loading.value = false
  }
})

async function loadAndRenderBpmn(path: string): Promise<void> {
  const url = new URL(path, window.location.origin + import.meta.env.BASE_URL).href
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch BPMN file: ${response.status}`)
  }

  const bpmnXml = await response.text()

  // Create off-screen container for bpmn-js rendering (requires DOM element)
  // Fixed 1920x1080 size may clip large diagrams or waste space for small ones
  // If this causes issues, we should consider auto-detecting diagram bounds or using viewBox-based sizing
  const container = document.createElement('div')
  container.style.width = '1920px'
  container.style.height = '1080px'
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  document.body.appendChild(container)

  try {
    const viewer = new BpmnViewer({ container })
    await viewer.importXML(bpmnXml)

    const { svg: svgContent } = await viewer.saveSVG()

    const parser = new DOMParser()
    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml')
    const svgElement = svgDoc.documentElement

    // Strip potentially dangerous elements from the SVG
    svgDoc.querySelectorAll('script, foreignObject').forEach(el => el.remove())

    svgElement.style.maxWidth = props.width
    svgElement.style.height = props.height
    svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet')

    svg.value = svgElement.outerHTML

    viewer.destroy()
  } finally {
    document.body.removeChild(container)
  }
}
</script>
