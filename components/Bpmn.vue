<template>
  <div class="bpmn-static" :style="{ width: props.width, height: props.height }">
    <p v-if="loading">Loading BPMN diagram...</p>
    <p v-if="error" class="text-red-500">{{ error }}</p>
    <div v-if="svg" v-html="svg" class="bpmn-static-inner"></div>
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

    // Pad the viewBox and pin the SVG's intrinsic size so the scoped
    // max-width/max-height only scale it down. height:100% would collapse
    // to 0 inside a flex parent (e.g. the toolkit's DiagramFrame).
    const viewBox = svgElement.getAttribute('viewBox')
    if (viewBox) {
      const [x, y, w, h] = viewBox.split(' ').map(Number)
      const pad = Math.max(w, h) * 0.02
      const paddedW = w + pad * 2
      const paddedH = h + pad * 2
      svgElement.setAttribute('viewBox', `${x - pad} ${y - pad} ${paddedW} ${paddedH}`)
      svgElement.setAttribute('width', String(paddedW))
      svgElement.setAttribute('height', String(paddedH))
    }

    svgElement.style.removeProperty('width')
    svgElement.style.removeProperty('height')
    svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet')

    svg.value = svgElement.outerHTML

    viewer.destroy()
  } finally {
    document.body.removeChild(container)
  }
}
</script>

<style scoped>
.bpmn-static {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.bpmn-static-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 0;
}

/* Cap to the box; the SVG's intrinsic size keeps it from collapsing to 0. */
.bpmn-static-inner :deep(svg) {
  max-width: 100%;
  max-height: 100%;
}
</style>
