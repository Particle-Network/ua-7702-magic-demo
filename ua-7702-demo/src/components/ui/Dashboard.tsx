import React from 'react';
import UniversalAccountCard from '../magic/cards/UniversalAccountCard';
import { LoginProps } from '@/utils/types';
import UserInfo from '@/components/magic/cards/UserInfoCard';
import Header from './Header';

export default function Dashboard({ token, setToken }: LoginProps) {
  return (
    <div className="dashboard">
      <Header token={token} setToken={setToken} />
      <main className="dashboard-content">
        <UserInfo />
        <UniversalAccountCard />
      </main>
    </div>
  );
}
