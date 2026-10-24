<template>
  <DiagramModeler
    :notation="notation"
    :filePath="props.bpmnFilePath"
    :width="props.width"
    :height="props.height"
  />
</template>

<script setup lang="ts">
import '../../src/bpmn/bpmn.css'
import { BpmnModelerNotation } from '../../src/bpmn/BpmnModelerNotation'
import type { Engine } from '../../src/bpmn/engines/bpmnEngines'
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

