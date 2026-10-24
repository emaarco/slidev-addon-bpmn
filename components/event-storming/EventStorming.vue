<template>
  <StaticDiagram
    :notation="notation"
    :filePath="props.eventStormingFilePath"
    :width="props.width"
    :height="props.height"
  />
</template>

<script setup lang="ts">
import { EventStormingNotation } from '../../plugins/event-storming/EventStormingNotation'
import StaticDiagram from '../../shared/ui/StaticDiagram.vue'

const props = withDefaults(defineProps<{
  eventStormingFilePath: string
  width?: string
  height?: string
}>(), {
  width: '100%',
  height: 'auto',
})

const notation = new EventStormingNotation()
</script>
