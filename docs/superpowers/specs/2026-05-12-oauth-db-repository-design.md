# OAuth Authorization + DB Token Repository Design

**Date:** 2026-05-12  
**Branch:** AINATIVEM-44  
**Scope:** Generator-side changes to produce working OAuth routes and a Drizzle-backed token repository in the generated project scaffold.

---

## Problem

The current scaffold generates:
- An empty Express router at `src/oauth/index.ts` (no route handlers)
- A `src/pipedrive/client.ts` with TODO stubs for `getStoredToken` and `saveToken`

Developers who run `npx create-pipedrive-app` get a project that cannot complete an OAuth install without manual implementation.

---

## Goals

1. Generate a working OAuth redirect + callback flow out of the box
2. Generate a token repository that wires `pipedrive/client.ts` to the Drizzle DB
3. Introduce no new runtime dependencies
4. Keep generated code readable and easy for developers to extend

---

## Architecture

### Generated files (new or updated)

```
src/
  oauth/
    index.ts            ← full Express router (was empty)
    state.ts            ← NEW: HMAC state helpers (no server storage)
  database/
    tokenRepository.ts  ← NEW: getToken, upsertToken
  pipedrive/
    client.ts           ← updated: imports tokenRepository (removes TODO stubs)
```

### Generator-side changes

| Generator file | Change |
|---|---|
| `src/generators/node/oauth.ts` | Generate `src/oauth/index.ts` + `src/oauth/state.ts` |
| `src/generators/node/database.ts` | Add `generateTokenRepository()` |
| `src/generators/node/pipedriveClient.ts` | Update template to import from `tokenRepository` |

No new `BuildStep` classes or `index.ts` chain changes needed — the existing steps expand internally.

---

## Component Designs

### 1. Token Repository (`src/database/tokenRepository.ts`)

**Pattern:** Functional exports with direct `db` singleton import. No class, no injection — mirrors how `oauth-helper` uses Drizzle and matches the existing `src/database/index.ts` singleton.

```ts
import { db } from './index.js';
import { pipedriveTokens } from './schema.js';
import { eq, and } from 'drizzle-orm';
import type { TokenResponse } from 'pipedrive/v2';

type StoredToken = { companyId: number; userId: number; token: TokenResponse };

export async function getToken(companyId: number, userId: number): Promise<StoredToken | null>
export async function getTokenByCompany(companyId: number): Promise<StoredToken | null>
export async function upsertToken(companyId: number, userId: number, token: TokenResponse): Promise<void>
```

**Type translation:**
- `TokenResponse.expires_in` is relative seconds. The DB schema stores absolute timestamps (`access_token_expires_at`, `refresh_token_expires_at`).
- `upsertToken`: compute `accessTokenExpiresAt = new Date(Date.now() + token.expires_in * 1000)`. For `refreshTokenExpiresAt`, use a fixed 60-day window (Pipedrive refresh tokens last 60 days) since the SDK does not expose this value.
- `getToken`: reconstruct `expires_in = Math.max(0, Math.floor((accessTokenExpiresAt.getTime() - Date.now()) / 1000))`.

**DB operation:** Drizzle `insert(...).onConflictDoUpdate(...)` on the composite PK `(pipedrive_company_id, pipedrive_user_id)`. Handles both first install and re-install (token rotation).

The repository is database-agnostic at the query level; Drizzle handles dialect differences via the `db` instance already configured per the chosen database.

---

### 2. OAuth State (`src/oauth/state.ts`)

**Approach:** HMAC-SHA256 signed state token using Node's built-in `crypto` module — no server-side storage, no extra dependencies, survives restarts, works across multiple server instances.

**Format:** `base64url(payload).HMAC(payload, PIPEDRIVE_CLIENT_SECRET)`  
**Payload:** `{ nonce: hex(16 random bytes), exp: Date.now() + 300_000 }` (5-minute expiry)

```ts
export function createState(): string
export function verifyState(state: string): boolean  // returns false if signature invalid or expired
```

The state value is appended to `oauth2.authorizationUrl` as `&state=...` since the Pipedrive `OAuth2Configuration.authorizationUrl` getter returns the base URL without a state parameter.

---

### 3. OAuth Routes (`src/oauth/index.ts`)

```
GET /oauth/redirect
  → createState()
  → res.redirect(oauth2.authorizationUrl + '&state=' + state)

GET /oauth/callback
  → if (!verifyState(req.query.state)) → res.status(400).send('Invalid state')
  → token = await oauth2.authorize(req.query.code)
  → GET https://{token.api_domain}/v1/users/me with Bearer token
  → companyId = me.data.company_id, userId = me.data.id
  → await upsertToken(companyId, userId, token)
  → res.redirect('/')
```

The `/v1/users/me` call is necessary because `TokenResponse` does not include `company_id` or `user_id`. This is a standard step in the Pipedrive OAuth flow.

Error handling: callback errors (invalid code, revoked token, network failure) return HTTP 500 with a plain error message. Developers are expected to customize error pages.

---

### 4. Updated Pipedrive Client (`src/pipedrive/client.ts`)

The two TODO stubs are replaced with real calls to `tokenRepository`:

```ts
import { getTokenByCompany, upsertToken } from '../database/tokenRepository.js';

export async function getClient(companyId: number) {
  const stored = await getTokenByCompany(companyId);
  // stored includes { companyId, userId, token } — close over userId for onTokenUpdate
  oauth2.updateToken(stored?.token ?? null);
  oauth2.onTokenUpdate = (token) => {
    if (stored) upsertToken(stored.companyId, stored.userId, token);
  };
  // ...
}
```

`getTokenByCompany` returns `{ companyId, userId, token }` for the most recently updated row for that company (ordered by `updated_at DESC`, limit 1). Returning `userId` alongside the token is necessary so `onTokenUpdate` can re-save to the correct `(companyId, userId)` row after a token refresh.

For multi-user access (acting on behalf of different users in the same company), developers extend `getClient(companyId, userId)` and use `getToken(companyId, userId)` directly.

---

## Data Flow

```
User browser
  → GET /oauth/redirect
      createState() → signed state string
      redirect → https://oauth.pipedrive.com/oauth/authorize?client_id=...&state=...
  → Pipedrive auth page (user approves)
  → GET /oauth/callback?code=...&state=...
      verifyState() → valid
      oauth2.authorize(code) → TokenResponse
      GET /v1/users/me → { company_id, id }
      upsertToken(companyId, userId, token)
      redirect → /
  → App loaded; subsequent API calls use getClient(companyId)
      getToken(companyId, 0) → TokenResponse
      oauth2.updateToken(token)
      oauth2.onTokenUpdate = (t) => upsertToken(companyId, 0, t)
      oauth2.getAccessToken() → auto-refreshes if expired, fires onTokenUpdate
```

---

## What Is Not Covered

- **Multi-user per company:** `getClient` stays single-user. Pattern is documented in a code comment for developers to extend.
- **Token revocation / uninstall webhook:** `OAuth2Configuration.revokeToken()` exists in the SDK; a webhook handler stub for `app.marketplace.uninstall` is already handled by the webhooks generator (if enabled).
- **Session-based state:** State is stateless HMAC. If developers need to carry pre-auth user context (e.g., a redirect-after-login URL), they'll add a session library — out of scope for this spec.
- **PHP / Laravel generator:** Not affected. PHP generator still throws "not yet implemented."

---

## Testing

Vitest, consistent with the rest of the test suite.

- `tokenRepository`: generate into `tmpdir`, write a real SQLite DB with Drizzle, call `upsertToken` / `getToken`, assert round-trip correctness of timestamps and fields.
- `state.ts`: unit tests for `createState` / `verifyState` covering valid state, expired state, tampered signature, missing `.` separator.
- `oauth.ts` (generator): generate into `tmpdir`, read back `src/oauth/index.ts` and `src/oauth/state.ts`, assert key strings are present (route paths, HMAC logic, import paths).
- `pipedriveClient.ts` (generator): assert generated file imports `tokenRepository` and does not contain the `TODO` string.
