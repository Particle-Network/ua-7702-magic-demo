import { useCallback, useState } from 'react';
import {
  CHAIN_ID,
  SUPPORTED_TOKEN_TYPE,
} from '@particle-network/universal-account-sdk';
import Card from '@/components/ui/Card';
import CardLabel from '@/components/ui/CardLabel';
import Spinner from '@/components/ui/Spinner';
import FormButton from '@/components/ui/FormButton';
import FormInput from '@/components/ui/FormInput';
import showToast from '@/utils/showToast';
import { useUniversalAccount } from '@/hooks/UniversalAccountProvider';

const UniversalAccountCard = () => {
  const {
    universalAccount,
    isDelegated,
    refreshBalance,
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
      const transaction = await universalAccount.createConvertTransaction({
        expectToken: { type: SUPPORTED_TOKEN_TYPE.USDC, amount },
        chainId: CHAIN_ID.SOLANA_MAINNET,
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
  }, [universalAccount, amount, signAndSend, refreshBalance]);

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-3">
          <Spinner />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardLabel leftHeader="USDC to receive on Solana" />
      <FormInput
        value={amount}
        onChange={(e: any) => setAmount(e.target.value)}
        placeholder="USDC amount"
      />
      <FormButton
        onClick={handleConvert}
        disabled={sending || !universalAccount || !amount || !isDelegated}
      >
        {sending ? 'Converting...' : `Convert ${amount || '0'} USDC to Solana`}
      </FormButton>
      {!isDelegated && (
        <p className="text-text-muted text-[11px] mt-1.5">
          Delegate your EOA first (Step 2).
        </p>
      )}

      {txUrl && (
        <div className="mt-3">
          <p className="text-text-muted text-[11px] mb-1">Transaction:</p>
          <a
            href={txUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand text-[11px] font-mono break-all cursor-pointer hover:underline"
          >
            {txUrl}
          </a>
        </div>
      )}
    </Card>
  );
};

export default UniversalAccountCard;
