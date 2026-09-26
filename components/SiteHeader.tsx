import type { ReactNode } from 'react';

export function SiteHeader({ trailing }: { trailing?: ReactNode }) {
  return (
    <header className="top">
      <a className="brandlink" href="/">
        <span className="logo">P</span>
        Pladeplan
      </a>
      <div className="meta">
        {trailing}
        <a href="/">Til skæreplanen</a>
      </div>
    </header>
  );
}
