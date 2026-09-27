import type { ReactNode } from 'react';
import { AuthLinks } from '@/components/AuthSlot';
import { clerkConfigured } from '@/lib/env';

export function SiteHeader({ trailing }: { trailing?: ReactNode }) {
  return (
    <header className="top">
      <div className="brandcluster">
        <a className="brandlink" href="/">
          <span className="logo">P</span>
          Pladeplan
        </a>
        {clerkConfigured() ? <AuthLinks /> : null}
      </div>
      <div className="meta">
        {trailing}
        <a href="/">Til skæreplanen</a>
      </div>
    </header>
  );
}
