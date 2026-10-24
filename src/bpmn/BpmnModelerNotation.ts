import type { LiveNotation, LiveViewer, ModelerContainers, ModelerNotation, ModelerSession } from '../shared/lib/notation'
import { BpmnLiveViewer } from './BpmnLiveViewer'
import { type BpmnModelerOptions, BpmnModelerSession } from './BpmnModelerSession'
import { tokenSimulationViewerModules } from './tokenSimulationViewerModules'

// The diagram bpmn-js' Modeler#createDiagram() starts from.
const BLANK_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" targetNamespace="http://bpmn.io/schema/bpmn" id="Definitions_1">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds height="36.0" width="36.0" x="173.0" y="102.0" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`

export class BpmnModelerNotation implements LiveNotation, ModelerNotation {
  readonly kind = 'BPMN'
  readonly blankSource = BLANK_BPMN
  readonly hasPropertiesPanel: boolean

  constructor(private readonly options: BpmnModelerOptions) {
    this.hasPropertiesPanel = !!options.engine
  }

  async createViewer(container: HTMLElement): Promise<LiveViewer> {
    const viewerOptions = this.options.tokenSimulation ? { additionalModules: tokenSimulationViewerModules } : {}
    return new BpmnLiveViewer(container, viewerOptions, this.options.maxScale)
  }

  openModeler(source: string, containers: ModelerContainers): Promise<ModelerSession> {
    return BpmnModelerSession.open(source, containers, this.options)
  }
}
