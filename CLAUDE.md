# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Slidev addon that displays diagram-js based models in presentations: BPMN 2.0 processes (via bpmn-js), DMN decisions (via dmn-js), and Team Topologies, Wardley Maps and Event Storming boards (via the Miragon renderers). It replaces the former `slidev-addon-bpmn` and `slidev-addon-dmn` packages and is laid out so further diagram-js modelers can be added next to them.

## Development Commands

```bash
# Run the example deck through portless for a stable, git-worktree-aware .localhost URL.
# One-time per machine: `npx portless service install` (needs sudo).
npm run dev

# Run the dev server directly, without portless (plain port, no stable URL)
npm run dev:app

# Build the example presentation
npm run build

# Export presentation to PDF
npm run export

# Export presentation to PNG screenshots
npm run screenshot

# Run the unit tests (vitest + jsdom)
npm test

# Lint the code (oxlint: correctness rules + the class-first rules below)
npm run lint

# Lint the module graph (layering + modeler isolation + utils leaves + no-circular rules)
npm run lint:deps

# Find unused files, exports and dependencies (knip)
npm run knip
```

## Code Hygiene

Three static-analysis gates run in the `Build` CI workflow (`.github/workflows/build.yml`):

- **`lint`** (oxlint, config in `.oxlintrc.json`) — correctness rules, `max-classes-per-file: 1`, and
  `architecture/no-top-level-functions` (`tools/oxlint/architecture-plugin.mjs`).
- **`lint:deps`** (dependency-cruiser) — enforces the module boundaries in `.dependency-cruiser.cjs`.
- **`knip`** (config in `knip.ts`) — flags unused files, exports and dependencies.
  Entry points are `setup/main.ts` (Slidev auto-loads it to register the components)
  and `components/**/*.vue` (the published surface external decks import). `@slidev/client`
  and `@slidev/types` come from the `@slidev/cli` peer dependency, and
  `@miragon/slidev-toolkit` is the theme in `example.md`'s frontmatter — all three are
  imported outside what knip can see, so they're listed under `ignoreDependencies`.

**Classes first, helpers in `utils/`.** Behaviour in `.ts` files lives in classes, one per file,
named like the file. Stateless helper functions live in a `utils/` folder of their layer
(`src/shared/lib/utils/`, `src/<modeler>/utils/`) and import nothing but other utils. Constant
data objects (`engines/*.ts`, `tokenSimulationViewerModules.ts`) and type-only files
(`src/shared/lib/notation.ts`, `engines/BpmnEngine.ts`) are fine. `.vue` files are exempt: `<script setup>` is the component's
own scope. `npm run lint` rejects top-level functions elsewhere and `lint:deps` keeps `utils/` a leaf.

## Architecture

### Module layout

```
components/<modeler>/   public Vue components (Slidev registers them globally by filename)
src/                    all other production code, published with the package
  <modeler>/              one class per notation role, implementing the interfaces in src/shared/lib/notation.ts
  shared/                 diagram-js infrastructure used by every modeler
    lib/notation.ts           the interfaces a modeler implements (see below)
    lib/DiagramFileLoader.ts  fetches a diagram file + loading/error refs
    lib/StaticSvgRenderer.ts  off-screen render: container, SVG clean-up, unique ids, padding, sizing
    lib/EmbeddedViewer.ts     lifecycle of a live viewer in a slide: wait for size, render once, refit, destroy
    lib/PageStylesheet.ts     adds a stylesheet to the page and removes it again
    lib/utils/                fitDiagram (pad, clamp, centre a canvas viewbox), SVG and URL helpers
    ui/StaticDiagram.vue      renders a StaticNotation from a file or a given source as SVG
    ui/LiveDiagram.vue        renders a LiveNotation in a live viewer (EmbeddedViewer + onSlideEnter)
    ui/DiagramModeler.vue     preview (static or live) + Edit button + fullscreen modeler + properties panel
    ui/FullscreenOverlay.vue  fullscreen overlay that keeps key strokes from Slidev's navigation
    ui/ToolbarButton.vue      toolbar button used by the interactive components
setup/main.ts           demo deck only (Slidev auto-loads <deck root>/setup/): registers the BPMN components
tools/oxlint/           the architecture lint rule
tests/                  mirrors components/ and src/
```

Only `components/` and `src/` ship; `setup/` is a Slidev convention of the demo deck, like
`example.md` and `public/`.

The vue components have to live under `components/`: Slidev only registers components from
`<root>/components` (subfolders included, by filename). Nothing but components may live there,
because every `.vue`/`.ts` file in it becomes a global in the consuming deck — see
`components/README.md`.

dependency-cruiser enforces that imports only point "down" (`components/` → `src/<modeler>/` →
`src/shared/`, with `src/shared/` as a leaf) and that **one modeler never imports another**:
`bpmn` and `dmn` only meet in `src/shared/`.

### The notation seam (`src/shared/lib/notation.ts`)

Every component is a thin wrapper that hands a notation object to a shared UI component:

| Interface | Implemented by | Used by |
|---|---|---|
| `StaticNotation` — `rendering: 'static'`, `exportSvg(source, container)` | `BpmnDiagramNotation`, `DrdDiagramNotation`, `TeamTopologiesNotation`, `WardleyMapNotation`, `EventStormingNotation` | `StaticDiagram.vue` |
| `LiveNotation` — `rendering: 'live'`, `createViewer(container)` → `LiveViewer { show, fit?, destroy }` | `BpmnModelerNotation`, `BpmnTokenSimulationNotation`, `DmnModelerNotation`, `DecisionTableNotation` | `LiveDiagram.vue`, `EmbeddedViewer` |
| `ModelerNotation` — `blankSource`, `hasPropertiesPanel?`, `openModeler(source, { canvas, propertiesPanel? })` → `ModelerSession { exportChanges, resized?, destroy }` | `BpmnModelerNotation`, `DmnModelerNotation`, the three Miragon notations | `DiagramModeler.vue` |

`DiagramModeler` picks the preview from the `rendering` discriminant: a live viewer for BPMN and
DMN, a static SVG otherwise. It hands the modeler a properties-panel container exactly when the
notation declares `hasPropertiesPanel`; the sessions configure a panel only when they get one.
On Close it awaits `exportChanges()`, which resolves `null` when nothing was edited, and
re-renders the preview only for a new source. BPMN tracks `commandStack.changed`; DMN and the
Miragon notations compare against the source they serialised right after import.

**Adding a modeler** = a `components/<name>/` folder for its components, a `src/<name>/`
folder with a notation class, its entries in `vite.config.ts` `optimizeDeps.include`, and tests
under `tests/`. The isolation rule covers the new folder without changes. Implement
`StaticNotation` and `ModelerNotation` in one class, then wrap `src/shared/ui/StaticDiagram.vue` and
`src/shared/ui/DiagramModeler.vue` in two thin components — see `src/wardley-maps/WardleyMapNotation.ts`
and `components/wardley-maps/`.

### BPMN (`components/bpmn/`, `src/bpmn/`)

- **`Bpmn.vue`** — static SVG via `BpmnDiagramNotation` (best for PDF exports).
- **`BpmnTokenSimulation.vue`** — `LiveDiagram` with `BpmnTokenSimulationNotation`; its viewer
  (`BpmnSimulationViewer`) scales the simulation chrome via `--bts-toggle-scale`. With `engine` +
  `scenariosFilePath` it adds `@emaarco/bpmn-js-data-simulation`; the scenarios are loaded once
  when the first viewer is created. The Expand button opens a second `EmbeddedViewer` in a
  `FullscreenOverlay`.
- **`BpmnModeler.vue`** — `DiagramModeler` with `BpmnModelerNotation`. `engine` (`"zeebe"` |
  `"camunda7"`) mounts the properties panel; the engine wiring lives in `src/bpmn/engines/`
  (one `BpmnEngine` file per engine, registered in `engines/bpmnEngines.ts`, which also derives
  the `Engine` type). Adding an engine = one file plus one registry entry. `tokenSimulation` adds
  the token simulation to preview and modeler. `transactionBoundaries` shows the
  `camunda-transaction-boundaries` overlay; it only takes effect with an engine whose
  `supportsTransactionBoundaries` is set (`camunda7`, which reads `camunda:asyncBefore`/`asyncAfter`).
  `BpmnModelerSession` builds the modeler config and tracks `commandStack.changed`.

### DMN (`components/dmn/`, `src/dmn/`)

- **`DmnDrd.vue`** — static SVG of the DRD via `DrdDiagramNotation` (opens the `drd` view, `fontSize` prop).
- **`DmnTable.vue`** — `LiveDiagram` with `DecisionTableNotation`: decision tables are HTML, not SVG,
  so they render in the DOM. Opens the table selected by `decisionId` (or the first one). Shared
  table styling is `src/dmn/decisionTable.css`.
- **`DmnSimulate.vue`** — decision table plus an input form, using `EmbeddedViewer` directly
  because the table is teleported to `<body>` in fullscreen. `DecisionSimulation` wraps
  `parseDecisionModelFromXml` / `evaluateDecision` from
  [`@emaarco/dmn-js-simulation`](https://github.com/emaarco/dmn-simulation) (FEEL via `feelin`, full
  DMN hit-policy set). `RuleHighlighter` gives reported rules the `sim-match` class and rules that
  matched but were dropped by the hit policy `sim-candidate`. One demo slide per hit policy lives
  in the appendix of `example.md` (`public/hit-policies/*.dmn`).
- **`DmnModeler.vue`** — `DiagramModeler` with `DmnModelerNotation`: live DRD preview
  (`DrdLiveViewer`, never enlarged past native size) and a fullscreen `dmn-js/lib/Modeler`. With
  `engine="camunda"` `DmnModelerSession` mounts `dmn-js-properties-panel`: a `DmnEngine`'s
  `drdModules` are nested under the modeler's **`drd:` key** (dmn-js modelers are composed of
  per-view editors), with `moddleExtensions` at the top level. Without a `dmnFilePath`
  it starts from a blank DMN.

### Team Topologies, Wardley Maps and Event Storming

Each notation has two thin components under `components/<notation>/` and one notation class under
`src/<notation>/` (`TeamTopologiesNotation`, `WardleyMapNotation`, `EventStormingNotation`)
implementing `StaticNotation` and `ModelerNotation`.

- **Team Topologies** files are JSON. They are validated with `parseDocument` from
  `@miragon/team-topologies-schema-model` before `importDocument()` and written back with
  `serializeDocument()`.
- **Wardley Maps** (OWM text) and **Event Storming** boards (`.storm` text) go through
  `importDSL()` / `exportDSL()`.
- The read-only `Viewer` of `@miragon/wardley-renderer` and `@miragon/event-storming-renderer`
  clears a `commandStack` on import without registering one, so both notations pass diagram-js's
  command module via `additionalModules`. Drop that once the renderers register it themselves;
  each static component has a test guarding it.
- **Renderer stylesheets are only applied while a modeler is open.** They style `.djs-palette` and
  other diagram-js classes globally, so loading several of them at once breaks each other's palette
  and the BPMN/DMN modelers. The modeler components import the CSS with `?inline` and
  `DiagramModeler` attaches it (`PageStylesheet`) on open and removes it on close. The static
  viewers need no CSS: `saveSVG()` returns a self-contained SVG.
- **BPMN and DMN CSS is one stylesheet per modeler**, imported globally by every component of that
  modeler because the live previews need it: `src/bpmn/bpmn.css` (bpmn-js, properties panel,
  token and data simulation, plus the `.bpmn-simulation-chrome` rules a `BpmnSimulationViewer`
  applies to its container) and `src/dmn/dmn.css` (dmn-js, properties panel, `decisionTable.css`).
  They pull the library CSS in via `@import`, which Vite resolves. A new library stylesheet goes
  there, not into a component. `DiagramModeler` shrinks the bpmn.io watermark of a live preview.

### Key Implementation Details

- **Static rendering** (`StaticSvgRenderer`) uses an off-screen container with a **fixed 1920x1080
  size** — this may clip large diagrams or waste space for small ones. It gives every id in an
  exported SVG a per-render suffix: the Event Storming renderer uses a fixed id for its sticky
  shadow filter; with two boards in one deck, `url(#id)` would otherwise resolve to the first
  board and stop rendering once that slide is hidden.
- **Live rendering** (`EmbeddedViewer`): Slidev preloads hidden slides with zero-size containers
  and calls both `onMounted` and `onSlideEnter`. `show()` waits up to 5s for a size, renders each
  source once, serialises concurrent calls and resolves `false` when the slide stays hidden, so
  the next `onSlideEnter` retries. A `ResizeObserver` refits the viewer.
- **Key strokes:** the renderers handle shortcuts on `document`, Slidev navigates on `window`.
  While a `FullscreenOverlay` is open it stops `keydown` at `document`, so Delete, undo and the
  arrow keys reach the modeler without changing the slide.
- Diagram file paths are resolved relative to `window.location.origin + import.meta.env.BASE_URL`
  (`src/shared/lib/utils/resolveWithinBase.ts`).
- `fitDiagram` lets a small diagram grow up to 2× by default. BPMN components expose that cap as
  the `maxScale` prop; the DMN DRD preview passes `1` so it is never enlarged past its native size.
- The `engine` props are typed per modeler as the keys of its registry (`bpmnEngines`:
  `'zeebe' | 'camunda7'`, `dmnEngines`: `'camunda'`).

### Vite Configuration

The `vite.config.ts` file is **critical** for this addon to work. It lists the bpmn-js and dmn-js entry points (viewer, modeler, properties panels, simulation) and the Miragon renderers in Vite's dependency optimization to prevent runtime module resolution issues in Slidev projects.

## Package Distribution

The npm package includes only:
- `components/` directory (`bpmn/*.vue`, `dmn/*.vue`, `team-topologies/*.vue`, `wardley-maps/*.vue`, `event-storming/*.vue`)
- `src/` directory (`shared/` plus one folder per modeler with its notation classes, `engines/*`, `utils/*` and the `bpmn.css` / `dmn.css` stylesheets)
- `vite.config.ts` (required Vite configuration)

Everything else (`example.md`, `public/`, `docs/`, `setup/`, `tests/`, `tools/`) is excluded via the `files` field in package.json.

## Testing

`npm test` runs the vitest suites under `tests/`. Use `example.md` as the manual test deck — it demonstrates every component with sample diagrams (`public/newsletter.bpmn`, `public/example.dmn`, `public/hit-policies/*.dmn`, `public/online-shop.tt`, `public/tea-shop.owm`, `public/order-checkout.storm`).

The toolkit theme has `bpmn` and `dmn` layouts but none for the other notations. Their demo slides use the toolkit's `mermaid` layout: it puts the default slot into a `DiagramFrame` and takes a `::caption::`, which gives the same framed look.

## Development Process
- When working with this repository, always use semantic commit-messages (e.g. feat: add bpmn component)

## Release & Publishing

Releases are automated by the single `release-please.yml` workflow, built on
[release-please](https://github.com/googleapis/release-please). Land conventional
commits on `main` (`feat:`, `fix:`, `feat!:`) — release-please opens a
`chore(main): release X.Y.Z` PR with the version bump and `CHANGELOG.md` diff. Merging that
PR tags the commit and publishes a GitHub Release; the same workflow then runs its gated
`publish` job (`npm publish --provenance`) and `deploy-pages` job (publish the example to
GitHub Pages). The workflow exposes a `dry_run` input via `workflow_dispatch` that runs a
`publish-dry-run` job (`npm publish --dry-run`) without creating a release or publishing.

**Betas:** to try a change in a real deck before it is released, run the workflow manually on
the branch with a `beta_version` such as `2.2.0-beta.0` (the version the change will be released
as, plus `-beta.N`). The `publish-beta` job publishes that branch under the `beta` dist-tag with
provenance. The version is set in the runner only: nothing is committed, tagged or released,
`latest` does not move, and release-please keeps counting from the last stable version. A beta
run skips every other job; add `dry_run` to rehearse it. A published version can never be
reused, so the next one is `-beta.1`. A deck pins the exact version
(`npm i slidev-addon-diagram-js@2.2.0-beta.0`).
