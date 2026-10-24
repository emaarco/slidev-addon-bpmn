# `components/` — the addon's public surface

Slidev auto-registers **every component in this directory as a global** in the
consuming slide deck (via `unplugin-vue-components`; the addon root's
`components/` dir is scanned by `@slidev/cli`, subfolders included). So a file
here becomes usable in any `.md` slide **without an import**:

```md
<Bpmn bpmnFilePath="/diagram.bpmn" />
<BpmnTokenSimulation bpmnFilePath="/diagram.bpmn" />
<BpmnModeler engine="zeebe" />
<DmnDrd dmnFilePath="/decision.dmn" />
<DmnTable dmnFilePath="/decision.dmn" />
<DmnSimulate dmnFilePath="/decision.dmn" />
<DmnModeler engine="camunda" />
<TeamTopologies teamTopologiesFilePath="/teams.tt" />
<TeamTopologiesModeler teamTopologiesFilePath="/teams.tt" />
<WardleyMap wardleyMapFilePath="/map.owm" />
<WardleyMapModeler wardleyMapFilePath="/map.owm" />
<EventStorming eventStormingFilePath="/board.storm" />
<EventStormingModeler eventStormingFilePath="/board.storm" />
```

That makes this folder the addon's **public API** — put a component here only if
end users should mount it directly.

## Consequences

- **One subfolder per modeler.** `components/bpmn/`, `components/dmn/`,
  `components/team-topologies/` and so on group the components of one modeler;
  a new modeler gets its own subfolder.
- **Registered by filename, not path.** The subfolder is not part of the name:
  `components/bpmn/Bpmn.vue` is the global `<Bpmn>`. A helper placed here
  (`components/ui/Button.vue`, or any `.ts` file) would leak into every deck as
  a global too. Don't hide internals here.
- **Internal building blocks live in [`../src/`](../src).** Shared UI and
  infrastructure go in `src/shared/` (`ui/*`, `lib/*`), modeler-specific logic
  such as notation classes and engine wiring in `src/<modeler>/`. They are
  imported explicitly and never touch the consumer's global namespace.

## Current components

| Component | Purpose |
|---|---|
| `bpmn/Bpmn.vue` | Static SVG rendering (off-screen render, best for PDF export) |
| `bpmn/BpmnTokenSimulation.vue` | Interactive viewer with animated token-flow simulation |
| `bpmn/BpmnModeler.vue` | Live BPMN modeler; optional `engine` prop mounts a properties panel |
| `dmn/DmnDrd.vue` | Static SVG rendering of the DRD (off-screen render, best for PDF export) |
| `dmn/DmnTable.vue` | Renders a DMN decision table directly in the DOM |
| `dmn/DmnSimulate.vue` | Renders a decision table with an input form; evaluates it with FEEL and highlights the matched rule (DMN's answer to BPMN token simulation) |
| `dmn/DmnModeler.vue` | Live DMN modeler; optional `engine` prop mounts a properties panel |
| `team-topologies/TeamTopologies.vue` | Static SVG rendering of a Team Topologies document |
| `team-topologies/TeamTopologiesModeler.vue` | Preview plus fullscreen Team Topologies modeler |
| `wardley-maps/WardleyMap.vue` | Static SVG rendering of a Wardley Map |
| `wardley-maps/WardleyMapModeler.vue` | Preview plus fullscreen Wardley Map modeler |
| `event-storming/EventStorming.vue` | Static SVG rendering of an Event Storming board |
| `event-storming/EventStormingModeler.vue` | Preview plus fullscreen Event Storming modeler |
