# Dead Code Analysis Report

**Date:** 2026-03-13
**Project:** ua-7702-demo (Next.js 13.4 / Magic SDK / Particle Network UA SDK)
**Tools used:** depcheck, manual import graph analysis

---

## Changes Made (SAFE)

### Unused Files Deleted

| File | Reason |
|------|--------|
| `src/components/ui/ErrorText.tsx` | Zero imports across the entire codebase |
| `src/components/ui/Spacer.tsx` | Zero imports across the entire codebase |
| `src/utils/network.ts` | Zero imports; exported `getNetworkUrl`, `getChainId`, `getNetworkToken`, `getNetworkName`, `getBlockExplorer` all unused |

### Unused Exports Removed

| File | Export | Reason |
|------|--------|--------|
| `src/utils/types.ts` | `TxnParams` type | Not referenced anywhere in the codebase |

### Unused Dependencies Removed

| Package | Reason |
|---------|--------|
| `classnames@^2.3.2` | Zero imports across the entire codebase |

### Console.log Cleanup

| File | Change |
|------|--------|
| `src/hooks/Web3.tsx` | Removed `console.log('Magic is not initialized')` |
| `src/hooks/UniversalAccountProvider.tsx` | Removed `console.log('assets', assets)` |
| `src/components/magic/auth/EmailOTP.tsx` | Changed `console.log` to `console.error` for login errors |

---

## Items Reviewed and Kept (with rationale)

### Dependencies flagged by depcheck but actually used

| Package | Why kept |
|---------|----------|
| `@types/node` | Required by TypeScript / Next.js (tsconfig includes it) |
| `@types/react-dom` | Required by TypeScript / Next.js |
| `autoprefixer` | Used in `postcss.config.js` |
| `postcss` | Used in `postcss.config.js` |
| `tailwindcss` | Used in `tailwind.config.js` and `postcss.config.js` |

### Code reviewed but not removed

| Item | Why kept |
|------|----------|
| `@magic-ext/oauth2` | Instantiated in `MagicProvider.tsx` as a Magic extension; removing could break SDK init |
| `CardLabel.isDisconnect` prop | Part of component API; minor, not worth a breaking change |
| `LoginMethod` type in `common.ts` | Used as parameter type by `saveUserInfo()` which is called from `EmailOTP.tsx` |
| `DevLinks.tsx` | Used by `MagicDashboardRedirect.tsx` (API key missing fallback screen) |

---

## Impact Summary

- **Files deleted:** 3
- **Dependencies removed:** 1 (`classnames`)
- **Unused exports removed:** 1 (`TxnParams` type)
- **Console.log statements cleaned:** 3

### Build Verification

- Build before changes: PASS
- Build after changes: PASS
- Bundle size: unchanged (deleted files were not imported, so tree-shaking already excluded them)

---

## Remaining Observations (not actionable now)

1. **`web3` package** is heavy (~200KB+). The app only uses `web3.eth.personal.sign()` in `UniversalAccountProvider.tsx`. This could potentially be replaced with `ethers` (already a dependency) using `ethers.Wallet.signMessage()` or a lighter approach. This would be a functional refactor, not dead code removal.

2. **`@magic-ext/oauth2`** is included in the Magic extensions but no OAuth login flow is exposed in the UI. If OAuth is never planned, this extension and dependency could be removed. Requires understanding of product intent.

3. **`src/utils/common.ts`** exports `LoginMethod` as a union type with values `'EMAIL' | 'SMS' | 'SOCIAL' | 'FORM'`, but only `'EMAIL'` is ever used. The other variants are dead in practice but not removable without understanding future plans.
