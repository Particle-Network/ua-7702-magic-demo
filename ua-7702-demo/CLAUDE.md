# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build
npm run lint     # ESLint with auto-fix
npm start        # Serve production build
```

No test framework is configured.

## Environment Setup

Copy `.env.example` to `.env` and fill in:
- `NEXT_PUBLIC_MAGIC_API_KEY` — Magic publishable key
- `NEXT_PUBLIC_PROJECT_ID`, `NEXT_PUBLIC_CLIENT_KEY`, `NEXT_PUBLIC_APP_ID` — Particle Network credentials
- `NEXT_PUBLIC_BASE_RPC_URL` — Base RPC (optional, falls back to public RPC)

## Architecture

**Next.js 13.4 app using Pages Router** (not App Router). Single-page app at `src/pages/index.tsx` that conditionally renders Login or Dashboard based on a localStorage token.

### Provider hierarchy (in `index.tsx`)

```
MagicProvider → UniversalAccountProvider → [Login | Dashboard]
```

- **MagicProvider** (`src/hooks/MagicProvider.tsx`): Initializes Magic SDK with EVM extension, configured for Base (chain 8453). Exposes `useMagic()` hook.
- **UniversalAccountProvider** (`src/hooks/UniversalAccountProvider.tsx`): Core business logic provider. Manages:
  - UA SDK initialization with EIP-7702 smart account options
  - Delegation status tracking (`isDelegated`)
  - `ensureDelegated()` — one-time EIP-7702 Type-4 delegation on Base
  - `signAndSend()` — signs rootHash via ethers BrowserProvider (`personal_sign`), handles per-userOp 7702 authorizations, then sends via UA SDK
  - Balance/asset fetching via `getPrimaryAssets()`

### Three-step user flow

1. **Login**: Email OTP via Magic SDK → creates embedded EOA on Base
2. **Delegate**: EIP-7702 Type-4 transaction delegates EOA to Particle's Universal Account contract (one-time per chain)
3. **Convert**: Cross-chain asset conversion (e.g., ETH on Base → USDC on Solana) via UA SDK

### Key integration detail

Magic SDK cannot sign EIP-7702 authorizations with `chainId: 0` (chain-agnostic). The workaround is pre-delegating with chain-specific auth before creating UA transactions. See the comment in `ensureDelegated()`.

### Network config

Hardcoded to Base mainnet (chain ID 8453).

### Styling

Tailwind CSS with PostCSS. Global styles in `src/styles/globals.css`. Path alias `@/*` maps to `src/*`.
