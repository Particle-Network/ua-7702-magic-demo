import { useCallback, useState } from 'react';
import {
  CHAIN_ID,
  SUPPORTED_TOKEN_TYPE,
} from '@particle-network/universal-account-sdk';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import CardLabel from '@/components/ui/CardLabel';
import Spinner from '@/components/ui/Spinner';
import FormButton from '@/components/ui/FormButton';
import FormInput from '@/components/ui/FormInput';
import showToast from '@/utils/showToast';
import { useUniversalAccount } from '@/hooks/UniversalAccountProvider';

const UniversalAccountCard = () => {
  const {
    universalAccount,
    refreshBalance,
    ensureDelegated,
    signAndSend,
    loading,
  } = useUniversalAccount();

  const [amount, setAmount] = useState('1');
  const [sending, setSending] = useState(false);
  const [txUrl, setTxUrl] = useState('');

  const handleConvert = useCallback(async () => {
    if (!universalAccount || !amount) return;

    setSending(true);
    try {
      await ensureDelegated([42161]);

      const transaction = await universalAccount.createConvertTransaction({
        expectToken: { type: SUPPORTED_TOKEN_TYPE.USDC, amount },
        chainId: CHAIN_ID.ARBITRUM_MAINNET_ONE,
      });

      const result = await signAndSend(transaction);
      const url = `https://universalx.app/activity/details?id=${result.transactionId}`;
      setTxUrl(url);

      showToast({ message: 'Convert transaction sent!', type: 'success' });
      await refreshBalance();
    } catch (err: any) {
      console.error('Convert transaction failed:', err);
      showToast({
        message: 'Transaction failed: ' + (err?.message || String(err)),
        type: 'error',
      });
    } finally {
      setSending(false);
    }
  }, [universalAccount, amount, ensureDelegated, signAndSend, refreshBalance]);

  if (loading) {
    return (
      <Card>
        <CardHeader id="convert">Convert to USDC</CardHeader>
        <div className="flex items-center justify-center py-4">
          <Spinner />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader id="convert">Convert to USDC</CardHeader>
      <CardLabel leftHeader="Convert primary assets to USDC on Arbitrum" />
      <FormInput
        value={amount}
        onChange={(e: any) => setAmount(e.target.value)}
        placeholder="Amount of USDC"
      />
      <FormButton
        onClick={handleConvert}
        disabled={sending || !universalAccount || !amount}
      >
        {sending ? 'Converting...' : 'Convert to USDC'}
      </FormButton>

      {txUrl && (
        <div className="mt-4">
          <p className="text-text-muted text-xs mb-1">Transaction:</p>
          <a
            href={txUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand text-xs font-mono break-all cursor-pointer hover:underline"
          >
            {txUrl}
          </a>
        </div>
      )}
    </Card>
  );
};

export default UniversalAccountCard;
