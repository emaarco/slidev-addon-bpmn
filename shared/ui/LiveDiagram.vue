<template>
  <div class="live-diagram" :style="{ width: props.width, height: props.height }">
    <p v-if="loading">Loading {{ props.notation.kind }} diagram...</p>
    <p v-if="error" class="text-red-500">{{ error }}</p>
    <div ref="containerRef" class="live-diagram-canvas" v-bind="$attrs"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { onSlideEnter } from '@slidev/client'
import { DiagramFileLoader } from '../lib/DiagramFileLoader'
import { EmbeddedViewer } from '../lib/EmbeddedViewer'
import type { LiveNotation } from '../lib/notation'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  notation: LiveNotation
  filePath?: string
  source?: string
  width: string
  height: string
}>()

const emit = defineEmits<{ rendered: [source: string] }>()

const fileLoader = new DiagramFileLoader(props.notation.kind)
const { loading, error } = fileLoader
const embeddedViewer = new EmbeddedViewer(props.notation)
const containerRef = ref<HTMLDivElement | null>(null)

onMounted(render)
onSlideEnter(render)
watch(() => props.source, render)
onUnmounted(() => embeddedViewer.destroy())

async function render(): Promise<void> {
  await fileLoader.withLoading(async () => {
    const source = props.source ?? await fileLoader.fetchFile(props.filePath!)
    if (await embeddedViewer.show(containerRef.value!, source)) emit('rendered', source)
  })
}
</script>

<style scoped>
.live-diagram {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.live-diagram-canvas {
  width: calc(100% - 10px);
  height: calc(100% - 10px);
  margin: 5px;
}
</style>
