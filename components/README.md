# `components/` — the addon's public surface

Slidev auto-registers **every component in this directory as a global** in the
consuming slide deck (via `unplugin-vue-components`; the addon root's
`components/` dir is scanned by `@slidev/cli`). So a file here becomes usable in
any `.md` slide **without an import**:

```md
<Bpmn src="/diagram.bpmn" />
<BpmnTokenSimulation src="/diagram.bpmn" />
<BpmnModeler engine="zeebe" />
```

That makes this folder the addon's **public API** — put a component here only if
end users should mount it directly.

## Consequences

- **Registered by filename, not path.** A subfolder (`components/ui/Button.vue`)
  still leaks a global `<Button>` into every deck. Don't hide internals here.
- **Internal building blocks live outside `components/`.** Shared UI atoms and
  helpers go in [`../shared/`](../shared) (`shared/ui/*`, `shared/lib/*`) and are
  imported explicitly — they never touch the consumer's global namespace.
- Business/rendering logic sits in [`../composables/`](../composables); engine
  wiring in [`../engines/`](../engines).

## Current components

| Component | Purpose |
|---|---|
| `Bpmn.vue` | Static SVG rendering (off-screen render, best for PDF export) |
| `BpmnTokenSimulation.vue` | Interactive viewer with animated token-flow simulation |
| `BpmnModeler.vue` | Live BPMN modeler; optional `engine` prop mounts a properties panel |
