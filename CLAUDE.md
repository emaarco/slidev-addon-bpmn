# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Slidev addon that enables displaying BPMN 2.0 diagrams in presentations. It uses bpmn-js to render BPMN XML files as SVG elements within Vue components.

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

# Lint the module graph (layering + no-circular rules)
npm run lint:deps

# Find unused files, exports and dependencies (knip)
npm run knip
```

## Code Hygiene

Two static-analysis gates run in the `Build` CI workflow (`.github/workflows/build.yml`):

- **`lint:deps`** (dependency-cruiser) — enforces the source layering in `.dependency-cruiser.cjs`.
- **`knip`** (config in `knip.ts`) — flags unused files, exports and dependencies.
  Entry points are `setup/main.ts` (Slidev auto-loads it to register the components)
  and `components/*.vue` (the published surface external decks import). `@slidev/client`
  and `@slidev/types` come from the `@slidev/cli` peer dependency, and
  `@miragon/slidev-toolkit` is the theme in `example.md`'s frontmatter — all three are
  imported outside what knip can see, so they're listed under `ignoreDependencies`.

## Architecture

### Components

The addon provides three Vue components:

- **`Bpmn.vue`** — Static SVG rendering (off-screen render approach, best for PDF exports)
- **`BpmnTokenSimulation.vue`** — Interactive viewer with animated token flow simulation
- **`BpmnModeler.vue`** — Interactive BPMN modeler for live diagram editing (workshops/trainings). Accepts an optional `engine` prop (`"zeebe"` | `"camunda7"`) that mounts an engine-specific properties panel side-by-side with the canvas. Engine wiring lives in `engines/zeebe.ts` and `engines/camunda7.ts` — one file per engine (SRP); the component picks one via a small `if` in `resolveEngineConfig()`. Adding a new engine = one new file under `engines/` plus one `if` line. Also accepts a `transactionBoundaries` prop (default `false`) that overlays Camunda 7 transaction boundaries via the `camunda-transaction-boundaries` module (registered in `engines/camunda7.ts`); it only takes effect with `engine="camunda7"` since the visualization reads `camunda:asyncBefore`/`asyncAfter` from the Camunda moddle.

#### Bpmn.vue (Static Viewer)

The `Bpmn.vue` component at `components/Bpmn.vue`:

1. **Fetches BPMN XML**: Loads `.bpmn` files from the `public/` folder via fetch
2. **Renders using bpmn-js**: Creates an off-screen DOM container (1920x1080) to render the diagram
3. **Exports to SVG**: Extracts the rendered SVG from bpmn-js viewer
4. **Injects into template**: Inserts the SVG with responsive sizing into the component's DOM

### Key Implementation Details

- The component uses an **off-screen rendering approach** because bpmn-js requires a DOM element to render
- The off-screen container has a **fixed 1920x1080 size** (line 55-56 in Bpmn.vue) - this may clip large diagrams or waste space for small ones
- SVG sizing is controlled via `maxWidth` and `height` style properties with `preserveAspectRatio="xMidYMid meet"` for responsive scaling
- The BPMN file path is resolved relative to `window.location.origin + import.meta.env.BASE_URL`

### Vite Configuration

The `vite.config.ts` file is **critical** for this addon to work. It includes bpmn-js and its dependencies (`min-dom`, `domify`) in Vite's dependency optimization to prevent runtime module resolution issues in Slidev projects.

## Package Distribution

The npm package includes only:
- `components/` directory (Bpmn.vue, BpmnTokenSimulation.vue, BpmnModeler.vue)
- `composables/` directory (useBpmn.ts)
- `engines/` directory (types.ts, zeebe.ts, camunda7.ts)
- `shared/` directory (`ui/ToolbarButton.vue`, `lib/fitDiagram.ts`)
- `vite.config.ts` (required Vite configuration)

Everything else (`example.md`, `public/`, `docs/`) is excluded via the `files` field in package.json.

## Testing

Use `example.md` as the test file - it demonstrates the component usage with a sample BPMN diagram (`public/newsletter.bpmn`).

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
