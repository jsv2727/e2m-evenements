'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Truck,
  FileText,
  DollarSign,
  Bot,
  Settings,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/events', label: 'Événements', icon: Calendar },
  { href: '/guests', label: 'Invités', icon: Users },
  { href: '/suppliers', label: 'Fournisseurs', icon: Truck },
  { href: '/legal', label: 'Juridique', icon: FileText },
  { href: '/accounting', label: 'Comptabilité', icon: DollarSign },
  { href: '/ai', label: 'Assistant IA', icon: Bot },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-slate-900 border-r border-slate-800 flex flex-col z-40">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-lg leading-tight">E2M</div>
            <div className="text-xs text-slate-400">Événements 2M</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                active
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0" size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <Settings size={18} />
          Paramètres
        </Link>
        <div className="mt-3 px-3 py-2 bg-slate-800/50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse-slow" />
            <span className="text-xs text-slate-400">IA Active</span>
          </div>
          <div className="text-xs text-indigo-400 font-mono truncate">claude-opus-4-7</div>
        </div>
      </div>
    </aside>
  );
}
