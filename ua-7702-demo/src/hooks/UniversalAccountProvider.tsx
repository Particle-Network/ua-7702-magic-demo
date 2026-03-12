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
        universalGas: false,
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

  const signEip7702Auth = useCallback(
    async (contractAddress: string, chainId: number, nonce?: number) => {
      if (!magic) throw new Error('Magic not ready');
      return magic.wallet.sign7702Authorization({
        contractAddress,
        chainId,
        ...(nonce !== undefined && { nonce }),
      });
    },
    [magic],
  );

  // Pre-delegate the EOA via Type-4 transactions on chains that need it.
  // Magic SDK cannot sign EIP-7702 authorizations with chainId 0 (chain-agnostic),
  // so we pre-delegate with chain-specific auth before creating UA transactions.
  const ensureDelegated = useCallback(async (chainIds?: number[]) => {
    if (!universalAccount || !magic || !userAddress) {
      throw new Error('Universal Account or wallet not ready');
    }

    const deployments = await universalAccount.getEIP7702Deployments();
    let undelegated = deployments.filter((d: any) => !d.isDelegated);
    if (chainIds?.length) {
      undelegated = undelegated.filter((d: any) => chainIds.includes(d.chainId));
    }

    for (const dep of undelegated) {
      await magic.evm.switchChain(dep.chainId);

      const [auth] = await universalAccount.getEIP7702Auth([dep.chainId]);

      const authorization = await signEip7702Auth(auth.address, dep.chainId);

      await magic.wallet.send7702Transaction({
        to: userAddress,
        data: '0x',
        authorizationList: [authorization],
      });
    }
  }, [universalAccount, magic, userAddress, signEip7702Auth]);

  const signAndSend = useCallback(
    async (transaction: { rootHash: string; userOps?: any[] } & Record<string, any>) => {
      if (!universalAccount || !web3 || !userAddress) {
        throw new Error('Universal Account or wallet not ready');
      }

      type EIP7702Authorization = { userOpHash: string; signature: string };
      const authorizations: EIP7702Authorization[] = [];
      const nonceMap = new Map<number, string>();

      if (transaction.userOps) {
        for (const userOp of transaction.userOps) {
          if (userOp.eip7702Auth && !userOp.eip7702Delegated) {
            let signatureSerialized = nonceMap.get(userOp.eip7702Auth.nonce);

            if (!signatureSerialized) {
              const authorization = await signEip7702Auth(
                userOp.eip7702Auth.address,
                userOp.eip7702Auth.chainId || userOp.chainId,
                userOp.eip7702Auth.nonce,
              );

              const sig = Signature.from({
                r: authorization.r,
                s: authorization.s,
                v: authorization.v,
              });
              signatureSerialized = sig.serialized;
              nonceMap.set(userOp.eip7702Auth.nonce, signatureSerialized);
            }

            if (signatureSerialized) {
              authorizations.push({
                userOpHash: userOp.userOpHash,
                signature: signatureSerialized,
              });
            }
          }
        }
      }

      const utf8Hex = web3.utils.utf8ToHex(transaction.rootHash);
      const signature = await web3.eth.personal.sign(utf8Hex, userAddress, '');
      const result = await universalAccount.sendTransaction(
        transaction as any,
        signature,
        authorizations.length > 0 ? authorizations : undefined,
      );
      return result;
    },
    [universalAccount, web3, userAddress, signEip7702Auth],
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
