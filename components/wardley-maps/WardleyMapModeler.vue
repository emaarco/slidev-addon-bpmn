<template>
  <DiagramModeler
    :notation="notation"
    :filePath="props.wardleyMapFilePath"
    :width="props.width"
    :height="props.height"
    :modelerStyles="modelerStyles"
  />
</template>

<script setup lang="ts">
import modelerStyles from '@miragon/wardley-renderer/assets/wardley.css?inline'
import { WardleyMapNotation } from '../../plugins/wardley-maps/WardleyMapNotation'
import DiagramModeler from '../../shared/ui/DiagramModeler.vue'

const props = withDefaults(defineProps<{
  wardleyMapFilePath?: string
  width?: string
  height?: string
}>(), {
  width: '100%',
  height: '500px',
})

const notation = new WardleyMapNotation()
</script>
