<template>
  <DiagramModeler
    :notation="notation"
    :filePath="props.teamTopologiesFilePath"
    :width="props.width"
    :height="props.height"
    :modelerStyles="modelerStyles"
  />
</template>

<script setup lang="ts">
import modelerStyles from '@miragon/team-topologies-renderer/assets/team-topologies.css?inline'
import { TeamTopologiesNotation } from '../../plugins/team-topologies/TeamTopologiesNotation'
import DiagramModeler from '../../shared/ui/DiagramModeler.vue'

const props = withDefaults(defineProps<{
  teamTopologiesFilePath?: string
  width?: string
  height?: string
}>(), {
  width: '100%',
  height: '500px',
})

const notation = new TeamTopologiesNotation()
</script>
