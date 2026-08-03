---
theme: '@miragon/slidev-toolkit'
colorSchema: light
highlighter: shiki
transition: slide-up
layout: cover
eyebrow: Slidev Addon
---

# BPMN in **Slidev**

Drop your `.bpmn` files straight into the deck. No screenshots, no manual exports.

---
layout: hero
eyebrow: Why this addon
accent: blue
---

# Model once, embed the **real** diagram.

Static SVG, animated token flow, or a live modeler; all from the same `.bpmn` file.

---
layout: bpmn
title: Static BPMN diagrams
eyebrow: Bpmn
accent: blue
diagram: /newsletter.bpmn
mode: static
height: 300px
---

Rendered as a clean, static SVG. Best for PDF exports and print.

---
layout: content
title: The Bpmn component
eyebrow: Bpmn
accent: blue
---

Renders a `.bpmn` file as a static, inline SVG. Ideal for print and PDF export.

| Prop | Type | Description |
|---|---|---|
| `bpmnFilePath` | string | Path to the file (required) |
| `width` | string | Canvas width (default 100%) |
| `height` | string | Canvas height (default auto) |

`<Bpmn bpmnFilePath="/newsletter.bpmn" height="300px" />`

---
layout: bpmn
title: Interactive token simulation
eyebrow: Bpmn-Token-Simulation
accent: blue
diagram: /newsletter.bpmn
mode: token
height: 325px
---

Animated token flow makes the process instantly clear to your audience.

---
layout: content
title: The BpmnTokenSimulation component
eyebrow: Bpmn-Token-Simulation
accent: blue
---

Plays an animated token through the process, with a built-in fullscreen view.

| Prop | Type | Description |
|---|---|---|
| `bpmnFilePath` | string | Path to the file (required) |
| `fullscreen` | boolean | Show the expand button (default true) |
| `maxScale` | number | Cap the auto-zoom factor |
| `height` | string | Canvas height (default auto) |

`<BpmnTokenSimulation bpmnFilePath="/newsletter.bpmn" height="325px" />`

---
layout: bpmn
title: Live BPMN modeler
eyebrow: Bpmn-Modeler
accent: blue
diagram: /newsletter.bpmn
mode: modeler
engine: zeebe
height: 325px
---

Edit the diagram live in a workshop, with an engine-specific properties panel.

---
layout: content
title: The BpmnModeler component
eyebrow: Bpmn-Modeler
accent: blue
---

A full modeler canvas for workshops. Set an `engine` for its properties panel.

| Prop | Type | Description |
|---|---|---|
| `bpmnFilePath` | string | Path to the file (omit for blank canvas) |
| `engine` | zeebe / camunda7 | Adds the matching properties panel |
| `tokenSimulation` | boolean | Token flow inside the modeler |
| `transactionBoundaries` | boolean | Overlay Camunda 7 boundaries |

`<BpmnModeler bpmnFilePath="/newsletter.bpmn" engine="zeebe" height="325px" />`

---
layout: person
name: Marco Schäck
photo: /marco.png
eyebrow: The developer behind it
accent: blue
side: left
---

Open-source engineer building tooling around BPMN, Camunda, and process automation, as **emaarco**. Find me on [LinkedIn](https://linkedin.com/in/schaeckm) and [Medium](https://medium.com/@emaarco).

---
layout: closing
eyebrow: Get started
footer: github.com/emaarco/slidev-addon-bpmn
---

# Drop your **.bpmn** in.
