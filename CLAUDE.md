# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Slidev addon that enables displaying BPMN 2.0 diagrams in presentations. It uses bpmn-js to render BPMN XML files as SVG elements within Vue components.

## Development Commands

```bash
# Run the example presentation in dev mode
npm run dev

# Build the example presentation
npm run build

# Export presentation to PDF
npm run export

# Export presentation to PNG screenshots
npm run screenshot
```

## Architecture

### Core Component

The addon consists of a single Vue component at `components/Bpmn.vue` that:

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
- `components/` directory (the Bpmn.vue component)
- `vite.config.ts` (required Vite configuration)

Everything else (`example.md`, `public/`, `docs/`) is excluded via the `files` field in package.json.

## Testing

Use `example.md` as the test file - it demonstrates the component usage with a sample BPMN diagram (`public/newsletter.bpmn`).

## Development Process
- When working with this repository, always use semantic commit-messages (e.g. feat: add bpmn component)

## Release & Publishing

This project uses automated npm publishing via GitHub Actions. When a GitHub release is published, the workflow automatically publishes to npm.

### Creating a New Release

Use the GitHub CLI to create releases:

```bash
# 1. Check current version and previous releases
gh release list --limit 5

# 2. Update version in package.json if needed
# (The version should already be bumped before creating the release)

# 3. Push any local tags to remote
git push origin v<VERSION>

# 4. Create a draft release with release notes
# When creating the notes, consider the previous ones as an example
gh release create v<VERSION> --title "v<VERSION>" --notes "..." --draft

# 5. After that you're done. A maintainer will review and publish the draft
```

**Automated Publishing**: When the release is published (draft=false), the GitHub Action automatically runs `npm publish` using OIDC authentication.

**Manual Publishing**: For manual publishing or if automation fails, see [docs/PUBLISHING.md](docs/PUBLISHING.md)

### Release Notes Format

Follow the existing format from previous releases:
- Start with "🚀 Release – slidev-addon-bpmn v<VERSION>"
- Include "What's New" section with key features
- List all features (carry forward from previous release if needed)
- Include usage examples
- End with "Full Changelog" link comparing previous to current version