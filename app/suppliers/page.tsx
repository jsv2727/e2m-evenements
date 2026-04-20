'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import { getStatusColor, getStatusLabel } from '@/lib/utils';
import { Plus, Star, Phone, Mail, Globe, Truck, Search, Bot, Trash2 } from 'lucide-react';

type Supplier = {
  id: string; name: string; category: string; email?: string; phone?: string;
  address?: string; website?: string; contactName?: string; rating?: number; notes?: string;
  _count?: { events: number; contracts: number };
};

const CATEGORIES = ['Restauration', 'Son & Éclairage', 'Décoration', 'Photographie', 'Vidéographie', 'Divertissement', 'Transport', 'Sécurité', 'Fleurs', 'Impression', 'Technique', 'Animation', 'Hébergement', 'Autre'];

const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500';
const labelCls = 'block text-xs text-slate-400 mb-1';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [modal, setModal] = useState(false);
  const [aiModal, setAiModal] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', email: '', phone: '', address: '', website: '', contactName: '', rating: '5', notes: '' });

  const fetchSuppliers = async () => {
    const r = await fetch('/api/suppliers');
    const data = await r.json();
    setSuppliers(data);
    setLoading(false);
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, rating: parseInt(form.rating) }),
    });
    setModal(false);
    setForm({ name: '', category: '', email: '', phone: '', address: '', website: '', contactName: '', rating: '5', notes: '' });
    fetchSuppliers();
  };

  const askAi = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiResponse('');
    try {
      const r = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'suppliers',
          messages: [{ role: 'user', content: aiQuery }],
        }),
      });
      const data = await r.json();
      setAiResponse(data.content);
    } catch { setAiResponse('Erreur de connexion.'); }
    setAiLoading(false);
  };

  const deleteSupplier = async (id: string, name: string) => {
    if (!confirm(`Supprimer le fournisseur "${name}" ? Cette action est irréversible.`)) return;
    const r = await fetch(`/api/suppliers?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!r.ok) {
      alert('Impossible de supprimer ce fournisseur. Il est peut-être lié à des événements ou contrats existants.');
      return;
    }
    fetchSuppliers();
  };

  const filtered = suppliers.filter(s => {
    const q = search.toLowerCase();
    return (!q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)) &&
      (!category || s.category === category);
  });

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Fournisseurs"
        subtitle={`${filtered.length} fournisseur${filtered.length > 1 ? 's' : ''}`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => setAiModal(true)} className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors border border-slate-700">
              <Bot size={15} /> Conseiller IA
            </button>
            <button onClick={() => setModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
              <Plus size={16} /> Nouveau fournisseur
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
            <option value="">Toutes catégories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {loading ? [1, 2, 3].map(i => <div key={i} className="h-40 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />) :
            filtered.map(s => (
              <div key={s.id} className="group relative bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all">
                <button onClick={() => deleteSupplier(s.id, s.name)} title="Supprimer le fournisseur" className="absolute top-3 right-3 text-slate-500 hover:text-red-400 p-1.5 rounded hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 size={14} />
                </button>
                <div className="flex items-start justify-between mb-3 pr-8">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{s.name}</h3>
                    <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{s.category}</span>
                  </div>
                  {s.rating && (
                    <div className="flex items-center gap-1 ml-2">
                      <Star size={13} className="text-amber-400 fill-amber-400" />
                      <span className="text-sm font-medium text-amber-400">{s.rating}</span>
                    </div>
                  )}
                </div>
                {s.contactName && <p className="text-sm text-slate-300 mb-2">{s.contactName}</p>}
                <div className="space-y-1.5">
                  {s.email && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Mail size={12} className="text-indigo-400" />
                      <span className="truncate">{s.email}</span>
                    </div>
                  )}
                  {s.phone && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Phone size={12} className="text-indigo-400" />
                      <span>{s.phone}</span>
                    </div>
                  )}
                  {s.website && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Globe size={12} className="text-indigo-400" />
                      <a href={s.website} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline truncate">{s.website}</a>
                    </div>
                  )}
                </div>
                {s.notes && <p className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-500 line-clamp-2">{s.notes}</p>}
              </div>
            ))
          }
          {!loading && filtered.length === 0 && (
            <div className="col-span-3 text-center py-20 text-slate-500">
              <Truck size={40} className="mx-auto mb-3 opacity-30" />
              <p>Aucun fournisseur trouvé</p>
            </div>
          )}
        </div>
      </div>

      {/* New Supplier Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Nouveau fournisseur" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nom *</label>
              <input required className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nom du fournisseur" />
            </div>
            <div>
              <label className={labelCls}>Catégorie *</label>
              <select required className={inputCls} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="">Sélectionner...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Personne-contact</label>
              <input className={inputCls} value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Note (/5)</label>
              <select className={inputCls} value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })}>
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Courriel</label>
              <input type="email" className={inputCls} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Téléphone</label>
              <input className={inputCls} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Site web</label>
              <input className={inputCls} value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Adresse</label>
              <input className={inputCls} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Notes</label>
              <textarea className={inputCls} rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Annuler</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg">Ajouter</button>
          </div>
        </form>
      </Modal>

      {/* AI Advisor Modal */}
      <Modal open={aiModal} onClose={() => setAiModal(false)} title="Conseiller IA — Fournisseurs" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">Posez vos questions sur la gestion, l'évaluation ou la négociation avec vos fournisseurs.</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              'Comment évaluer un traiteur pour un gala?',
              'Quelles clauses inclure dans un contrat fournisseur?',
              'Comment négocier les prix pour un événement de 500 personnes?',
              'Quels fournisseurs audiovisuels sont fiables à Montréal?',
            ].map(q => (
              <button key={q} onClick={() => setAiQuery(q)}
                className="text-left text-xs p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors">
                {q}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={aiQuery} onChange={e => setAiQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && askAi()}
              placeholder="Votre question..." className={inputCls} />
            <button onClick={askAi} disabled={aiLoading || !aiQuery.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap">
              {aiLoading ? '...' : 'Demander'}
            </button>
          </div>
          {aiResponse && (
            <div className="bg-slate-800 rounded-xl p-4 text-sm text-slate-200 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
              {aiResponse}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
