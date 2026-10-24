<template>
  <DiagramModeler
    :notation="notation"
    :filePath="props.bpmnFilePath"
    :width="props.width"
    :height="props.height"
  />
</template>

<script setup lang="ts">
import 'bpmn-js/dist/assets/bpmn-js.css'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css'
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css'
import 'bpmn-js-token-simulation/assets/css/bpmn-js-token-simulation.css'
import { BpmnModelerNotation } from '../../src/bpmn/BpmnModelerNotation'
import type { Engine } from '../../src/bpmn/engines/types'
import { parseMaxScale } from '../../src/bpmn/utils/parseMaxScale'
import DiagramModeler from '../../src/shared/ui/DiagramModeler.vue'

const props = withDefaults(defineProps<{
  bpmnFilePath?: string
  width?: string
  height?: string
  engine?: Engine
  maxScale?: number
  tokenSimulation?: boolean
  transactionBoundaries?: boolean
}>(), {
  width: '100%',
  height: '500px',
  tokenSimulation: false,
  transactionBoundaries: false,
})

const notation = new BpmnModelerNotation({
  engine: props.engine,
  tokenSimulation: props.tokenSimulation,
  transactionBoundaries: props.transactionBoundaries,
  maxScale: parseMaxScale(props.maxScale),
})
</script>

<style scoped>
/* bpmn-js watermark anchored bottom-right; shrink so it stays subordinate in
   small tiles. The fullscreen modeler is teleported out and not targeted. */
:deep(.bjs-powered-by) {
  transform: scale(0.7);
  transform-origin: bottom right;
}

/* Trim the token-simulation toggle pill down from its 16px default — smaller and
   less dominant, but still clearly larger than the 11px chrome buttons. Its icon
   is height:1em, so font-size drives the whole pill. Only present when the inline
   viewer runs with tokenSimulation. */
:deep(.bts-toggle-mode) {
  font-size: 13px;
}
</style>
