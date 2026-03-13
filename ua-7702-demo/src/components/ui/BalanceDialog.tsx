import { type IAssetsResponse } from '@particle-network/universal-account-sdk';

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  10: 'Optimism',
  56: 'BNB Chain',
  101: 'Solana',
  137: 'Polygon',
  146: 'Sonic',
  143: 'Trax',
  196: 'X Layer',
  324: 'zkSync',
  999: 'Zora',
  5000: 'Mantle',
  8453: 'Base',
  9745: 'Zeta',
  42161: 'Arbitrum',
  43114: 'Avalanche',
  59144: 'Linea',
  80094: 'Berachain',
};

const chainName = (chainId: number) => CHAIN_NAMES[chainId] ?? `Chain ${chainId}`;

type Props = {
  assets: IAssetsResponse;
  onClose: () => void;
};

export default function BalanceDialog({ assets, onClose }: Props) {
  const tokensWithBalance = assets.assets.filter((a: any) => a.amount > 0);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-4 rounded-2xl p-6"
        style={{ background: '#141419', border: '1px solid #2a2a36' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-text-primary text-lg font-semibold">Unified Balance</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary text-sm cursor-pointer transition-colors"
            style={{ background: 'none', border: 'none' }}
          >
            Close
          </button>
        </div>

        <div className="code text-center mb-5" style={{ fontSize: '1.25rem', fontWeight: 600 }}>
          ${assets.totalAmountInUSD?.toFixed(4)} USD
        </div>

        {tokensWithBalance.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-4">No tokens found.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {tokensWithBalance.map((asset: any) => (
              <div key={asset.tokenType}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-text-primary text-sm font-semibold uppercase">{asset.tokenType}</span>
                  <span className="text-text-secondary text-xs font-mono">
                    {asset.amount} (${asset.amountInUSD.toFixed(2)})
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {asset.chainAggregation
                    .filter((c: any) => c.amount > 0)
                    .map((chain: any) => (
                      <div
                        key={chain.token.chainId}
                        className="flex items-center justify-between px-3 py-2 rounded-lg text-xs"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(42,42,54,0.6)' }}
                      >
                        <span className="text-text-secondary">{chainName(chain.token.chainId)}</span>
                        <span className="text-text-primary font-mono">
                          {chain.amount} (${chain.amountInUSD.toFixed(2)})
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
