'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Lock, Zap } from 'lucide-react';
import { safeNextPath } from '@/lib/auth';

function LoginForm() {
  const params = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Connexion impossible');
      }
      // Rechargement complet : le middleware relit le cookie de session.
      window.location.assign(safeNextPath(params.get('next')));
    } catch (err) {
      setError((err as Error).message);
      setPassword('');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-black/40 backdrop-blur">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-900/50">
          <Zap className="h-6 w-6 text-white" />
        </div>
        <div>
          <div className="text-lg font-bold leading-tight text-white">E2M</div>
          <div className="text-xs text-slate-400">Espace réservé à l&apos;équipe Événements 2M</div>
        </div>
      </div>

      <label htmlFor="password" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Mot de passe d&apos;équipe
      </label>
      <div className="relative">
        <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800/80 py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !password}
        className="mt-6 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition-colors hover:bg-indigo-500 disabled:opacity-50"
      >
        {loading ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.15),transparent_60%)] p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
