# EIP-7702 Universal Account Demo

A working demo that turns an **embedded EOA wallet** (Magic) into a **Particle Network Universal Account** using [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702) delegation -- then executes a cross-chain conversion in a single transaction.

## What This Demo Shows

### The problem

Traditional EOA wallets are limited to the chain they live on. If a user has ETH on Arbitrum and wants USDC on Solana, they need to bridge, swap, and manage gas on multiple chains manually.

### The solution: EIP-7702 + Universal Accounts

EIP-7702 lets an EOA delegate its execution to a smart contract **without deploying a new account**. The EOA keeps its address and assets, but gains smart account capabilities. Particle's Universal Account SDK uses this to give any EOA **chain-abstracted** powers: a unified balance across EVM chains and Solana, and the ability to move assets cross-chain in one step.

### The three-step flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. LOGIN                                                           │
│     User authenticates with email (Magic SDK)                       │
│     → Magic creates an embedded EOA on Arbitrum                     │
│     → User deposits ETH to fund the account                        │
├─────────────────────────────────────────────────────────────────────┤
│  2. DELEGATE (EIP-7702)                                             │
│     User clicks "Delegate on Arbitrum"                              │
│     → Signs a 7702 authorization (contract + chainId + nonce)       │
│     → Sends a Type-4 transaction with the authorization             │
│     → EOA now executes via Particle's Universal Account contract    │
│     → Same address, same keys, but now a smart account              │
├─────────────────────────────────────────────────────────────────────┤
│  3. CONVERT CROSS-CHAIN                                             │
│     User specifies "X USDC on Solana"                               │
│     → UA SDK builds the transaction (routing, bridging, swapping)   │
│     → User signs the rootHash + any inline 7702 authorizations      │
│     → Single sendTransaction() call handles everything              │
│     → ETH on Arbitrum becomes USDC on Solana                        │
└─────────────────────────────────────────────────────────────────────┘
```

## How EIP-7702 Delegation Works

EIP-7702 introduces a new transaction type (Type-4) that sets an EOA's `code` field to point to a smart contract. After delegation:

- The EOA address stays the same
- The private key still controls the account
- But transactions execute through the delegated contract's logic
- This is reversible -- the user can re-delegate or clear delegation

In this demo, delegation targets **Particle's Universal Account contract on Arbitrum**. Once delegated, the EOA can participate in Particle's chain-abstraction layer.

### Delegation flow in code

```
ensureDelegated()
  → getEIP7702Deployments()          // Check which chains need delegation
  → magic.evm.switchChain(42161)     // Switch to Arbitrum
  → universalAccount.getEIP7702Auth([42161])  // Get contract address + nonce
  → magic.wallet.sign7702Authorization(...)   // User signs the authorization
  → magic.wallet.send7702Transaction(...)     // Send Type-4 tx with auth list
  → refreshDelegationStatus()                 // Verify delegation succeeded
```

Delegation is a **one-time operation per chain**. After this, the EOA natively acts as a Universal Account.

## How the Cross-Chain Convert Works

Once delegated, the Universal Account SDK can build complex cross-chain transactions. The user only needs to sign once:

```
handleConvert()
  → universalAccount.createConvertTransaction({
      expectToken: { type: USDC, amount },
      chainId: SOLANA_MAINNET
    })
  → signAndSend(transaction)
      → For each userOp with eip7702Auth:
          sign7702Authorization → serialize signature
      → ethers.BrowserProvider.personal_sign(rootHash)  // Single user signature
      → universalAccount.sendTransaction()  // SDK handles routing + execution
```

The SDK determines the optimal route (which chains to touch, which bridges/swaps to use) and packages everything into `userOps` that the Universal Account infrastructure executes. The user signs one `rootHash` that covers all operations.

## Quick Start

```bash
cp .env.example .env   # Fill in your keys (see below)
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_MAGIC_API_KEY` | Yes | Magic publishable key ([dashboard.magic.link](https://dashboard.magic.link)) |
| `NEXT_PUBLIC_BLOCKCHAIN_NETWORK` | Yes | Target network name (`arbitrum`) |
| `NEXT_PUBLIC_PROJECT_ID` | Yes | Particle project ID ([dashboard.particle.network](https://dashboard.particle.network)) |
| `NEXT_PUBLIC_CLIENT_KEY` | Yes | Particle client key |
| `NEXT_PUBLIC_APP_ID` | Yes | Particle app UUID |
| `NEXT_PUBLIC_ARB_RPC_URL` | Recommended | Arbitrum RPC URL (falls back to public RPC) |
| `NEXT_PUBLIC_ETH_RPC_URL` | No | Ethereum Mainnet RPC (only if enabling ETH support) |

## Project Structure

```
src/
├── pages/
│   ├── _app.tsx                    # App wrapper
│   ├── _document.tsx               # HTML document
│   └── index.tsx                   # Entry — renders Login or Dashboard
├── hooks/
│   ├── MagicProvider.tsx           # Magic SDK instance + auth state
│   └── UniversalAccountProvider.tsx  # UA SDK: init, delegation, sign+send
├── components/
│   ├── magic/
│   │   ├── Login.tsx               # Login page (Email OTP)
│   │   ├── auth/
│   │   │   └── EmailOTP.tsx        # Email OTP handler
│   │   └── cards/
│   │       ├── UserInfoCard.tsx    # Wallet addresses + unified balance
│   │       ├── DelegationCard.tsx  # EIP-7702 delegation status + trigger
│   │       └── UniversalAccountCard.tsx  # Cross-chain convert form
│   └── ui/                         # Reusable primitives (Card, Spinner, etc.)
├── utils/
│   ├── common.ts                   # Auth helpers (logout, saveUserInfo)
│   ├── showToast.ts                # Toast notifications
│   └── types.ts                    # Shared TypeScript types
└── styles/
    └── globals.css                 # Global styles + Tailwind
```

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `magic-sdk` + `@magic-ext/evm` | Auth + embedded wallet + EIP-7702 signing |
| `@particle-network/universal-account-sdk` | Universal Account creation, balance, transactions |
| `ethers` | Signature serialization (`Signature.from`) + `personal_sign` via BrowserProvider |
| `next` (13.4) | Framework (Pages Router) |

Detailed explanation of the 7702 implementation with Magic in the [docs page](/ua-7702-demo/docs/eip7702-delegation-guide.md)
