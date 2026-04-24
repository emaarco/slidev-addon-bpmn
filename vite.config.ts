import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    allowedHosts: ['.localhost'],
  },
  optimizeDeps: {
    include: [
      'bpmn-js/lib/Viewer',
      'bpmn-js/lib/Modeler',
      'bpmn-js-token-simulation/lib/viewer',
      'bpmn-js-properties-panel',
      'camunda-bpmn-js-behaviors/lib/camunda-cloud',
      'camunda-transaction-boundaries',
    ],
  },
})
