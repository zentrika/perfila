'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import Brand from './Brand';
import ThemeToggle from './ThemeToggle';

const NAV = [
  { href: '/crear', label: 'Crear hoja de vida', short: 'Crear' },
  { href: '/analizar', label: 'Analizar mi CV', short: 'Analizar' },
];

export default function SiteHeader() {
  const path = usePathname();
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="Perfila — by ZENTRIKA, inicio">
          <Brand />
        </Link>
        <nav className="nav" aria-label="Principal">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={`nav-link${path?.startsWith(n.href) ? ' is-active' : ''}`} aria-current={path?.startsWith(n.href) ? 'page' : undefined}>
              <span className="nav-long">{n.label}</span>
              <span className="nav-short">{n.short}</span>
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
