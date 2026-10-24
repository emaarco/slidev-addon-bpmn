<template>
  <button :style="resolvedStyle" :title="props.title" @click="emit('click', $event)">
    <slot name="icon" />
    <span v-if="props.label">{{ props.label }}</span>
  </button>
</template>

<script setup lang="ts">
import { type CSSProperties, computed } from 'vue'

const props = defineProps<{
  title: string
  label?: string
  position?: { top?: string; right?: string; bottom?: string; left?: string; zIndex?: number }
}>()

const emit = defineEmits<{ (e: 'click', ev: MouseEvent): void }>()

const baseStyle: CSSProperties = {
  cursor: 'pointer',
  background: 'white',
  border: '1px solid #ccc',
  borderRadius: '3px',
  padding: '3px 6px',
  display: 'flex',
  alignItems: 'center',
  gap: '3px',
  // Lock to a system UI font so the button always reads as a control rather than
  // inheriting the deck theme's display/serif font.
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontSize: '11px',
  lineHeight: '1',
  color: '#333',
  boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
}

const resolvedStyle = computed<CSSProperties>(() => {
  if (!props.position) return baseStyle
  return { ...baseStyle, position: 'absolute', ...props.position }
})
</script>
