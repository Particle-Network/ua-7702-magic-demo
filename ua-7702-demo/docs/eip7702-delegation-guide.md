# Upgrading a Magic EOA to a Universal Account with EIP-7702

This guide explains how this demo turns a regular Magic embedded wallet (an EOA) into a Particle Network Universal Account using EIP-7702 delegation, and how to replicate this in your own app.

## What happens at a high level

```
    Magic EOA                    EIP-7702 Delegation              Universal Account
  (regular wallet)          (one on-chain transaction)         (same address, new powers)

  - Lives on one chain  -->  Signs an authorization     -->  - Unified balance across chains
  - Can only send ETH       that points the EOA's            - Cross-chain transactions
    on its native chain      code to Particle's               - Same private key still works
                             UA smart contract                - Same address, nothing moves
```

The EOA keeps its address and private key. EIP-7702 just tells the chain: "when someone calls this address, execute using Particle's Universal Account contract logic." This is reversible.

## Prerequisites

You need three things before starting:

1. **A Magic SDK app** with the EVM extension (for EIP-7702 signing support)
2. **Particle Network project credentials** (project ID, client key, app UUID) from [dashboard.particle.network](https://dashboard.particle.network)
3. **An EOA with some ETH on Arbitrum** (delegation is a transaction, so it costs gas)

## Step-by-step integration

### Step 1: Set up Magic with EVM extension

Magic provides the embedded wallet. The EVM extension adds EIP-7702 support (`sign7702Authorization` and `send7702Transaction`).

```typescript
import { EVMExtension } from '@magic-ext/evm';
import { Magic } from 'magic-sdk';

const magic = new Magic('pk_live_YOUR_KEY', {
  extensions: [
    new EVMExtension([
      { rpcUrl: 'https://arb1.arbitrum.io/rpc', chainId: 42161, default: true },
    ]),
  ],
});
```

The user logs in with email OTP. After login, you get their EOA address:

```typescript
const token = await magic.auth.loginWithEmailOTP({ email });
const metadata = await magic.user.getInfo();
const eoaAddress = metadata.wallets.ethereum.publicAddress;
```

At this point the user has a normal EOA on Arbitrum. Nothing special yet.

### Step 2: Initialize the Universal Account SDK

Pass the EOA address to Particle's SDK. This doesn't do anything on-chain -- it just sets up the SDK to know about this user.

```typescript
import {
  UniversalAccount,
  UNIVERSAL_ACCOUNT_VERSION,
} from '@particle-network/universal-account-sdk';

const ua = new UniversalAccount({
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
  projectClientKey: process.env.NEXT_PUBLIC_CLIENT_KEY,
  projectAppUuid: process.env.NEXT_PUBLIC_APP_ID,
  smartAccountOptions: {
    useEIP7702: true,        // Use 7702 mode (EOA becomes the UA)
    name: 'UNIVERSAL',
    version: UNIVERSAL_ACCOUNT_VERSION,
    ownerAddress: eoaAddress, // The Magic EOA address
  },
  tradeConfig: {
    slippageBps: 100,         // 1% slippage tolerance
    universalGas: false,
  },
});
```

**Key setting**: `useEIP7702: true` tells the SDK to use 7702 mode. In this mode, the EOA address itself becomes the Universal Account (as opposed to "smart account mode" where a separate contract address is created). This means the user's existing assets are immediately available.

### Step 3: Check delegation status

Before delegating, check if the EOA is already delegated on the target chain:

```typescript
const deployments = await ua.getEIP7702Deployments();
const arbitrum = deployments.find(d => d.chainId === 42161);
const isDelegated = arbitrum?.isDelegated ?? false;
```

`getEIP7702Deployments()` returns an array of chains with their delegation status. If the EOA is already delegated on Arbitrum, you can skip to Step 5.

### Step 4: Delegate the EOA (one-time per chain)

This is the core step. You need to:

1. Get the authorization details from the UA SDK (which contract to delegate to, what nonce to use)
2. Have Magic sign the EIP-7702 authorization
3. Send a Type-4 transaction that includes the signed authorization

```typescript
// Make sure Magic is on the right chain
await magic.evm.switchChain(42161);

// Ask the UA SDK: "what contract should this EOA delegate to on Arbitrum?"
const [auth] = await ua.getEIP7702Auth([42161]);

// Have Magic sign the authorization
// auth.address = the UA contract address
// auth.nonce + 1 = the nonce to use (incremented by 1)
const authorization = await magic.wallet.sign7702Authorization({
  contractAddress: auth.address,
  chainId: 42161,
  nonce: auth.nonce + 1,
});

// Send a Type-4 transaction that carries the authorization
// The tx itself is a no-op (to: self, data: 0x), but the authorizationList
// is what actually sets the delegation on-chain
await magic.wallet.send7702Transaction({
  to: eoaAddress,          // Send to self
  data: '0x',             // No calldata needed
  authorizationList: [authorization],
});
```

After this transaction confirms, the EOA's on-chain code pointer now references Particle's Universal Account contract. The EOA is upgraded.

**Important caveat**: Magic SDK cannot sign EIP-7702 authorizations with `chainId: 0` (chain-agnostic and what comes from the Universal Account SDK). This means you must pre-delegate on each specific chain before using the UA SDK's cross-chain features. In practice, delegating on Arbitrum is sufficient for this demo since the UA SDK handles other chains during transactions.

### Step 5: Use the Universal Account

Once delegated, you can use all UA features. The user now has:

- A **unified balance** across all supported chains
- The ability to **convert assets cross-chain** in a single transaction
- The same address and keys as before

**Fetch the unified balance:**

```typescript
const assets = await ua.getPrimaryAssets();
console.log(`Total: $${assets.totalAmountInUSD}`);
// Shows combined balance across all chains
```

**Get smart account addresses:**

```typescript
const options = await ua.getSmartAccountOptions();
console.log('EVM address:', options.smartAccountAddress);
console.log('Solana address:', options.solanaSmartAccountAddress);
// In 7702 mode, the EVM address equals the original EOA address
```

### Step 6: Send cross-chain transactions

The UA SDK builds complex cross-chain operations that the user signs once. Here's how a convert transaction works (e.g., ETH on Arbitrum to USDC on Solana):

```typescript
import {
  CHAIN_ID,
  SUPPORTED_TOKEN_TYPE,
} from '@particle-network/universal-account-sdk';
import { BrowserProvider, getBytes, Signature } from 'ethers';

// 1. Create the transaction
const transaction = await ua.createConvertTransaction({
  expectToken: { type: SUPPORTED_TOKEN_TYPE.USDC, amount: '10' },
  chainId: CHAIN_ID.SOLANA_MAINNET,
});

// 2. Sign any inline EIP-7702 authorizations the SDK needs
//    (for chains where the EOA isn't delegated yet)
const authorizations = [];
if (transaction.userOps) {
  for (const userOp of transaction.userOps) {
    if (userOp.eip7702Auth && !userOp.eip7702Delegated) {
      const auth = await magic.wallet.sign7702Authorization({
        contractAddress: userOp.eip7702Auth.address,
        chainId: userOp.eip7702Auth.chainId || userOp.chainId,
        nonce: userOp.eip7702Auth.nonce,
      });

      // Serialize the signature for the SDK
      const sig = Signature.from({ r: auth.r, s: auth.s, v: auth.v });
      authorizations.push({
        userOpHash: userOp.userOpHash,
        signature: sig.serialized,
      });
    }
  }
}

// 3. Sign the rootHash (covers all operations in the transaction)
const signature = await signer.signMessage(getBytes(transaction.rootHash));

// 4. Send it
const result = await ua.sendTransaction(
  transaction,
  signature,
  authorizations.length > 0 ? authorizations : undefined,
);

// Track the transaction
const url = `https://universalx.app/activity/details?id=${result.transactionId}`;
```

The SDK figures out the optimal route (which chains to touch, which bridges/swaps to use) and packages everything into `userOps`. The user only signs one `rootHash`.

## How this demo is structured

The integration is split across three React providers and three card components:

| Layer | File | Responsibility |
|-------|------|----------------|
| Magic wallet | `src/hooks/MagicProvider.tsx` | Initializes Magic SDK, exposes `useMagic()` |
| UA business logic | `src/hooks/UniversalAccountProvider.tsx` | All UA operations: init, delegation, signing, sending |
| Login UI | `src/components/magic/auth/EmailOTP.tsx` | Email OTP login form |
| Account info | `src/components/magic/cards/UserInfoCard.tsx` | Shows addresses + unified balance |
| Delegation UI | `src/components/magic/cards/DelegationCard.tsx` | Shows delegation status, trigger button |
| Convert UI | `src/components/magic/cards/UniversalAccountCard.tsx` | Cross-chain convert form |

The `UniversalAccountProvider` is where all the logic from Steps 2-6 lives. The card components are thin UI wrappers that call into it.

## Gotchas and things to know

**Delegation is one-time per chain.** Once an EOA is delegated on Arbitrum, it stays delegated. You don't need to re-delegate for every transaction. The SDK may request inline 7702 authorizations for *other* chains during cross-chain transactions -- these are handled in the `signAndSend` flow (Step 6).

**The nonce matters.** When calling `sign7702Authorization`, the nonce must be `auth.nonce + 1` for the initial delegation. The UA SDK tells you the correct nonce via `getEIP7702Auth()`. Getting this wrong will cause the transaction to fail.

**Delegation is reversible.** A user can re-delegate their EOA to a different contract or clear delegation entirely by sending another Type-4 transaction with a new authorization.

**The transaction is a no-op.** The delegation Type-4 transaction sends `0x` data to the user's own address. The actual delegation happens via the `authorizationList` field, not the transaction payload.

**`rootHash` signing uses `personal_sign`.** The UA SDK expects an EIP-191 personal signature over the raw bytes of the rootHash. Using ethers, this means `signer.signMessage(getBytes(rootHash))` -- the `getBytes()` call is critical to ensure the hex string is treated as binary data, not UTF-8 text.
