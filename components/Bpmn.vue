<template>
  <div :style="{ width: props.width, height: props.height }">
    <p v-if="loading">Loading BPMN diagram...</p>
    <p v-if="error" class="text-red-500">{{ error }}</p>
    <div v-if="svg" v-html="svg"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import BpmnViewer from 'bpmn-js/lib/Viewer'
import 'bpmn-js/dist/assets/bpmn-js.css'
import { useBpmn } from '../composables/useBpmn'

const { loading, error, fetchBpmnXml, withLoading } = useBpmn()
const svg = ref<string | null>(null)

const props = withDefaults(defineProps<{
  bpmnFilePath: string
  width?: string
  height?: string
}>(), {
  width: '100%',
  height: 'auto',
})

onMounted(() => {
  withLoading(() => loadAndRenderBpmn(props.bpmnFilePath))
})

async function loadAndRenderBpmn(path: string): Promise<void> {
  const bpmnXml = await fetchBpmnXml(path)

  // Create off-screen container for bpmn-js rendering (requires DOM element)
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

    // Expand viewBox to add padding around diagram edges
    const viewBox = svgElement.getAttribute('viewBox')
    if (viewBox) {
      const [x, y, w, h] = viewBox.split(' ').map(Number)
      const pad = Math.max(w, h) * 0.02
      svgElement.setAttribute('viewBox', `${x - pad} ${y - pad} ${w + pad * 2} ${h + pad * 2}`)
    }

    svgElement.style.width = '100%'
    svgElement.style.height = '100%'
    svgElement.setAttribute('preserveAspectRatio', 'xMinYMin meet')

    svg.value = svgElement.outerHTML

    viewer.destroy()
  } finally {
    document.body.removeChild(container)
  }
}
</script>
