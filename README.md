# create-pipedrive-app

CLI scaffolding tool for Pipedrive Marketplace integrations.

## Usage

```bash
npx create-pipedrive-app <project-name>
```

The CLI will prompt for:

- **Database**: Postgres, MySQL, or SQLite
- **App Extensions**: custom panel, custom modal, or none
- **Webhooks**: yes or no

## Generated project

```
<project-name>/
  src/
    index.ts                  # server entry point (port 3000)
    app.ts                    # Express app with OAuth router (+ optional webhooks/extensions)
    oauth/                    # OAuth 2.0 install, callback, token exchange, refresh
    database/                 # Drizzle ORM schema, migrations, db driver
    pipedrive-client/         # Pipedrive API client wrapper
    webhooks/                 # Webhook handlers (if selected)
    app-extensions/           # App Extensions handlers (if selected)
  frontend/
    app-extension-ui/         # React + Vite iframe UI (if App Extensions selected)
  .env.example
  docker-compose.yml          # Postgres, MySQL, and/or App Extensions UI (if applicable)
  README.md
  package.json
  tsconfig.json
```

The generated project uses **Express + TypeScript + Drizzle ORM** (ESM, Node.js).

When App Extensions are selected, the generated project also includes a shared React iframe app for custom panels and custom modals. `docker-compose up --watch` starts the backend and Vite dev server in containers with Compose Watch. Local Developer Hub iframe URLs should point at an HTTPS tunnel to the Vite dev server, for example `https://<your-vite-tunnel>/extensions/panel` or `https://<your-vite-tunnel>/extensions/modal`. After `npm run build`, production iframe URLs can point at the backend-hosted `/extensions/panel` and `/extensions/modal` routes.

## Next steps after generation

```bash
cd <project-name>
cp .env.example .env
docker-compose up -d db   # if Postgres or MySQL was selected
npm install
npm run dev
```

If App Extensions were selected, use Compose Watch instead of the local dev server:

```bash
docker-compose up --watch
```

Fill in `PIPEDRIVE_CLIENT_ID`, `PIPEDRIVE_CLIENT_SECRET`, and `DATABASE_URL` in `.env`.

## Requirements

- Node.js 18+
- Docker (if using Postgres, MySQL, or App Extensions frontend development)
