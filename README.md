# create-pipedrive-app

CLI scaffolding tool for Pipedrive Marketplace integrations. Generates an Express + TypeScript + Drizzle ORM project with OAuth 2.0, a Pipedrive API client, and optional App Extensions frontend (React + Vite). The CLI can be used standalone without any AI tooling.

## Usage

```bash
npx create-pipedrive-app
```

The CLI prompts for:

- **Project name**
- **Database**: Postgres, MySQL, or SQLite
- **App Extensions**: custom panel, custom modal, or neither

## Generated project

```
<project-name>/
  src/
    index.ts                  # server entry point
    app.ts                    # Express app with OAuth router (+ optional App Extensions)
    oauth/                    # OAuth 2.0 install, callback, token exchange, refresh
    pipedrive/                # Pipedrive API client wrapper
    database/                 # Drizzle ORM schema, migrations, db driver
    app-extensions/           # App Extensions handlers (if selected)
  frontend/
    app-extension-ui/         # React + Vite iframe UI (if App Extensions selected)
  .env.example
  docker-compose.yml
  README.md
  package.json
  tsconfig.json
```

The generated project uses **Express + TypeScript + Drizzle ORM** (ESM, Node.js).

When App Extensions are selected, the project includes a shared React iframe app for custom panels and modals. `docker-compose up --watch` starts the backend and Vite dev server in containers with Compose Watch. Local Developer Hub iframe URLs must point at an HTTPS tunnel to the Vite dev server — for example `https://<your-vite-tunnel>/extensions/panel` or `https://<your-vite-tunnel>/extensions/modal`. After `npm run build`, production iframe URLs can point at the backend-hosted routes.

## Requirements

- Node.js (to run `npx create-pipedrive-app`)
- Docker (for Postgres/MySQL databases and App Extensions development)

## Using with an AI coding assistant

The package ships plugins for **Claude Code** and **Codex** that wrap the CLI with guided slash commands. The plugins require the CLI — they call `npx create-pipedrive-app` under the hood.

### Claude Code

This repository acts as the Claude Code plugin marketplace. Claude reads the marketplace catalog from `.claude-plugin/marketplace.json`, then installs the plugin from `plugin/`.

Install the plugin with:

```bash
claude plugin marketplace add pipedrive/create-pipedrive-app
claude plugin install create-pipedrive-app@pipedrive
```

Inside Claude Code, use the equivalent slash commands:

```text
/plugin marketplace add pipedrive/create-pipedrive-app
/plugin install create-pipedrive-app@pipedrive
/reload-plugins
```

The plugin calls `npx create-pipedrive-app` under the hood, so the npm package must also be published or otherwise available to users.

### Codex

```bash
codex plugin marketplace add pipedrive/create-pipedrive-app
codex plugin add create-pipedrive-app@pipedrive
```

### Available commands

Both plugins expose the same slash commands:

| Command | What it does |
|---------|-------------|
| `/pipedrive-new-app` | Scaffold a new integration project |
| `/pipedrive-add-app-extension` | Add a custom panel or modal extension |
| `/pipedrive-api` | Get guidance on using the Pipedrive API |
| `/pipedrive-review-marketplace-readiness` | Check for gaps before submitting to the marketplace |
