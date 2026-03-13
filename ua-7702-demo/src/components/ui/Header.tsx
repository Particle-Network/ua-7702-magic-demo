import { useCallback } from 'react';
import Image from 'next/image';
import Logo from 'public/logo.svg';
import { LoginProps } from '@/utils/types';
import { logout } from '@/utils/common';
import { useMagic } from '@/hooks/MagicProvider';

const Header = ({ setToken }: LoginProps) => {
  const { magic } = useMagic();

  const disconnect = useCallback(async () => {
    if (magic) {
      await logout(setToken, magic);
    }
  }, [magic, setToken]);

  return (
    <nav className="topbar">
      <div className="topbar-left">
        <Image src={Logo} alt="Magic" width={24} height={24} />
        <span className="text-text-muted text-sm font-mono mx-1">+</span>
        <Image src="/particle-logo.png" alt="Particle Network" width={120} height={24} style={{ objectFit: 'contain' }} />
        <span className="text-text-muted text-xs font-mono ml-3">EIP-7702 Universal Account Demo</span>
      </div>
      <div className="topbar-right">
        <button className="disconnect-btn" onClick={disconnect}>
          Disconnect
        </button>
      </div>
    </nav>
  );
};

export default Header;
