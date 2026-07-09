---
colorSchema: light
---

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

## Komponenten Side-by-Side

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem 1.5rem;">
  <div class="tile">
    <h4 class="tile-header">Static</h4>
    <div class="tile-card">
      <Bpmn bpmnFilePath="./newsletter.bpmn" height="170px"></Bpmn>
    </div>
  </div>
  <div class="tile">
    <h4 class="tile-header">Token Simulation</h4>
    <div class="tile-card">
      <BpmnTokenSimulation bpmnFilePath="./newsletter.bpmn" height="170px"></BpmnTokenSimulation>
    </div>
  </div>
  <div class="tile">
    <h4 class="tile-header">Modeler</h4>
    <div class="tile-card">
      <BpmnModeler bpmnFilePath="./loan-approval.bpmn" engine="camunda7" height="170px"></BpmnModeler>
    </div>
  </div>
  <div></div>
</div>

---

## Zeebe Modeler (Camunda 8)

Pass `engine="zeebe"` and you get a full properties panel with Zeebe extensions – task definitions, headers, subscriptions, the whole Klumpatsch! Perfekt for workshops targeting Camunda 8 where executable details matter just as much as the shape.

<BpmnModeler bpmnFilePath="./newsletter.bpmn" engine="zeebe" height="320px"></BpmnModeler>

---

## Camunda 7 Modeler

Für die Camunda-7-Fraktion: `engine="camunda7"` swaps in the Camunda Platform properties panel, so you can wire up expressions, delegate beans and assignees live – ganz ohne Tool-Hopserei.

<BpmnModeler bpmnFilePath="./loan-approval.bpmn" engine="camunda7" height="320px"></BpmnModeler>

---

## Blank Canvas Modeler

No `engine` prop? Dann gibt's nur die Zeichenfläche für live modeling from scratch. Und weil so a Blank Canvas anfangs nur a einzigs Element hat, kannst mit `:max-scale` de Zoom-Grenz selba festlegn – standardmäßig 2, do auf 1.5 gsetzt.

<BpmnModeler :max-scale="1.5" height="320px"></BpmnModeler>

---

## Small Diagrams Fill the Space

Sauba! A kloans Modell duad si jetz aa breit macha, statt mickrig in da Mittn zu hocka – de kompaktn Diagramm wachsn schee mit, a wahre Mordsgaudi fürs Aug!

<BpmnTokenSimulation bpmnFilePath="./loan-approval.bpmn" width="90%" height="360px"></BpmnTokenSimulation>
