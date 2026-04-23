---
colorSchema: light
---

<style>
h1 {
  color: #335DE4;
  font-weight: bold;
  margin-bottom: 0;
}

h2 {
  color: #1E3A8A;
  font-weight: bold;
  margin-bottom: 1rem;
}

p {
  color: #6b7280;
  margin-bottom: 1rem;
}

code {
  color: #9333ea;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
}
</style>

# slidev-addon-bpmn

Embed your BPMN models präzise and gscheit 🥨 – because screenshot Gefrickel is just zwider.
Drop your `.bpmn` files directly into your Slidev.
No manual export chaos, just saubere process diagrams!

**Features:**
- Static rendering for PDFs and presentations
- Interactive token simulation for process demonstrations
- Live BPMN modeling for workshops and trainings

---

## BPMN Diagrams

The `Bpmn` component renders BPMN diagrams as static SVG images – koa screenshot Schmarrn, koa manual export Humbug, just clean SVG rendering that schaug richtig fesch aus!

<Bpmn bpmnFilePath="./newsletter.bpmn" height="300px"></Bpmn>

---

## Interactive Token Simulation

The `BpmnTokenSimulation` component adds animated token flow for process demonstrations – the tokens hupfan through your diagram like it's a Mordsgaudi! Your audience kapiert sofort how the workflow flows, koa langweiliges Gschwafel needed!

<BpmnTokenSimulation bpmnFilePath="./newsletter.bpmn" height="350px"></BpmnTokenSimulation>

---

## Zeebe Modeler (Camunda 8)

Pass `engine="zeebe"` and you get a full properties panel with Zeebe extensions – task definitions, headers, subscriptions, the whole Klumpatsch! Perfekt for workshops targeting Camunda 8 where executable details matter just as much as the shape.

<BpmnModeler bpmnFilePath="./newsletter.bpmn" engine="zeebe" height="400px"></BpmnModeler>

---

## Camunda 7 Modeler

Für die Camunda-7-Fraktion: `engine="camunda7"` swaps in the Camunda Platform properties panel, so you can wire up expressions, delegate beans and assignees live – ganz ohne Tool-Hopserei.

<BpmnModeler bpmnFilePath="./loan-approval.bpmn" engine="camunda7" height="400px"></BpmnModeler>

---

## Blank Canvas Modeler

No `engine` prop? Dann gibt's nur die Zeichenfläche – a bare modeler for pure structural modeling. Ideal for live sessions where you build a process from scratch with your audience.

<BpmnModeler height="400px"></BpmnModeler>
