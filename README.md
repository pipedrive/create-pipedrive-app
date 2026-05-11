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
  .env.example
  docker-compose.yml          # Postgres or MySQL (if applicable)
  package.json
  tsconfig.json
```

The generated project uses **Express + TypeScript + Drizzle ORM** (ESM, Node.js).

## Next steps after generation

```bash
cd <project-name>
cp .env.example .env
docker-compose up -d   # if Postgres or MySQL was selected
npm install
npm run dev
```

Fill in `PIPEDRIVE_CLIENT_ID`, `PIPEDRIVE_CLIENT_SECRET`, and `DATABASE_URL` in `.env`.

## Requirements

- Node.js 18+
- Docker (if using Postgres or MySQL)
