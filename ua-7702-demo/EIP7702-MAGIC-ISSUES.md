# EIP-7702 + Magic SDK: Known Issues

## Overview

This demo integrates Particle Network's Universal Account SDK with Magic's EIP-7702 support (`magic-sdk@^33.5.0`). The EIP-7702 flow is used to delegate an EOA to a smart contract implementation via Type-4 transactions.

We are hitting an RPC error when calling `magic.wallet.sign7702Authorization()`, which blocks the entire delegation flow.

## Error

```
Magic RPC Error: [-32603] Error signing. Please try again
```

- **Error code:** `-32603` (internal JSON-RPC error)
- **Method:** `magic.wallet.sign7702Authorization()`
- **Context:** Called from `ensureDelegated()` during pre-delegation on Arbitrum (chainId 42161)

## Reproduction Flow

1. User logs in via Magic
2. Universal Account is initialized with `useEIP7702: true`
3. User triggers a convert transaction (e.g., "Convert to USDC" on Arbitrum)
4. `ensureDelegated([42161])` is called before creating the transaction
5. Arbitrum is detected as undelegated
6. `magic.evm.switchChain(42161)` succeeds
7. `universalAccount.getEIP7702Auth([42161])` returns auth data
8. `magic.wallet.sign7702Authorization()` is called and **fails with -32603**

## Debug Logs

Captured via instrumentation in `UniversalAccountProvider.tsx`:

### Log 1 — `ensureDelegated` entry

```json
{
  "location": "UniversalAccountProvider.tsx:ensureDelegated",
  "message": "ensureDelegated called",
  "data": {
    "chainIds": [42161],
    "totalDeployments": 10,
    "undelegatedCount": 1,
    "undelegated": [{ "chainId": 42161, "isDelegated": false }]
  },
  "timestamp": 1773324022171
}
```

10 total EIP-7702 deployments tracked, 1 undelegated (Arbitrum).

### Log 2 — Chain switch

```json
{
  "location": "UniversalAccountProvider.tsx:ensureDelegated:chainSwitched",
  "message": "Chain switched, fetching auth",
  "data": { "chainId": 42161 },
  "timestamp": 1773324022535
}
```

`magic.evm.switchChain(42161)` completed successfully (~360ms after entry).

### Log 3 — `getEIP7702Auth` result

```json
{
  "location": "UniversalAccountProvider.tsx:ensureDelegated:authFetched",
  "message": "getEIP7702Auth result",
  "data": {
    "authAddress": "0x6640c1CCCaF07Dbe765eC05E294FE427cC92831C",
    "authChainId": 0,
    "authNonce": 0
  },
  "timestamp": 1773324022882
}
```

Particle's SDK returns `chainId: 0` (chain-agnostic authorization) and `nonce: 0`.

### Log 4 — `sign7702Authorization` call

```json
{
  "location": "UniversalAccountProvider.tsx:signEip7702Auth",
  "message": "sign7702Authorization called",
  "data": {
    "contractAddress": "0x6640c1CCCaF07Dbe765eC05E294FE427cC92831C",
    "chainId": 42161
  },
  "timestamp": 1773324022883
}
```

Called with `contractAddress` and `chainId` only (no explicit `nonce`), relying on the SDK's documented auto-fetch behavior.

### Log 5 — Signing failure

```json
{
  "location": "UniversalAccountProvider.tsx:signEip7702Auth:error",
  "message": "sign7702Authorization FAILED",
  "data": {
    "error": "Magic RPC Error: [-32603] Error signing. Please try again",
    "code": -32603,
    "contractAddress": "0x6640c1CCCaF07Dbe765eC05E294FE427cC92831C",
    "chainId": 42161
  },
  "timestamp": 1773324025566
}
```

Magic's internal signing fails ~2.7 seconds after the call. Error -32603 is a generic internal JSON-RPC error with no additional detail.

## Analysis

### What works

- Chain switching via `magic.evm.switchChain()` works fine
- Particle's `getEIP7702Deployments()` and `getEIP7702Auth()` return valid data
- The contract address (`0x6640c1CCCaF07Dbe765eC05E294FE427cC92831C`) is valid

### What fails

`magic.wallet.sign7702Authorization()` fails with `-32603` regardless of whether a nonce is provided or auto-fetched. The error originates inside Magic's backend signing infrastructure, not in our code or the RPC node.

### Observations

1. **Particle returns `chainId: 0` (chain-agnostic)** — Magic SDK cannot sign with `chainId: 0`, so we override it with the target chain's ID (42161). This is a known incompatibility between the two SDKs.

2. **Particle returns `nonce: 0`** — (this is the first tx from this account) A previous version of this code had a workaround that manually fetched the transaction count and passed `nonce: currentNonce + 1`, based on the theory that the Type-4 tx consumes the current nonce and the authorization needs the post-increment value. This workaround also failed with the same `-32603` error.

## What We've Tried

| Approach | Result |
|---|---|
| Omit nonce (let SDK auto-fetch per docs) | `-32603` error |
| Pass `nonce: currentNonce + 1` (manual workaround) | `-32603` error |
| Different chain (Arbitrum, chainId 42161) | `-32603` error |

## Environment

- `magic-sdk`: `^33.5.0`
- `@magic-ext/evm`: EVMExtension with multi-chain config
- `@particle-network/universal-account-sdk`: Universal Account with `useEIP7702: true`
- Network: Arbitrum One (chainId 42161)
- Delegation target: `0x6640c1CCCaF07Dbe765eC05E294FE427cC92831C` (provided by Particle's `getEIP7702Auth`)
