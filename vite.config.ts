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
      'dmn-js/lib/Viewer',
      'dmn-js/lib/Modeler',
      'dmn-js-properties-panel',
      '@emaarco/dmn-js-simulation',
      '@emaarco/bpmn-js-data-simulation',
      '@miragon/team-topologies-renderer',
      '@miragon/team-topologies-schema-model',
      '@miragon/wardley-renderer',
      '@miragon/event-storming-renderer',
    ],
  },
})
