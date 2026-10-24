<template>
  <StaticDiagram
    :notation="notation"
    :filePath="props.dmnFilePath"
    :width="props.width"
    :height="props.height"
  />
</template>

<script setup lang="ts">
import 'dmn-js/dist/assets/diagram-js.css'
import 'dmn-js/dist/assets/dmn-js-shared.css'
import 'dmn-js/dist/assets/dmn-js-drd.css'
import 'dmn-js/dist/assets/dmn-font/css/dmn-embedded.css'
import { DrdDiagramNotation } from '../../plugins/dmn/DrdDiagramNotation'
import StaticDiagram from '../../shared/ui/StaticDiagram.vue'

const props = withDefaults(defineProps<{
  dmnFilePath: string
  width?: string
  height?: string
  fontSize?: string
}>(), {
  width: '100%',
  height: 'auto',
  fontSize: '12px',
})

const notation = new DrdDiagramNotation(props.fontSize)
</script>
