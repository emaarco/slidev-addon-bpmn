<template>
  <LiveDiagram
    class="dmn-table-wrapper"
    :class="{ 'hide-annotations': !props.showAnnotations, 'hide-drd-button': !props.showDrdButton }"
    :style="{ '--dmn-table-font-size': props.fontSize }"
    :notation="notation"
    :filePath="props.dmnFilePath"
    :width="props.width"
    :height="containerHeight"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import 'dmn-js/dist/assets/diagram-js.css'
import 'dmn-js/dist/assets/dmn-js-shared.css'
import 'dmn-js/dist/assets/dmn-js-decision-table.css'
import 'dmn-js/dist/assets/dmn-js-decision-table-controls.css'
import 'dmn-js/dist/assets/dmn-font/css/dmn-embedded.css'
import '../../plugins/dmn/decisionTable.css'
import { DecisionTableNotation } from '../../plugins/dmn/DecisionTableNotation'
import LiveDiagram from '../../shared/ui/LiveDiagram.vue'

const props = withDefaults(defineProps<{
  dmnFilePath: string
  width?: string
  height?: string
  decisionId?: string
  fontSize?: string
  showAnnotations?: boolean
  showDrdButton?: boolean
}>(), {
  width: '100%',
  height: 'auto',
  fontSize: '12px',
  showAnnotations: false,
  showDrdButton: false,
})

const containerHeight = computed(() => props.height === 'auto' ? '500px' : props.height)
const notation = new DecisionTableNotation(props.decisionId)
</script>
