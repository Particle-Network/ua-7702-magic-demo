import { useCallback, useState } from 'react';
import Divider from '@/components/ui/Divider';
import Card from '@/components/ui/Card';
import CardLabel from '@/components/ui/CardLabel';
import Spinner from '@/components/ui/Spinner';
import BalanceDialog from '@/components/ui/BalanceDialog';
import { useUniversalAccount } from '@/hooks/UniversalAccountProvider';

const UserInfo = () => {
  const { accountInfo, primaryAssets, refreshBalance } = useUniversalAccount();

  const [copied, setCopied] = useState('Copy');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);

  const [publicAddress] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('user') : null,
  );

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshBalance();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [refreshBalance]);

  const copy = useCallback(() => {
    if (publicAddress && copied === 'Copy') {
      setCopied('Copied!');
      navigator.clipboard.writeText(publicAddress);
      setTimeout(() => setCopied('Copy'), 1000);
    }
  }, [copied, publicAddress]);

  return (
    <>
      <Card>
        <CardLabel
          leftHeader="Address"
          rightAction={
            !publicAddress ? <Spinner /> : <div onClick={copy}>{copied}</div>
          }
        />
        <div className="code">
          {publicAddress?.length === 0 ? 'Fetching address..' : publicAddress}
        </div>
        <Divider />
        <CardLabel leftHeader="Solana Address" />
        <p className="text-text-muted text-[11px] mb-1">
          Deposit SOL/USDC here — counts toward your unified balance.
        </p>
        <div className="code">
          {accountInfo.solanaSmartAccount || 'Fetching address...'}
        </div>
        <Divider />
        <CardLabel
          leftHeader="Unified Balance"
          rightAction={
            isRefreshing ? (
              <div className="loading-container">
                <Spinner />
              </div>
            ) : (
              <div onClick={refresh}>Refresh</div>
            )
          }
        />
        <div
          className="code"
          style={{ cursor: primaryAssets ? 'pointer' : 'default' }}
          onClick={() => primaryAssets && setShowBalanceDialog(true)}
          title={primaryAssets ? 'Click for breakdown' : undefined}
        >
          ${primaryAssets?.totalAmountInUSD?.toFixed(4) ?? '0.00'} USD
          {primaryAssets && (
            <span className="text-text-muted text-[11px] ml-2">View breakdown</span>
          )}
        </div>
      </Card>

      {showBalanceDialog && primaryAssets && (
        <BalanceDialog
          assets={primaryAssets}
          onClose={() => setShowBalanceDialog(false)}
        />
      )}
    </>
  );
};

export default UserInfo;
