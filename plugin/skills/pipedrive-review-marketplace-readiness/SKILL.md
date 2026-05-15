---
name: pipedrive-review-marketplace-readiness
description: Review a Pipedrive Marketplace integration project for readiness. Checks the project for missing requirements and reports only what needs to be fixed before submission.
allowed-tools: [Read, Bash]
---

# Marketplace Readiness Review

Checks 4 requirements for marketplace submission readiness. Reports only what is missing. If nothing is missing, the app is ready to submit.

## Precondition

Check that `src/app.ts` and `package.json` exist in the current directory. If they do not exist, tell the developer to run this skill from their project root and stop.

## Gather project context

Read these files:

- `src/app.ts`
- `package.json`
- `src/pipedrive/client.ts` (if it exists)
- `src/oauth/index.ts` (if it exists)

Find all TypeScript source files:

```bash
find src -name "*.ts" | sort
```

Read all files found.

## Run all 4 checks

Collect all failures before reporting. Do not stop at the first failure.

---

### Check 1: Token refresh for non-SDK API calls

Scan source files for `fetch(` or `axios` calls (including `axios.get`, `axios.post`, etc.) that include an Authorization header with a token value.

Run:

```bash
grep -rn "Authorization\|Bearer\|access_token" src --include="*.ts" | grep -v "src/pipedrive/client.ts"
```

Review each match to determine the token source (see below).

For each match:

1. Is it inside `src/pipedrive/client.ts`? → Skip. The SDK wrapper handles token refresh automatically via `onTokenUpdate`.
2. Is the token taken directly from an OAuth response in the same function scope (e.g., `token.access_token` where `token` is the return value of `oauth2.authorize()`)? → Skip. This is a fresh token — no refresh needed.
3. Is the token retrieved from the database (e.g., via `getTokenByCompany`, `stored.token`, `row.accessToken`, or similar)? → This is a stored token that can expire. Check if the same code path handles 401 responses by refreshing the token and retrying.

**Fail condition:** A stored token is used in a direct HTTP call without 401/refresh handling.

**Report if failing:**

Identify the specific file and line. Then output:

  ❌ Token refresh not handled for direct API calls

  `src/path/to/file.ts` makes a direct HTTP call using a stored access token without handling 401 responses. When the token expires, this call will fail silently.

  Fix: Either use `getClient(companyId)` from `src/pipedrive/client.ts` (which handles refresh automatically), or add a 401 retry that refreshes the token and retries the request.

---

### Check 2: HTTPS enforced

**Sub-check A — no hardcoded HTTP URLs:**

Run:

```bash
grep -rn "http://" src --include="*.ts" | grep -v "localhost" | grep -v "127.0.0.1"
```

Any output is a failure. List each match with file and line number.

**Report if sub-check A failing:**

  ❌ Hardcoded HTTP URLs found

  The following URLs use HTTP instead of HTTPS:
  - `src/path/to/file.ts:42`: `http://example.com/endpoint`

  Fix: Replace with `https://` URLs. Pipedrive requires all external calls to use HTTPS in production.

**Sub-check B — trust proxy configured:**

Run:

```bash
grep -n "trust proxy" src/app.ts
```

No output is a failure.

**Report if sub-check B failing:**

  ❌ trust proxy not configured

  `src/app.ts` does not set `trust proxy`. Without it, Express cannot detect the protocol used by the
  client when the app runs behind a reverse proxy (Nginx, load balancer, etc.). This breaks HTTPS
  enforcement and secure cookie handling in production.

  Fix: Add to `src/app.ts` before any route definitions:

  ```ts
  app.set('trust proxy', 1);
  ```

---

### Check 3: Error handling

**Sub-check A — Express error handler in app.ts:**

Run:

```bash
grep -n "NextFunction" src/app.ts
```

This will match both the import line and any usage. Look specifically for a 4-argument middleware with the signature `(err: Error, _req: Request, res: Response, _next: NextFunction)` — ignore any lines that are just import statements. If no such handler exists (only the import line matches), this sub-check fails.

**Report if sub-check A failing:**

  ❌ No Express error handler

  `src/app.ts` has no error-handling middleware. Unhandled errors will crash the process or send empty
  responses to the client.

  Fix: Add before `export default app`:

  ```ts
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: err.message });
  });
  ```

**Sub-check B — async route handlers with try/catch:**

Run:

```bash
grep -rn "async.*req.*res" src --include="*.ts"
```

For each async route handler found, read the surrounding code and verify the function body has a try/catch block that calls `next(err)` in the catch. If any handler lacks it, this sub-check fails.

**Report if sub-check B failing:**

  ❌ Async route handlers without error handling

  The following route handlers do not catch errors:
  - `src/path/to/file.ts:15`

  Fix: Wrap each async handler body in try/catch and pass errors to next:

  ```ts
  router.get('/example', async (req, res, next) => {
    try {
      // handler logic
    } catch (err) {
      next(err);
    }
  });
  ```

---

### Check 4: Rate limit handling

Run:

```bash
grep -rn "429\|X-RateLimit\|Retry-After" src --include="*.ts"
```

**Fail condition:** No matches found.

**Report if failing:**

  ❌ No rate limit handling

  Pipedrive enforces API rate limits per OAuth token. When the limit is exceeded, the API returns HTTP
  429. Without handling this, your app will silently fail under load.

  Headers returned on every API response:
  - `X-RateLimit-Limit` — requests allowed per 10 seconds
  - `X-RateLimit-Remaining` — requests remaining in the current window
  - `X-RateLimit-Reset` — Unix timestamp when the limit resets

  Fix: Add 429 handling to your API calls. Example retry pattern:

  ```ts
  async function callWithRetry(fn: () => Promise<Response>): Promise<Response> {
    const response = await fn();
    if (response.status === 429) {
      const resetAt = Number(response.headers.get('X-RateLimit-Reset')) * 1000;
      const delay = Math.max(resetAt - Date.now(), 1000);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fn();
    }
    return response;
  }
  ```

  Reference: https://pipedrive.readme.io/docs/core-api-concepts-rate-limiting#http-headers-and-response-codes

---

## Output

If all 4 checks pass:

  ✅ All marketplace readiness checks passed. Your app is ready to submit.

If any checks fail, output only the failing checks using the report formats above. Do not mention passing checks.
