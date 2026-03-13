# Contributing

## Scope
This repository currently centers on the `ua-7702-demo` app, a Next.js demo for Particle Universal Accounts in EIP-7702 mode with Magic embedded wallets.
The default network label and primary RPC path are Arbitrum-focused, while the delegation UI also exposes Base, Optimism, Polygon, and BNB Chain as supported delegation targets through Magic's configured EVM extension.

## Development Workflow
1. Install dependencies in `ua-7702-demo` with `npm install`.
2. Copy `ua-7702-demo/.env.example` to `.env` and fill in your own Magic and Particle credentials.
3. Start the app with `npm run dev`.
4. Open `http://localhost:3000` and validate the login, delegation, and convert flows manually.
5. Keep documentation aligned with `ua-7702-demo/package.json` scripts and `ua-7702-demo/.env.example`.

## Available Scripts
Source of truth: `ua-7702-demo/package.json`

| Script | Command | Purpose |
|---|---|---|
| `npm run dev` | `next dev` | Starts the Next.js development server for local work. |
| `npm run build` | `next build` | Creates a production build and surfaces compile-time issues. |
| `npm run start` | `next start` | Runs the production server from a built app. |
| `npm run lint` | `next lint --fix` | Runs Next.js ESLint checks and applies safe autofixes where possible. |

## Environment Setup
Source of truth: `ua-7702-demo/.env.example`

| Variable | Required | Purpose | Example Format |
|---|---|---|---|
| `NEXT_PUBLIC_MAGIC_API_KEY` | Yes | Magic publishable API key used to initialize the embedded wallet SDK. | `pk_live_...` |
| `NEXT_PUBLIC_BLOCKCHAIN_NETWORK` | Yes | Network selector consumed by app utilities. The current demo is configured for Arbitrum One. | `arbitrum` |
| `NEXT_PUBLIC_PROJECT_ID` | Yes | Particle project identifier for Universal Accounts API access. | `uuid-or-project-id` |
| `NEXT_PUBLIC_CLIENT_KEY` | Yes | Particle client key for frontend SDK initialization. | `client-key-string` |
| `NEXT_PUBLIC_APP_ID` | Yes | Particle app UUID. | `uuid` |
| `NEXT_PUBLIC_ARB_RPC_URL` | Recommended | RPC endpoint used by Magic for Arbitrum operations. The app falls back to the public Arbitrum RPC if omitted. | `https://arb-mainnet.g.alchemy.com/v2/...` |
| `NEXT_PUBLIC_ETH_RPC_URL` | Optional | Ethereum Mainnet RPC URL. Only used if you extend `MagicProvider` to include Ethereum mainnet in the configured chains. | `https://eth-mainnet.g.alchemy.com/v2/...` |

## Testing Procedures
There are no automated test scripts in `ua-7702-demo/package.json` today. Use this minimum manual verification checklist:

| Area | Procedure |
|---|---|
| App boot | Run `npm run dev` and confirm the app loads without compile errors. |
| Production build | Run `npm run build` to catch type and bundling regressions before merge. |
| Linting | Run `npm run lint` and address any remaining issues that are not autofixed. |
| Auth flow | Log in with Magic Email OTP and confirm the EOA/user info loads. |
| Delegation flow | Trigger EIP-7702 delegation and confirm chain status updates to delegated. |
| Transaction flow | Run a convert/send path after delegation and verify the transaction completes. |

## Documentation Notes
- Keep `README.md`, `ua-7702-demo/README.md`, and runbook guidance aligned with the current two-step delegation then convert flow.
- Document Arbitrum as the default app network, but note separately when behavior is multi-chain, such as the delegation UI and Magic chain configuration.
- The smart contract example helper in `ua-7702-demo/src/utils/smartContract.ts` is not fully mapped for Arbitrum and remains effectively testnet-oriented until explicit Arbitrum contract metadata is added.
- Do not commit real secrets to `.env.example`, docs, or screenshots.
