<!-- Styles scoped to this example presentation only – not shipped with the addon -->
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

---

## BPMN Diagrams

The `Bpmn` component renders BPMN diagrams as static SVG images – koa screenshot Schmarrn, koa manual export Humbug, just clean SVG rendering that schaug richtig fesch aus!

<Bpmn bpmnFilePath="./newsletter.bpmn" height="300px"></Bpmn>

---

## Interactive Token Simulation

The `BpmnTokenSimulation` component adds animated token flow for process demonstrations – the tokens hupfan through your diagram like it's a Mordsgaudi! Your audience kapiert sofort how the workflow flows, koa langweiliges Gschwafel needed!

<BpmnTokenSimulation bpmnFilePath="./newsletter.bpmn" height="350px"></BpmnTokenSimulation>
