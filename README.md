# Universal Accounts + EIP-7702 with Magic

This repo contains a demo of [Particle Network's Universal Accounts](https://developers.particle.network/universal-accounts/cha/overview) in **EIP-7702 mode** using [Magic](https://magic.link) embedded wallets. EIP-7702 lets an EOA act directly as a Universal Account with the same address, without deploying a separate smart account or transferring assets into it.

The main app lives in [`ua-7702-demo/`](./ua-7702-demo/).

Universal Accounts with Magic use `magic-sdk` for authentication and EIP-7702 signing via `magic.wallet.sign7702Authorization()` and `magic.wallet.send7702Transaction()`.

- **Auth:** Magic (Email OTP, OAuth)
- **EIP-7702 signing:** `magic-sdk@^33.5.0` with `@magic-ext/evm`
- **Stack:** Next.js (Pages Router), Web3.js, Tailwind CSS

## How EIP-7702 Mode Works

```
Traditional Smart Accounts:
  EOA (0xABC...) → Deploy contract (0xDEF...) → Transfer assets → Use features

EIP-7702 Mode:
  EOA (0xABC...) → Sign authorization → EOA becomes Universal Account
```

The demo follows this core pattern:

1. **Initialize** a `UniversalAccount` with `useEIP7702: true`
2. **Create a transaction** via the SDK (`createConvertTransaction`, `createUniversalTransaction`, etc.)
3. **Sign EIP-7702 authorizations** for any `userOps` that require delegation (first tx per chain)
4. **Sign the root hash** and send via `universalAccount.sendTransaction()`

## Quick Start

Run the Magic demo:

```bash
cd ua-7702-demo
npm install
cp .env.example .env  # Add your Magic + Particle credentials
npm run dev
```

## Environment Variables

The demo needs [Particle Network](https://dashboard.particle.network) credentials:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_PROJECT_ID` | Particle project ID |
| `NEXT_PUBLIC_CLIENT_KEY` | Particle client key |
| `NEXT_PUBLIC_APP_ID` | Particle app UUID |

The Magic demo additionally needs:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_MAGIC_API_KEY` | Magic publishable API key |
| `NEXT_PUBLIC_ARB_RPC_URL` | Arbitrum RPC URL (optional, has default) |

## Resources

- [Universal Accounts Docs](https://developers.particle.network/universal-accounts/cha/overview)
- [EIP-7702 Specification](https://eips.ethereum.org/EIPS/eip-7702)
- [Magic EIP-7702 Docs](https://docs.magic.link/embedded-wallets/blockchain-interactions/eip-7702)
