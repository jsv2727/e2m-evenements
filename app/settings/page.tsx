'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { Save, Bot, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState('');

  useEffect(() => {
    fetch('/api/ai/model').then(r => r.json()).then(d => setModel(d.model));
  }, []);

  const testConnection = async () => {
    setTestLoading(true);
    setTestResult('');
    const r = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module: 'general', messages: [{ role: 'user', content: 'Réponds uniquement: "Connexion réussie!"' }] }),
    });
    const d = await r.json();
    setTestResult(d.content);
    setTestLoading(false);
  };

  const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500';

  return (
    <div className="flex flex-col flex-1">
      <Header title="Paramètres" subtitle="Configuration de l'application" />
      <div className="p-6 max-w-2xl space-y-6">
        {/* AI Settings */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Bot size={18} className="text-indigo-400" />
            <h2 className="font-semibold text-white">Intelligence Artificielle</h2>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Clé API Anthropic</label>
            <input type="password" className={inputCls} placeholder="sk-ant-..." value={apiKey} onChange={e => setApiKey(e.target.value)} />
            <p className="text-xs text-slate-500 mt-1">Configurez votre clé dans le fichier <code className="text-indigo-400">.env</code> à la racine du projet.</p>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Modèle actif</label>
            <div className="flex items-center gap-2 p-3 bg-slate-800 rounded-lg border border-slate-700">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-indigo-400 font-mono">{model || 'Chargement...'}</span>
              <span className="ml-auto text-xs text-slate-500">Auto-détection activée</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Le modèle le plus performant disponible est sélectionné automatiquement et mis à jour toutes les heures.</p>
          </div>

          <div>
            <button onClick={testConnection} disabled={testLoading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50">
              <RefreshCw size={14} className={testLoading ? 'animate-spin' : ''} />
              Tester la connexion IA
            </button>
            {testResult && (
              <div className={`mt-2 p-3 rounded-lg text-sm ${testResult.includes('❌') ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-green-500/10 border border-green-500/20 text-green-300'}`}>
                {testResult}
              </div>
            )}
          </div>
        </div>

        {/* About */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="font-semibold text-white mb-4">À propos de E2M</h2>
          <div className="space-y-2 text-sm text-slate-400">
            <p>Version 1.0.0 — Plateforme de gestion d'événements professionnelle</p>
            <p>Développé pour Événements 2M</p>
            <p className="pt-2 text-xs text-slate-600">Modules: Événements · Fournisseurs · Invités · Juridique · Comptabilité · IA</p>
          </div>
        </div>
      </div>
    </div>
  );
}
