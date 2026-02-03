import { defineConfig } from 'vite'

/**
 * Required to ensure that bpmn.js as a sub-dependency
 * is working in the slidev using this plugin
 */
export default defineConfig({
  optimizeDeps: {
    include: [
      'bpmn-js/lib/Viewer',
      'bpmn-js > min-dom',
      'bpmn-js > min-dom > domify',
      'min-dom',
      'min-dom > domify',
      'domify',
      'slidev-addon-bpmn > bpmn-js',
      'slidev-addon-bpmn > min-dom',
      'slidev-addon-bpmn > domify',
    ],
  },
})
