<template>
  <Teleport to="body">
    <div v-if="props.open" class="fullscreen-overlay">
      <div class="fullscreen-overlay-main">
        <slot />
        <div class="fullscreen-overlay-toolbar">
          <slot name="toolbar" />
        </div>
      </div>
      <slot name="aside" />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onUnmounted, watch } from 'vue'

const props = defineProps<{ open: boolean }>()

watch(() => props.open, (open) => {
  if (open) document.addEventListener('keydown', keepKeyStrokesFromSlideNavigation)
  else document.removeEventListener('keydown', keepKeyStrokesFromSlideNavigation)
}, { immediate: true })

onUnmounted(() => document.removeEventListener('keydown', keepKeyStrokesFromSlideNavigation))

// The modelers handle shortcuts on document, Slidev navigates on window:
// stopping here lets the modeler see a key stroke and keeps the slide in place.
function keepKeyStrokesFromSlideNavigation(event: KeyboardEvent): void {
  event.stopPropagation()
}
</script>

<style scoped>
.fullscreen-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  background: white;
  display: flex;
}

.fullscreen-overlay-main {
  flex: 1;
  height: 100%;
  position: relative;
}

.fullscreen-overlay-toolbar {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}
</style>
