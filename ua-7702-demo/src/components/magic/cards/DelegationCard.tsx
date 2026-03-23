import { useCallback, useState } from 'react';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import FormButton from '@/components/ui/FormButton';
import showToast from '@/utils/showToast';
import { useUniversalAccount } from '@/hooks/UniversalAccountProvider';

const DelegationCard = () => {
  const {
    universalAccount,
    isDelegated,
    ensureDelegated,
    loading,
  } = useUniversalAccount();

  const [delegating, setDelegating] = useState(false);

  const handleDelegate = useCallback(async () => {
    if (!universalAccount) return;

    setDelegating(true);
    try {
      await ensureDelegated();
      showToast({ message: 'Delegation on Base succeeded!', type: 'success' });
    } catch (err: any) {
      console.error('Delegation failed:', err);
      showToast({
        message: 'Delegation failed: ' + (err?.message || String(err)),
        type: 'error',
      });
    } finally {
      setDelegating(false);
    }
  }, [universalAccount, ensureDelegated]);

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
      <div className="code" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Base (8453)</span>
        <span style={{ color: isDelegated ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
          {isDelegated ? 'Delegated' : 'Not delegated'}
        </span>
      </div>

      {!isDelegated && (
        <FormButton
          onClick={handleDelegate}
          disabled={delegating || !universalAccount}
        >
          {delegating ? 'Delegating...' : 'Delegate on Base'}
        </FormButton>
      )}
    </Card>
  );
};

export default DelegationCard;
