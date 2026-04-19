'use client';

import { Bell, Search } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur border-b border-slate-800 flex items-center px-6 gap-4 sticky top-0 z-30">
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold text-white truncate">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <button className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all relative">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full" />
        </button>
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">
          E
        </div>
      </div>
    </header>
  );
}
