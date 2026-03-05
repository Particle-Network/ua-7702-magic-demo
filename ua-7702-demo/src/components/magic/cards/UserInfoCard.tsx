import { useCallback, useState } from 'react';
import Divider from '@/components/ui/Divider';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import CardLabel from '@/components/ui/CardLabel';
import Spinner from '@/components/ui/Spinner';
import { useUniversalAccount } from '@/hooks/UniversalAccountProvider';

const UserInfo = () => {
  const { accountInfo, primaryAssets, refreshBalance } = useUniversalAccount();

  const [copied, setCopied] = useState('Copy');
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    <Card>
      <CardHeader id="wallet">Wallet</CardHeader>
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
      <div className="code">
        ${primaryAssets?.totalAmountInUSD?.toFixed(4) ?? '0.00'} USD
      </div>
    </Card>
  );
};

export default UserInfo;
