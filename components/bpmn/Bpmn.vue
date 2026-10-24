<template>
  <StaticDiagram
    :notation="notation"
    :filePath="props.bpmnFilePath"
    :width="props.width"
    :height="props.height"
  />
</template>

<script setup lang="ts">
import 'bpmn-js/dist/assets/bpmn-js.css'
import { BpmnDiagramNotation } from '../../src/bpmn/BpmnDiagramNotation'
import StaticDiagram from '../../src/shared/ui/StaticDiagram.vue'

const props = withDefaults(defineProps<{
  bpmnFilePath: string
  width?: string
  height?: string
}>(), {
  width: '100%',
  height: 'auto',
})

const notation = new BpmnDiagramNotation()
</script>
