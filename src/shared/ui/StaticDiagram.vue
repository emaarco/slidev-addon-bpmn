<template>
  <div class="static-diagram" :style="{ width: props.width, height: props.height }">
    <p v-if="loading && !svg">Loading {{ props.notation.kind }} diagram...</p>
    <p v-if="error" class="text-red-500">{{ error }}</p>
    <div v-if="svg" v-html="svg" class="static-diagram-inner"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { DiagramFileLoader } from '../lib/DiagramFileLoader'
import type { StaticNotation } from '../lib/notation'
import { StaticSvgRenderer } from '../lib/StaticSvgRenderer'

const props = defineProps<{
  notation: StaticNotation
  filePath?: string
  source?: string
  width: string
  height: string
}>()

const emit = defineEmits<{ rendered: [source: string] }>()

const fileLoader = new DiagramFileLoader(props.notation.kind)
const { loading, error } = fileLoader
const svgRenderer = new StaticSvgRenderer()
const svg = ref<string | null>(null)

onMounted(render)
watch(() => props.source, render)

function render(): Promise<void | undefined> {
  return fileLoader.withLoading(async () => {
    const source = props.source ?? await fileLoader.fetchFile(props.filePath!)
    svg.value = await svgRenderer.render(props.notation, source)
    emit('rendered', source)
  })
}
</script>

<style scoped>
.static-diagram {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.static-diagram-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 0;
}

/* Cap to the box; the SVG's intrinsic size keeps it from collapsing to 0. */
.static-diagram-inner :deep(svg) {
  max-width: 100%;
  max-height: 100%;
}
</style>
