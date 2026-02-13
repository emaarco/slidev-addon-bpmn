import { defineConfig } from 'vite'

export default defineConfig({
  optimizeDeps: {
    include: [
      'bpmn-js/lib/Viewer',
      'bpmn-js-token-simulation/lib/viewer',
    ],
  },
})
