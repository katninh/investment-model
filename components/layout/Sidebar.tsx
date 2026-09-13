'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Compass,
  Scale,
  Gauge,
  TrendingUp,
  GitBranch,
  Target,
  PieChart,
  FileText,
  Table,
  Database,
  Settings,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}
interface NavSection {
  title?: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  { items: [{ href: '/', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    title: 'Models',
    items: [
      { href: '/regime', label: 'Regime', icon: Compass },
      { href: '/valuation', label: 'Valuation', icon: Scale },
      { href: '/sentiment', label: 'Sentiment', icon: Gauge },
      { href: '/momentum', label: 'Momentum', icon: TrendingUp },
      { href: '/scenarios', label: 'Scenarios', icon: GitBranch },
      { href: '/conviction', label: 'Conviction', icon: Target },
    ],
  },
  {
    title: 'Output',
    items: [
      { href: '/portfolio', label: 'Portfolio', icon: PieChart },
      { href: '/brief', label: 'Brief', icon: FileText },
    ],
  },
  {
    title: 'Data',
    items: [
      { href: '/indicators', label: 'Indicators', icon: Table },
      { href: '/data', label: 'Data Status', icon: Database },
    ],
  },
  { items: [{ href: '/settings', label: 'Settings', icon: Settings }] },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex h-16 items-center gap-2.5 border-b border-gray-200 px-6 dark:border-gray-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 font-bold text-white">
          M
        </div>
        <span className="font-semibold text-gray-800 dark:text-gray-100">Money Model</span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto p-4">
        {SECTIONS.map((sec, i) => (
          <div key={i}>
            {sec.title ? (
              <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                {sec.title}
              </div>
            ) : null}
            <ul className="space-y-1">
              {sec.items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                        active
                          ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                      }`}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.8} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
