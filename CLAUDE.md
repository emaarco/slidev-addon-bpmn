# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Slidev addon that enables displaying BPMN 2.0 diagrams in presentations. It uses bpmn-js to render BPMN XML files as SVG elements within Vue components.

## Development Commands

```bash
# Run the example presentation in dev mode (requires git and `npm install -g portless`)
# Dev server URL is branch-based, e.g. http://slidev-addon-bpmn-main.localhost:1355
npm run dev

# Build the example presentation
npm run build

# Export presentation to PDF
npm run export

# Export presentation to PNG screenshots
npm run screenshot
```

## Architecture

### Components

The addon provides three Vue components:

- **`Bpmn.vue`** — Static SVG rendering (off-screen render approach, best for PDF exports)
- **`BpmnTokenSimulation.vue`** — Interactive viewer with animated token flow simulation
- **`BpmnModeler.vue`** — Interactive BPMN modeler for live diagram editing (workshops/trainings). Accepts an optional `engine` prop (`"zeebe"` | `"camunda7"`) that mounts an engine-specific properties panel side-by-side with the canvas. Engine wiring lives in `engines/zeebe.ts` and `engines/camunda7.ts` — one file per engine (SRP); the component picks one via a small `if` in `resolveEngineConfig()`. Adding a new engine = one new file under `engines/` plus one `if` line.

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
- `vite.config.ts` (required Vite configuration)

Everything else (`example.md`, `public/`, `docs/`) is excluded via the `files` field in package.json.

## Testing

Use `example.md` as the test file - it demonstrates the component usage with a sample BPMN diagram (`public/newsletter.bpmn`).

## Development Process
- When working with this repository, always use semantic commit-messages (e.g. feat: add bpmn component)

## Release & Publishing

Use the `/publish-release` skill to create and publish new releases.

## Skills

This repo ships with custom Claude Code skills in `.claude/skills/`. When a task matches an available skill, then use this skill instead of implementing it manually.

| Skill | Command | When to use |
|-------|---------|-------------|
| publish-release | `/publish-release` | Create and publish a new npm release |
| create-ticket | `/create-ticket` | Create a GitHub issue (feature, bug, or refactor) |
