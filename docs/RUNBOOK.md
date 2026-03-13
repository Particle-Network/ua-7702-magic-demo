# Runbook

## Service Overview
`ua-7702-demo` is a frontend-only Next.js demo that integrates:

- Magic for embedded wallet authentication and EIP-7702 authorization signing
- Particle Universal Accounts for delegation status, balances, and transaction submission
- Arbitrum RPC access as the default network path, with additional Magic-configured delegation targets on Base, Optimism, Polygon, and BNB Chain

## Deployment Procedure
There is no deployment script defined in `ua-7702-demo/package.json`. Use this baseline process until deployment automation exists:

1. Install dependencies with `npm install` in `ua-7702-demo`.
2. Set production values from `ua-7702-demo/.env.example`.
3. Run `npm run lint`.
4. Run `npm run build`.
5. Start the app with `npm run start` in the target environment.

If a hosting platform is added later, update this document to reference the exact release workflow rather than keeping generic steps.

## Monitoring And Alerts
No application monitoring or alerting configuration is defined in the repository today. Until that exists, monitor the demo with:

- Build status from `npm run build`
- Browser console errors during login, delegation, and transaction flows
- Network request failures to Magic, Particle, or the configured Arbitrum RPC provider
- User-reported issues around delegation status not updating or transactions not completing

## Common Issues And Fixes
| Issue | Symptom | Fix |
|---|---|---|
| Missing env vars | App fails to initialize Magic or Universal Account state | Recreate `.env` from `ua-7702-demo/.env.example` and confirm all required values are set. |
| RPC or credential misconfiguration | Login works but chain actions fail, or provider initialization errors appear | Verify the Magic publishable key, Particle project credentials, and Arbitrum RPC URL. |
| EIP-7702 delegation not applied | Delegation transaction appears to succeed but status remains false | Ensure delegation signing uses `auth.nonce + 1` when the sender and authority are the same EOA. |
| Smart contract example on Arbitrum | Contract helper returns no address or explorer link | Add an explicit Arbitrum branch in `ua-7702-demo/src/utils/smartContract.ts`, or use one of the existing mapped test networks for that example flow. |
| Lint/build regressions | App works in dev but fails in CI or production build | Run `npm run lint` and `npm run build` locally before merge. |

For historical integration details, see `ua-7702-demo/EIP7702-MAGIC-ISSUES.md`.

## Rollback Procedure
Because there is no release automation in-repo, rollback is currently a manual redeploy of the previous known-good version:

1. Identify the last known-good commit or deployment artifact.
2. Restore that revision in the target environment.
3. Re-run `npm run build` if rebuilding is required by the platform.
4. Start the app with `npm run start`.
5. Smoke-test login, delegation status, and a basic transaction path.

## Operational Gaps
- No automated tests are defined in `ua-7702-demo/package.json`.
- No deployment script or infrastructure-as-code is present in the repository.
- No explicit monitoring or paging configuration is tracked in source control.

These gaps should be closed before treating the demo as production-ready.
