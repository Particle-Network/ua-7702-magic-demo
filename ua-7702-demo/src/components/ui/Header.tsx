import { useCallback, useState } from 'react';
import Image from 'next/image';
import Logo from 'public/logo.svg';
import { LoginProps } from '@/utils/types';
import { logout } from '@/utils/common';
import { useMagic } from '@/hooks/MagicProvider';
import { getNetworkName } from '@/utils/network';

const Header = ({ token, setToken }: LoginProps) => {
  const { magic } = useMagic();
  const publicAddress = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const [copied, setCopied] = useState(false);

  const disconnect = useCallback(async () => {
    if (magic) {
      await logout(setToken, magic);
    }
  }, [magic, setToken]);

  const copyAddress = useCallback(() => {
    if (publicAddress && !copied) {
      navigator.clipboard.writeText(publicAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [publicAddress, copied]);

  const truncated = publicAddress
    ? `${publicAddress.slice(0, 6)}...${publicAddress.slice(-4)}`
    : '';

  return (
    <nav className="topbar">
      <div className="topbar-left">
        <Image src={Logo} alt="Magic" width={28} height={28} />
        <span className="text-text-primary font-bold text-base">Magic</span>
        <span className="text-text-muted text-sm font-mono">Demo</span>
      </div>
      <div className="topbar-right">
        <div className="network-badge">
          <span className="green-dot" style={{ margin: 0 }} />
          {getNetworkName()}
        </div>
        {publicAddress && (
          <div className="address-pill" onClick={copyAddress} title="Click to copy full address">
            {copied ? 'Copied!' : truncated}
          </div>
        )}
        <button className="disconnect-btn" onClick={disconnect}>
          Disconnect
        </button>
      </div>
    </nav>
  );
};

export default Header;
