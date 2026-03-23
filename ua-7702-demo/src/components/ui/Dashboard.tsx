import React from 'react';
import UniversalAccountCard from '../magic/cards/UniversalAccountCard';
import DelegationCard from '../magic/cards/DelegationCard';
import { LoginProps } from '@/utils/types';
import UserInfo from '@/components/magic/cards/UserInfoCard';
import Header from './Header';

const Step = ({ step, title, description, isLast, children }: {
  step: number;
  title: string;
  description: string;
  isLast?: boolean;
  children: React.ReactNode;
}) => (
  <div className="step-wrapper">
    <div className="step-gutter">
      <div className="step-dot">{step}</div>
      {!isLast && <div className="step-line" />}
    </div>
    <div className="step-body">
      <div className="step-title">{title}</div>
      <p className="step-desc">{description}</p>
      {children}
    </div>
  </div>
);

export default function Dashboard({ token, setToken }: LoginProps) {
  return (
    <div className="dashboard">
      <Header token={token} setToken={setToken} />
      <main className="dashboard-content">
        <Step
          step={1}
          title="Email Login"
          description="Magic creates an EOA wallet from an email login. Deposit ETH on Base to your address to fund the account."
        >
          <UserInfo />
        </Step>
        <Step
          step={2}
          title="Upgrade EOA to Universal Account"
          description="Use EIP-7702 to delegate the Magic EOA on Base, upgrading it to a Particle Universal Account with chain abstraction."
        >
          <DelegationCard />
        </Step>
        <Step
          step={3}
          title="Convert Assets Cross-Chain"
          description="With the EOA upgraded, use the Universal Account to convert your Base ETH into USDC on Solana in a single transaction."
          isLast
        >
          <UniversalAccountCard />
        </Step>
      </main>
    </div>
  );
}
