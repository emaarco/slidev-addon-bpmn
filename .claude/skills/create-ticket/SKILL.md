---
name: create-ticket
disable-model-invocation: false
argument-hint: <bug|refactor|issue> <description>
description: Create a compact GitHub issue with a user-story title and a structured template. Supports three modes — issue (feature/improvement), bug, and refactor. Use when creating any kind of GitHub ticket.
---

# Create GitHub Issue – slidev-addon-bpmn

Create a new GitHub issue for `slidev-addon-bpmn`$ARGUMENTS.

## Your Task

Determine the **ticket type** from the user's input or arguments:

| Type | Trigger keywords | Label |
|------|-----------------|-------|
| `issue` | feature, improvement, enhancement, request, default | `enhancement` |
| `bug` | bug, broken, error, crash, fix, regression | `bug` |
| `refactor` | refactor, cleanup, restructure, tech debt, internal | (no label) |

If the type is ambiguous, ask the user to clarify before proceeding.

---

## Title Format

Keep titles concise (max ~72 characters) and follow the convention for each type:

**issue** — user-story style:
```
As a <persona>, I want <goal> [so that <benefit>]
```

**bug** — broken-behavior style:
```
<Component/Area>: <short description of the broken behavior>
```

**refactor** — imperative style:
```
refactor: <what is being restructured and why>
```

---

## Body Templates

### issue

```markdown
## Summary
<!-- One or two sentences describing the request in plain language. -->

## Current State
<!-- What is the situation today? Describe the gap or missing capability. -->

## Desired State
<!-- What should be possible after this is implemented? -->

## Added Value
<!-- Why does this matter? What benefit does it bring to users or maintainers? -->

## Technical Notes
<!-- Optional: implementation hints, affected files, related issues, or links. -->
```

### bug

```markdown
## Summary
<!-- One or two sentences describing what is broken. -->

## Steps to Reproduce
<!-- Numbered list of steps that reliably trigger the bug. -->

## Current Behavior
<!-- What actually happens (include error messages or stack traces if available). -->

## Expected Behavior
<!-- What should happen instead. -->

## Technical Notes
<!-- Optional: affected files, suspected root cause, environment details, related issues. -->
```

### refactor

```markdown
## Summary
<!-- One or two sentences on what needs to be restructured and why. -->

## Current State
<!-- Describe the existing code structure or design that is problematic. -->

## Desired State
<!-- Describe the target structure or design after the refactor. -->

## Added Value
<!-- What does this improve? (e.g. maintainability, testability, readability) -->

## Technical Notes
<!-- Optional: affected files/modules, migration steps, breaking changes, related issues. -->
```

---

> **Sync note**: The body sections above mirror the YAML form templates in `.github/ISSUE_TEMPLATE/`
> (`feature.yml`, `bug.yml`, `refactor.yml`). When adding, removing, or renaming sections here,
> update the corresponding `.yml` file as well to keep both mechanisms consistent.

## Steps

1. **Identify** the ticket type from the user's input and any surrounding context.
2. **Draft** the title and each section of the matching body template. Keep sections brief — 1–3 sentences is ideal.
3. **Show** the draft to the user and ask for confirmation before creating the issue.
4. **Create** the issue once approved:

```bash
# With label (issue / bug)
gh issue create --title "<title>" --body "<body>" --label "<label>"

# Without label (refactor)
gh issue create --title "<title>" --body "<body>"
```

5. **Report** the URL of the newly created issue to the user.

## Quality Guidelines

- Titles must be specific and actionable — avoid vague titles like "Improve performance".
- Keep each section focused; do not pad with filler text.
- Technical Notes may say "N/A" if there is nothing concrete to add.
- Only add labels that already exist in the repository.