<template>
  <DiagramModeler
    :notation="notation"
    :filePath="props.eventStormingFilePath"
    :width="props.width"
    :height="props.height"
    :modelerStyles="modelerStyles"
  />
</template>

<script setup lang="ts">
import modelerStyles from '@miragon/event-storming-renderer/assets/event-storming.css?inline'
import { EventStormingNotation } from '../../plugins/event-storming/EventStormingNotation'
import DiagramModeler from '../../shared/ui/DiagramModeler.vue'

const props = withDefaults(defineProps<{
  eventStormingFilePath?: string
  width?: string
  height?: string
}>(), {
  width: '100%',
  height: '500px',
})

const notation = new EventStormingNotation()
</script>
