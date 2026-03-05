import React, { useCallback } from 'react';
import DevLinks from './DevLinks';
import Image from 'next/image';
import Info from 'public/info.svg';
import Link from 'public/link_white.svg';
import Logo from 'public/logo.svg';

const MagicDashboardRedirect = () => {
  const onClick = useCallback(() => {
    window.open('https://dashboard.magic.link/signup', '_blank');
  }, []);

  return (
    <div className="redirect-container">
      <div className="flex flex-col mt-16 gap-2.5 items-center">
        <Image src={Logo} alt="logo" width={40} height={40} />
        <div className="text-text-primary text-2xl font-bold mt-2">Magic</div>
        <div className="text-text-muted text-sm font-mono">Demo</div>
      </div>
      <div className="flex flex-col items-center flex-1 mt-10">
        <div className="redirect-card">
          <div className="flex gap-3 mx-4 my-2">
            <Image src={Info} alt="info" />
            <p className="max-w-[480px] text-text-secondary text-sm">
              Please set your <code className="text-brand font-mono text-xs">NEXT_PUBLIC_MAGIC_API_KEY</code> environment
              variable in <code className="text-brand font-mono text-xs">.env</code>. You can get your Magic API key from
              the Magic Dashboard.
            </p>
          </div>
        </div>

        <button className="api-button mt-6" onClick={onClick} disabled={false}>
          Get API keys
          <Image src={Link} alt="link-icon" className="ml-[6px] my-auto" />
        </button>
      </div>
      <div className="mb-10">
        <DevLinks />
      </div>
    </div>
  );
};

export default MagicDashboardRedirect;
