---
name: pipedrive-api
description: Guide developers on using the Pipedrive REST API v1 within their integration project. Use when a developer wants to query or mutate Pipedrive data (deals, persons, organizations, leads, activities, etc.) from their app.
allowed-tools: [Read, Edit, Bash]
---

# Using the Pipedrive API

## Overview

The Pipedrive REST API v1 base URL is `https://api.pipedrive.com/v1`. It is stateless and returns JSON. Full reference: https://developers.pipedrive.com/docs/api/v1

## Authentication in this project

This project uses **OAuth 2.0**. After a user authorises your app, the access token is stored in the database (`pipedrive_tokens` table). The generated `src/pipedrive/` module handles token retrieval and client initialisation:

```ts
import { getClient } from './pipedrive/client.js';

const client = await getClient(companyId);
```

Use `client` to call the official Pipedrive Node.js SDK (`pipedrive` npm package), which maps directly to the REST API.

## Main resource categories

| Category | Resources |
|----------|-----------|
| CRM core | Deals, Persons, Organizations, Activities, Notes |
| Lead management | Leads, Lead Fields, Lead Labels |
| Sales | Pipelines, Stages, Products, Goals |
| Communication | Webhooks, Call Logs, Mailbox |
| Admin | Users, Roles, Permission Sets |

## Common usage patterns

**List deals:**
```ts
const deals = await client.deals.getDeals({ limit: 50 });
```

**Get a person:**
```ts
const person = await client.persons.getPerson({ id: personId });
```

**Create an activity:**
```ts
await client.activities.addActivity({
  subject: 'Follow-up call',
  type: 'call',
  due_date: '2026-06-01',
});
```

## Adding a new API call

1. Read `src/pipedrive/` to understand the existing wrapper pattern
2. Use `client.<resource>.<method>()` following the SDK method names
3. Handle token expiry — the client wrapper in this project manages token refresh automatically

## Rate limits and pagination

- Rate limits apply per API token / OAuth token — check response headers for `X-RateLimit-*` values
- Paginate large result sets using the `start` and `limit` query parameters
- The SDK returns a `data` array and `additional_data.pagination` object for paginated resources

## Further reading

- API reference: https://developers.pipedrive.com/docs/api/v1
- Node.js SDK: https://github.com/pipedrive/client-nodejs
- OAuth guide: https://pipedrive.readme.io/docs/marketplace-oauth-authorization
