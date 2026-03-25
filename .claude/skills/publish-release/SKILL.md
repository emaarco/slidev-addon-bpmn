---
name: publish-release
disable-model-invocation: true
argument-hint: <version>
description: Create a new release for slidev-addon-bpmn and publish to npm via GitHub Actions. Use when releasing a new version.
---

# Publish Release – slidev-addon-bpmn

Create a new release for `slidev-addon-bpmn`$ARGUMENTS.

## Permission Required

**Before taking any action**, summarize the release steps you are about to execute and ask the user for explicit confirmation to proceed. Do not run any commands until the user approves.

## Pre-flight Checks

After receiving approval, verify:
- Working directory is clean: `git status`
- You are on the `main` branch
- All changes are tested and committed

## Standard Release Workflow (Automated via GitHub Actions)

When a GitHub release is published (draft=false), the GitHub Action automatically runs `npm publish` using OIDC authentication.

### 1. Bump Version

If the version wasn't already updated, you can bump it using `npm version`. You can find out whether it was already updated or not, by checking the most recent releases and comparing the version numbers. If you aren't sure, ask for response.

```bash
# Bug fixes (1.0.0 → 1.0.1)
npm version patch

# New features (1.0.0 → 1.1.0)
npm version minor

# Breaking changes (1.0.0 → 2.0.0)
npm version major
```

Use a semantic commit message: `npm version patch -m "chore(release): v%s"`

This updates `package.json`, creates a git commit, and creates a git tag (requires a clean git repo). Use `--no-git-tag-version` to skip git operations if needed.

### 2. Push to GitHub

If you have updated the version, push the changes to GitHub. If not, you can skip this step.

```bash
git push
git push --tags
```

### 3. Create a Draft Release

Check previous releases to guide the release notes format, then create the draft:

```bash
gh release list --limit 5
gh release create v<VERSION> --title "v<VERSION>" --notes "..." --draft
```

### 4. Done

A maintainer will review and publish the draft. 
Publishing the release triggers the GitHub Action to run `npm publish` automatically.

## Release Notes Format

Follow this format consistently:

- Start with `🚀 Release – slidev-addon-bpmn v<VERSION>`
- Include a **What's New** section with key features
- List all features (carry forward from previous release if unchanged)
- Only include usage examples if something functional has changed (e.g., new component, changed API)
- End with a **Full Changelog** link:
  `https://github.com/emaarco/slidev-addon-bpmn/compare/v<PREV>...v<VERSION>`

Use previous release notes as a reference: `gh release view v<PREV>`

## Manual Publishing (Fallback)

Use this if automation fails or for an out-of-band publish.
Do never invoke this yourself. Only if you are asked to do so.
Even then ask for explicit confirmation first.

### Prerequisites

- npm account with publish access to `slidev-addon-bpmn`
- Logged in via `npm login`

### Steps

```bash
# 1. Bump version (patch / minor / major)
npm version patch

# 2. Build the package
npm run build

# 3. Publish to npm
npm publish

# 4. Push commits and tags to GitHub
git push
git push --tags
```

For scoped packages, add `--access public` to the publish command.

### Verify Publication

- npm page: https://www.npmjs.com/package/slidev-addon-bpmn
- Install test: `npm install slidev-addon-bpmn` in a fresh project