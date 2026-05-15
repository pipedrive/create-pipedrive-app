---
name: pipedrive-review-marketplace-readiness
description: Review Marketplace readiness. Use when checking a generated Pipedrive app before submission.
allowed-tools: [Read, Bash]
---

# Marketplace Readiness Review

Use `references/marketplace-readiness-checks.md` for the exact checks and report format.

Workflow:

1. Confirm `src/app.ts` and `package.json` exist. If either is missing, tell the developer to run this from the generated app root and stop.
2. Read the context files listed in the reference, then inspect all TypeScript files under `src/`.
3. Run all 4 readiness checks before reporting: token refresh, HTTPS, error handling, and rate limits.
4. Report only failing checks. If none fail, say the app is ready to submit.
