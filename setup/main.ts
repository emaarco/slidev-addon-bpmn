import { defineAppSetup } from '@slidev/types'
import Bpmn from '../components/Bpmn.vue'
import BpmnModeler from '../components/BpmnModeler.vue'
import BpmnTokenSimulation from '../components/BpmnTokenSimulation.vue'

// The toolkit theme ships a `bpmn` LAYOUT (layout: bpmn), which Slidev also
// exposes as a component named `Bpmn` — shadowing this addon's static <Bpmn>
// viewer so the layout renders itself recursively (blank). Registering the
// addon components here, after the theme, makes <Bpmn> resolve to the viewer.
export default defineAppSetup(({ app }) => {
  app.component('Bpmn', Bpmn)
  app.component('BpmnModeler', BpmnModeler)
  app.component('BpmnTokenSimulation', BpmnTokenSimulation)
})
