<template>
  <div class="bpmn-token-simulation" :style="{ width: props.width, height: containerHeight }">
    <LiveDiagram
      class="bpmn-token-simulation-container"
      :notation="notation"
      :filePath="props.bpmnFilePath"
      width="100%"
      height="100%"
      @rendered="rememberRenderedSource"
    />

    <ToolbarButton
      v-if="props.fullscreen && renderedSource !== null"
      title="Open in fullscreen"
      label="Expand"
      :position="{ top: '20px', right: '20px', zIndex: 10 }"
      @click="openFullscreen"
    >
      <template #icon>
        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 3 21 3 21 9"/>
          <polyline points="9 21 3 21 3 15"/>
          <line x1="21" y1="3" x2="14" y2="10"/>
          <line x1="3" y1="21" x2="10" y2="14"/>
        </svg>
      </template>
    </ToolbarButton>

    <FullscreenOverlay :open="isFullscreen">
      <div ref="fullscreenContainerRef" class="bpmn-token-simulation-fullscreen"></div>

      <template #toolbar>
        <ToolbarButton title="Close fullscreen" label="Close" @click="closeFullscreen">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </template>
        </ToolbarButton>
      </template>
    </FullscreenOverlay>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onUnmounted, ref } from 'vue'
import 'bpmn-js/dist/assets/bpmn-js.css'
import 'bpmn-js-token-simulation/assets/css/bpmn-js-token-simulation.css'
import '@emaarco/bpmn-js-data-simulation/assets/bpmn-js-data-simulation.css'
import { BpmnTokenSimulationNotation } from '../../src/bpmn/BpmnTokenSimulationNotation'
import type { Engine } from '../../src/bpmn/engines/types'
import { parseMaxScale } from '../../src/bpmn/utils/parseMaxScale'
import { DiagramFileLoader } from '../../src/shared/lib/DiagramFileLoader'
import { EmbeddedViewer } from '../../src/shared/lib/EmbeddedViewer'
import FullscreenOverlay from '../../src/shared/ui/FullscreenOverlay.vue'
import LiveDiagram from '../../src/shared/ui/LiveDiagram.vue'
import ToolbarButton from '../../src/shared/ui/ToolbarButton.vue'

const props = withDefaults(defineProps<{
  bpmnFilePath: string
  width?: string
  height?: string
  fullscreen?: boolean
  maxScale?: number
  engine?: Engine
  scenariosFilePath?: string
}>(), {
  width: '100%',
  height: 'auto',
  fullscreen: true,
})

const containerHeight = props.height === 'auto' ? '500px' : props.height
const scenariosLoader = new DiagramFileLoader('BPMN')

const notation = new BpmnTokenSimulationNotation({
  maxScale: parseMaxScale(props.maxScale),
  dataSimulation: props.engine && props.scenariosFilePath
    ? { engine: props.engine, loadScenarios: async () => JSON.parse(await scenariosLoader.fetchFile(props.scenariosFilePath!)) }
    : undefined,
})

const renderedSource = ref<string | null>(null)
const isFullscreen = ref(false)
const fullscreenContainerRef = ref<HTMLDivElement | null>(null)
let fullscreenViewer: EmbeddedViewer | null = null

function rememberRenderedSource(source: string): void {
  renderedSource.value = source
}

async function openFullscreen(): Promise<void> {
  if (renderedSource.value === null) return
  isFullscreen.value = true
  await nextTick()
  fullscreenViewer = new EmbeddedViewer(notation)
  await fullscreenViewer.show(fullscreenContainerRef.value!, renderedSource.value)
}

function closeFullscreen(): void {
  fullscreenViewer?.destroy()
  fullscreenViewer = null
  isFullscreen.value = false
}

onUnmounted(closeFullscreen)
</script>

<style scoped>
.bpmn-token-simulation {
  position: relative;
}

.bpmn-token-simulation-fullscreen {
  width: 100%;
  height: 100%;
}

:deep(.bpmn-token-simulation-container .bts-toggle-mode),
:deep(.bpmn-token-simulation-container .bts-palette),
:deep(.bpmn-token-simulation-container .bts-scopes) {
  transform: scale(var(--bts-toggle-scale, 1));
  transform-origin: top left;
}

/* Trim the toggle pill down from its 16px default — smaller and less dominant,
   but still clearly larger than the 11px chrome buttons. Its icon is height:1em,
   so font-size drives the whole pill; composes with the --bts-toggle-scale above. */
:deep(.bpmn-token-simulation-container .bts-toggle-mode) {
  font-size: 13px;
}

/* Bottom-centred speed selector: keep upstream's translate(-50%, 0) and compose
   with scale anchored to the element's bottom-centre so centring is preserved. */
:deep(.bpmn-token-simulation-container .bts-set-animation-speed) {
  transform: translate(-50%, 0) scale(var(--bts-toggle-scale, 1));
  transform-origin: 50% 100%;
}

/* bpmn-js watermark anchored bottom-right; scale alongside the simulation chrome. */
:deep(.bpmn-token-simulation-container .bjs-powered-by) {
  transform: scale(var(--bts-toggle-scale, 1));
  transform-origin: bottom right;
}
</style>
