import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    allowedHosts: ['.localhost'],
  },
  optimizeDeps: {
    include: [
      'bpmn-js/lib/Viewer',
      'bpmn-js-token-simulation/lib/viewer',
    ],
  },
})
