'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Shield,
  ScrollText,
  Server,
  Hexagon,
} from 'lucide-react';
import clsx from 'clsx';

const links = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/procure', label: 'Procure', icon: ShoppingCart },
  { href: '/policies', label: 'Policies', icon: Shield },
  { href: '/audit', label: 'Audit', icon: ScrollText },
  { href: '/providers', label: 'Providers', icon: Server },
];

export function Navigation({ status }) {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 font-semibold text-primary">
            <Hexagon className="h-7 w-7 text-secondary" />
            <span>PolicyMesh</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition',
                  pathname === href
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span
            className={clsx(
              'badge',
              status?.demoMode ? 'bg-accent/15 text-amber-700' : 'bg-success/15 text-emerald-700',
            )}
          >
            {status?.demoMode ? 'Demo' : status?.network || 'testnet'}
          </span>
          <span className="hidden text-slate-500 sm:inline">
            {status?.activeProcurements ?? 0} active
          </span>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 md:hidden">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              'whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium',
              pathname === href ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600',
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
