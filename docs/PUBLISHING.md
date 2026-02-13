# Publishing Guide

Quick reference for deploying new versions of `slidev-addon-bpmn` to npm. Use this if you want to deploy manually. However, also consider, that we've automated this with a GitHub action

## Prerequisites

- npm account with publish access
- Logged in via `npm login`

## Publishing Workflow

### 1. Make Your Changes

Make your code changes, test them, and commit to git.

### 2. Update Version

Choose the appropriate version bump:

```bash
# Bug fixes (1.0.0 -> 1.0.1)
npm version patch

# New features (1.0.0 -> 1.1.0)
npm version minor

# Breaking changes (1.0.0 -> 2.0.0)
npm version major
```

This will:
- Update `package.json` version
- Create a git commit (if in a clean git repo)
- Create a git tag (if in a clean git repo)

> **Note:** The git commit/tag only happens if you're in a git repository with no uncommitted changes. Use `--no-git-tag-version` to skip git operations.

### 3. Build the Package

```bash
npm run build
```

### 4. Publish to npm

```bash
npm login
npm publish
```

For scoped packages, add `--access public`:
```bash
npm publish --access public
```

### 5. Push to GitHub

```bash
git push
git push --tags
```

## Verify Publication

Check your package:
- npm page: https://www.npmjs.com/package/slidev-addon-bpmn
- Install test: `npm install slidev-addon-bpmn` in a fresh project
