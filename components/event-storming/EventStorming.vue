<template>
  <StaticDiagram
    :notation="notation"
    :filePath="props.eventStormingFilePath"
    :width="props.width"
    :height="props.height"
  />
</template>

<script setup lang="ts">
import { EventStormingNotation } from '../../src/event-storming/EventStormingNotation'
import StaticDiagram from '../../src/shared/ui/StaticDiagram.vue'

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
