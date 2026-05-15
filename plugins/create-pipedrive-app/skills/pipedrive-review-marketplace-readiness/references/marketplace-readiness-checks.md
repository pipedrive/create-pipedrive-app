# Marketplace Readiness Checks

Read these files before checking:

- `src/app.ts`
- `package.json`
- `src/pipedrive/client.ts`, if present
- `src/oauth/index.ts`, if present
- all `*.ts` files found by `find src -name "*.ts" | sort`

Collect every failure before reporting.

## 1. Token refresh for direct API calls

Run:

```bash
grep -rn "Authorization\|Bearer\|access_token" src --include="*.ts" | grep -v "src/pipedrive/client.ts"
```

Review each direct `fetch(` or `axios` call with an Authorization header.

Skip safe cases:

- Code inside `src/pipedrive/client.ts`; the SDK wrapper handles refresh.
- Tokens taken directly from the OAuth response in the same function scope.

Fail if a stored token from the database is used in a direct HTTP call without 401 refresh-and-retry handling.

Report:

```text
Token refresh not handled for direct API calls

`src/path/file.ts:line` makes a direct HTTP call using a stored access token without 401 refresh handling.

Fix: Use `getClient(companyId)` from `src/pipedrive/client.ts`, or add a 401 retry that refreshes the token and retries the request.
```

## 2. HTTPS enforced

Run:

```bash
grep -rn "http://" src --include="*.ts"
grep -n "trust proxy" src/app.ts
```

Fail if any production URL uses `http://`; ignore localhost and 127.0.0.1.

Fail if `src/app.ts` does not configure:

```ts
app.set('trust proxy', 1);
```

Report hardcoded HTTP URLs with file and line. For missing proxy trust, tell the developer to add the setting before route definitions.

## 3. Error handling

Run:

```bash
grep -n "NextFunction" src/app.ts
grep -rn "async.*req.*res" src --include="*.ts"
```

Fail if `src/app.ts` has no 4-argument Express error middleware like:

```ts
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});
```

Fail if an async route handler does not wrap its body in `try/catch` and call `next(err)` in the catch.

Report each missing handler by file and line, and tell the developer to wrap the route or add the error middleware.

## 4. Rate limit handling

Run:

```bash
grep -rn "429\|X-RateLimit\|Retry-After" src --include="*.ts"
```

Fail if there is no handling for Pipedrive API rate limits. Pipedrive returns HTTP 429 and rate-limit headers including `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`.

Report:

```text
No rate limit handling

The app does not appear to handle HTTP 429 responses from Pipedrive.

Fix: Add retry/backoff handling for 429 responses, using `Retry-After` or `X-RateLimit-Reset` when present.
```

## Final output

If any checks fail, output only the failing checks and fixes. Do not mention passing checks.

If all checks pass, output:

```text
All marketplace readiness checks passed. Your app is ready to submit.
```
