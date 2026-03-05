import {
  UniversalAccount,
  UNIVERSAL_ACCOUNT_VERSION,
  type IAssetsResponse,
} from '@particle-network/universal-account-sdk';
import { Signature } from 'ethers';
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useMagic } from './MagicProvider';
import useWeb3 from './Web3';

type AccountInfo = {
  ownerAddress: string;
  evmSmartAccount: string;
  solanaSmartAccount: string;
};

type UAContextType = {
  universalAccount: UniversalAccount | null;
  accountInfo: AccountInfo;
  primaryAssets: IAssetsResponse | null;
  refreshBalance: () => Promise<void>;
  ensureDelegated: (chainIds?: number[]) => Promise<void>;
  signAndSend: (transaction: { rootHash: string } & Record<string, any>) => Promise<{ transactionId: string }>;
  loading: boolean;
};

const UAContext = createContext<UAContextType>({
  universalAccount: null,
  accountInfo: { ownerAddress: '', evmSmartAccount: '', solanaSmartAccount: '' },
  primaryAssets: null,
  refreshBalance: async () => {},
  ensureDelegated: async () => {},
  signAndSend: async () => ({ transactionId: '' }),
  loading: false,
});

export const useUniversalAccount = () => useContext(UAContext);

export const UniversalAccountProvider = ({ children }: { children: ReactNode }) => {
  const { magic } = useMagic();
  const web3 = useWeb3();
  const [universalAccount, setUniversalAccount] = useState<UniversalAccount | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountInfo>({
    ownerAddress: '',
    evmSmartAccount: '',
    solanaSmartAccount: '',
  });
  const [primaryAssets, setPrimaryAssets] = useState<IAssetsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const userAddress = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

  useEffect(() => {
    if (!userAddress) {
      setUniversalAccount(null);
      return;
    }

    const ua = new UniversalAccount({
      projectId: process.env.NEXT_PUBLIC_PROJECT_ID!,
      projectClientKey: process.env.NEXT_PUBLIC_CLIENT_KEY!,
      projectAppUuid: process.env.NEXT_PUBLIC_APP_ID!,
      smartAccountOptions: {
        useEIP7702: true,
        name: 'UNIVERSAL',
        version: UNIVERSAL_ACCOUNT_VERSION,
        ownerAddress: userAddress,
      },
      tradeConfig: {
        slippageBps: 100,
        universalGas: true,
      },
    });

    setUniversalAccount(ua);
  }, [userAddress]);

  useEffect(() => {
    if (!universalAccount || !userAddress) return;

    const fetchAccountData = async () => {
      setLoading(true);
      try {
        const options = await universalAccount.getSmartAccountOptions();
        setAccountInfo({
          ownerAddress: userAddress,
          evmSmartAccount: options.smartAccountAddress || '',
          solanaSmartAccount: options.solanaSmartAccountAddress || '',
        });
        console.log('smartAccountOptions', options);

        const deployments = await universalAccount.getEIP7702Deployments();
        console.log('[UA] EIP-7702 deployments:', deployments);

        const assets = await universalAccount.getPrimaryAssets();
        console.log('assets', assets);
        setPrimaryAssets(assets);
      } catch (err) {
        console.error('Failed to fetch UA data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAccountData();
  }, [universalAccount, userAddress]);

  const refreshBalance = useCallback(async () => {
    if (!universalAccount) return;
    try {
      const assets = await universalAccount.getPrimaryAssets();
      setPrimaryAssets(assets);
    } catch (err) {
      console.error('Failed to refresh balance:', err);
    }
  }, [universalAccount]);

  // Pre-delegate the EOA on all chains that need it via Type-4 transactions.
  // This uses chain-specific auth (non-zero chainId) which Magic supports,
  // bypassing the chainId 0 limitation in Magic's sign7702Authorization.
  const ensureDelegated = useCallback(async (chainIds?: number[]) => {
    if (!universalAccount || !magic) {
      throw new Error('Universal Account or wallet not ready');
    }

    const deployments = await universalAccount.getEIP7702Deployments();
    console.log('[ensureDelegated] deployments:', deployments);

    let undelegated = deployments.filter((d: any) => !d.isDelegated);
    if (chainIds && chainIds.length > 0) {
      undelegated = undelegated.filter((d: any) => chainIds.includes(d.chainId));
    }
    if (undelegated.length === 0) {
      console.log('[ensureDelegated] target chains already delegated');
      return;
    }

    for (const dep of undelegated) {
      const chainId = dep.chainId;
      console.log(`[ensureDelegated] delegating on chain ${chainId}...`);

      await magic.evm.switchChain(chainId);

      const auths = await universalAccount.getEIP7702Auth([chainId]);
      const auth = auths[0];
      console.log('[ensureDelegated] auth from Particle:', auth);

      // Sign authorization with nonce+1 because the Type-4 tx itself
      // consumes the current nonce. See reference example.
      const currentNonce = auth.nonce;
      // Use the actual target chainId (not auth.chainId which Particle
      // always returns as 0). A chain-specific authorization is valid
      // on that chain per EIP-7702.
      const signedAuth = await magic.wallet.sign7702Authorization({
        contractAddress: auth.address,
        chainId: chainId,
        nonce: currentNonce + 1,
      });
      console.log('[ensureDelegated] signed auth:', signedAuth);

      const { transactionHash } = await magic.wallet.send7702Transaction({
        to: '0x0000000000000000000000000000000000000000',
        value: '0x0',
        data: '0x',
        authorizationList: [signedAuth],
        nonce: currentNonce,
      });
      console.log(`[ensureDelegated] delegation tx on chain ${chainId}:`, transactionHash);
    }

    console.log('[ensureDelegated] all delegations complete');
  }, [universalAccount, magic]);

  const signAndSend = useCallback(
    async (transaction: { rootHash: string; userOps?: any[] } & Record<string, any>) => {
      if (!universalAccount || !web3 || !userAddress || !magic) {
        throw new Error('Universal Account or wallet not ready');
      }

      type EIP7702Authorization = { userOpHash: string; signature: string };
      const authorizations: EIP7702Authorization[] = [];
      const nonceMap = new Map<string, string>();

      if (transaction.userOps) {
        for (const userOp of transaction.userOps) {
          if (userOp.eip7702Auth && !userOp.eip7702Delegated) {
            const { chainId: targetChainId, address, nonce } = userOp.eip7702Auth;
            const cacheKey = `${targetChainId}:${nonce}`;
            let sig = nonceMap.get(cacheKey);
            if (!sig) {
              if (targetChainId > 0) {
                await magic.evm.switchChain(targetChainId);
              }
              const auth = await magic.wallet.sign7702Authorization({
                contractAddress: address,
                chainId: targetChainId,
                nonce,
              });
              sig = Signature.from({ v: auth.v, r: auth.r, s: auth.s }).serialized;
              nonceMap.set(cacheKey, sig);
            }
            authorizations.push({ userOpHash: userOp.userOpHash, signature: sig });
          }
        }
      }

      const signature = await web3.eth.personal.sign(transaction.rootHash, userAddress, '');
      const result = await universalAccount.sendTransaction(
        transaction as any,
        signature,
        authorizations.length > 0 ? authorizations : undefined,
      );
      return result;
    },
    [universalAccount, web3, userAddress, magic],
  );

  const value = useMemo(
    () => ({
      universalAccount,
      accountInfo,
      primaryAssets,
      refreshBalance,
      ensureDelegated,
      signAndSend,
      loading,
    }),
    [universalAccount, accountInfo, primaryAssets, refreshBalance, ensureDelegated, signAndSend, loading],
  );

  return <UAContext.Provider value={value}>{children}</UAContext.Provider>;
};
