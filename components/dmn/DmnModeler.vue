<template>
  <DiagramModeler
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
import 'dmn-js/dist/assets/dmn-js-decision-table.css'
import 'dmn-js/dist/assets/dmn-js-decision-table-controls.css'
import 'dmn-js/dist/assets/dmn-js-literal-expression.css'
import 'dmn-js/dist/assets/dmn-font/css/dmn-embedded.css'
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css'
import { DmnModelerNotation } from '../../plugins/dmn/DmnModelerNotation'
import type { Engine } from '../../plugins/dmn/engines/types'
import DiagramModeler from '../../shared/ui/DiagramModeler.vue'

const props = withDefaults(defineProps<{
  dmnFilePath?: string
  width?: string
  height?: string
  engine?: Engine
}>(), {
  width: '100%',
  height: '500px',
})

const notation = new DmnModelerNotation(props.engine)
</script>

<style scoped>
/* dmn-js watermark anchored bottom-right; shrink so it stays subordinate in
   small tiles. The fullscreen modeler is teleported out and not targeted. */
:deep(.bjs-powered-by) {
  transform: scale(0.7);
  transform-origin: bottom right;
}
</style>
