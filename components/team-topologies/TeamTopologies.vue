<template>
  <StaticDiagram
    :notation="notation"
    :filePath="props.teamTopologiesFilePath"
    :width="props.width"
    :height="props.height"
  />
</template>

<script setup lang="ts">
import { TeamTopologiesNotation } from '../../src/team-topologies/TeamTopologiesNotation'
import StaticDiagram from '../../src/shared/ui/StaticDiagram.vue'

const props = withDefaults(defineProps<{
  teamTopologiesFilePath: string
  width?: string
  height?: string
}>(), {
  width: '100%',
  height: 'auto',
})

const notation = new TeamTopologiesNotation()
</script>
