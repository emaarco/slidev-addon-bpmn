<template>
  <StaticDiagram
    :notation="notation"
    :filePath="props.wardleyMapFilePath"
    :width="props.width"
    :height="props.height"
  />
</template>

<script setup lang="ts">
import { WardleyMapNotation } from '../../plugins/wardley-maps/WardleyMapNotation'
import StaticDiagram from '../../shared/ui/StaticDiagram.vue'

const props = withDefaults(defineProps<{
  wardleyMapFilePath: string
  width?: string
  height?: string
}>(), {
  width: '100%',
  height: 'auto',
})

const notation = new WardleyMapNotation()
</script>
