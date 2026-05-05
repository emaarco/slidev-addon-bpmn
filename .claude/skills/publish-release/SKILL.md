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
- All changes are tested and committed

> Note: You do **not** need to be on `main`. The release commit is made on the current branch, merged into main via a PR with automerge.

## Standard Release Workflow

### 1. Bump Version

Check recent releases to determine whether the version was already bumped since the last release. If not, bump it:

```bash
# Bug fixes (1.0.0 → 1.0.1)
npm version patch -m "chore(release): v%s" --no-git-tag-version

# New features (1.0.0 → 1.1.0)
npm version minor -m "chore(release): v%s" --no-git-tag-version

# Breaking changes (1.0.0 → 2.0.0)
npm version major -m "chore(release): v%s" --no-git-tag-version
```

Use `--no-git-tag-version` to skip the automatic git tag — the tag is created later from the GitHub release.

Commit the version bump manually:

```bash
git add package.json package-lock.json
git commit -m "chore(release): v<VERSION>"
```

### 2. Push Branch and Open PR with Automerge

Push the current branch and open a PR targeting `main`. Enable automerge so it lands without manual intervention:

```bash
git push -u origin HEAD

gh pr create \
  --base main \
  --title "chore(release): v<VERSION>" \
  --body "Bump version to v<VERSION> and trigger release." \
  --label "automerge"

gh pr merge --auto --squash
```

> If the repo requires status checks, automerge will wait for them to pass before merging.

### 3. Create a Draft Release

Check previous releases to guide the release notes format:

```bash
gh release list --limit 5
gh release view v<PREV>
```

Then create the draft, pointing at the version tag that will be created once the PR merges and is tagged:

```bash
gh release create v<VERSION> --title "v<VERSION>" --notes "..." --draft
```

### 4. Done

A maintainer reviews and publishes the draft (or it publishes automatically if configured).
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
