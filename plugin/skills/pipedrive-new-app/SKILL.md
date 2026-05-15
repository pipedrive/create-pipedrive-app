---
name: pipedrive-new-app
description: Scaffold a new Pipedrive Marketplace integration project with OAuth, database, and optional App Extensions. Use when the developer wants to start a new Pipedrive app from scratch.
allowed-tools: [Bash, AskUserQuestion]
---

# New Pipedrive App

Collect the developer's choices, then scaffold the project non-interactively.

## Step 1: Collect inputs

Ask each question separately and wait for the answer before asking the next.

**Project name**
Ask: "What should the project be named? (This will also be the output directory name, e.g. `my-pipedrive-app`)"

**Database**
Ask: "Which database will the app use?" — offer three options: `postgres`, `mysql`, `sqlite`.

**App Extensions**
Ask: "Should the app include App Extensions (iframe UI panels/modals)? If yes, which types — `custom-panel`, `custom-modal`, or both?"

## Step 2: Run the CLI

Assemble the `--app-extensions` value:
- No extensions → `none`
- Custom panel only → `custom-panel`
- Custom modal only → `custom-modal`
- Both → `custom-panel,custom-modal`

Run:

```bash
npx create-pipedrive-app \
  --project-name <name> \
  --database <postgres|mysql|sqlite> \
  --app-extensions <none|custom-panel|custom-modal|custom-panel,custom-modal>
```

## Step 3: Report

After the CLI exits successfully, tell the developer what was created and what to do next (refer to the "Next steps" output printed by the CLI).
