'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils';
import { Plus, FileText, Bot, AlertTriangle, CheckCircle2, Loader2, Upload, Trash2 } from 'lucide-react';
import FileUpload from '@/components/FileUpload';

type Contract = {
  id: string; title: string; type: string; status: string; value?: number;
  partyA?: string; partyB?: string; startDate?: string; endDate?: string;
  signedDate?: string; content: string; riskScore?: number; aiReview?: string;
  event?: { name: string }; supplier?: { name: string };
};

const CONTRACT_TYPES = ['SERVICE', 'VENUE', 'NDA', 'CATERING', 'AV', 'EMPLOYMENT', 'PARTNERSHIP', 'AUTRE'];
const CONTRACT_TYPE_LABELS: Record<string, string> = {
  SERVICE: 'Contrat de service', VENUE: 'Contrat de salle', NDA: 'Accord de confidentialité',
  CATERING: 'Contrat traiteur', AV: 'Contrat AV', EMPLOYMENT: 'Contrat d\'emploi',
  PARTNERSHIP: 'Partenariat', AUTRE: 'Autre',
};

const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500';
const labelCls = 'block text-xs text-slate-400 mb-1';

const TEMPLATES = [
  { type: 'SERVICE', label: 'Contrat de services', desc: 'Pour tout prestataire de services événementiels' },
  { type: 'NDA', label: 'Accord de confidentialité', desc: 'Pour protéger vos informations sensibles' },
  { type: 'VENUE', label: 'Contrat de salle', desc: 'Location de lieu pour événement' },
  { type: 'CATERING', label: 'Contrat traiteur', desc: 'Services de restauration et traiteur' },
];

export default function LegalPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Contract | null>(null);
  const [createModal, setCreateModal] = useState(false);
  const [generateModal, setGenerateModal] = useState(false);
  const [uploadModal, setUploadModal] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [form, setForm] = useState({ title: '', type: 'SERVICE', partyA: 'Événements 2M Inc.', partyB: '', value: '', content: '', startDate: '', endDate: '' });
  const [genForm, setGenForm] = useState({ type: 'SERVICE', partyA: 'Événements 2M Inc.', partyB: '', eventDescription: '', value: '', specificTerms: '' });

  const fetchContracts = async () => {
    const r = await fetch('/api/legal/contracts');
    setContracts(await r.json());
    setLoading(false);
  };

  useEffect(() => { fetchContracts(); }, []);

  const createContract = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/legal/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, value: parseFloat(form.value) || null }),
    });
    setCreateModal(false);
    fetchContracts();
  };

  const generateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    const r = await fetch('/api/legal/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(genForm),
    });
    const data = await r.json();
    setGenerating(false);
    setGenerateModal(false);
    fetchContracts();
    if (data.id) {
      const r2 = await fetch(`/api/legal/contracts?id=${data.id}`);
      // setSelected(await r2.json()); // load the new one
    }
    fetchContracts();
  };

  const reviewContract = async (contract: Contract) => {
    setReviewing(true);
    const r = await fetch('/api/legal/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractId: contract.id, content: contract.content }),
    });
    const data = await r.json();
    setSelected({ ...contract, aiReview: data.review, riskScore: data.riskScore });
    setReviewing(false);
    fetchContracts();
  };

  const deleteContract = async (id: string, title: string) => {
    if (!confirm(`Supprimer le contrat "${title}" ? Cette action est irréversible.`)) return;
    await fetch(`/api/legal/contracts?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (selected?.id === id) setSelected(null);
    fetchContracts();
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/legal/contracts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    fetchContracts();
    if (selected?.id === id) setSelected({ ...selected, status });
  };

  const getRiskColor = (score?: number) => {
    if (!score) return 'text-slate-400';
    if (score >= 7) return 'text-red-400';
    if (score >= 4) return 'text-amber-400';
    return 'text-green-400';
  };

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Module Juridique"
        subtitle="Gestion des contrats et conformité légale"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setUploadModal(true)} className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors border border-slate-600">
              <Upload size={15} /> Importer fichier
            </button>
            <button onClick={() => setGenerateModal(true)} className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition-colors">
              <Bot size={15} /> Générer avec IA
            </button>
            <button onClick={() => setCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
              <Plus size={16} /> Nouveau contrat
            </button>
          </div>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Contract List */}
        <div className="w-80 border-r border-slate-800 flex flex-col">
          {/* Templates */}
          <div className="p-4 border-b border-slate-800">
            <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wide">Modèles rapides</p>
            <div className="space-y-1.5">
              {TEMPLATES.map(t => (
                <button key={t.type} onClick={() => { setGenForm({ ...genForm, type: t.type }); setGenerateModal(true); }}
                  className="w-full text-left p-2.5 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 hover:border-indigo-500/30 transition-all group">
                  <div className="text-sm text-white group-hover:text-indigo-300">{t.label}</div>
                  <div className="text-xs text-slate-500">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Contracts list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-3">Contrats ({contracts.length})</p>
            {loading ? <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-900 rounded-xl animate-pulse" />)}</div> :
              contracts.map(c => (
                <button key={c.id} onClick={() => setSelected(c)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${selected?.id === c.id ? 'bg-indigo-600/20 border-indigo-500/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500">{CONTRACT_TYPE_LABELS[c.type] || c.type}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full border ${getStatusColor(c.status)}`}>{getStatusLabel(c.status)}</span>
                  </div>
                  <div className="text-sm text-white font-medium line-clamp-1">{c.title}</div>
                  {c.value && <div className="text-xs text-emerald-400 mt-0.5">{formatCurrency(c.value)}</div>}
                  {c.riskScore !== undefined && c.riskScore !== null && (
                    <div className={`text-xs mt-1 ${getRiskColor(c.riskScore)}`}>Risque: {c.riskScore}/10</div>
                  )}
                </button>
              ))
            }
            {!loading && contracts.length === 0 && <p className="text-slate-500 text-sm text-center py-8">Aucun contrat</p>}
          </div>
        </div>

        {/* Contract Detail */}
        <div className="flex-1 overflow-y-auto">
          {selected ? (
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">{selected.title}</h2>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`text-xs px-2.5 py-1 rounded-full border ${getStatusColor(selected.status)}`}>{getStatusLabel(selected.status)}</span>
                    <span className="text-xs text-slate-500">{CONTRACT_TYPE_LABELS[selected.type]}</span>
                    {selected.value && <span className="text-xs text-emerald-400">{formatCurrency(selected.value)}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => reviewContract(selected)} disabled={reviewing}
                    className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg disabled:opacity-50 transition-colors">
                    {reviewing ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
                    Analyser par IA
                  </button>
                  {selected.status === 'DRAFT' && (
                    <button onClick={() => updateStatus(selected.id, 'SIGNED')}
                      className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition-colors">
                      <CheckCircle2 size={14} /> Marquer signé
                    </button>
                  )}
                  <button onClick={() => deleteContract(selected.id, selected.title)} title="Supprimer le contrat"
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 text-sm rounded-lg transition-colors">
                    <Trash2 size={14} /> Supprimer
                  </button>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  ['Partie A', selected.partyA || '—'],
                  ['Partie B', selected.partyB || '—'],
                  ['Valeur', selected.value ? formatCurrency(selected.value) : '—'],
                  ['Date début', selected.startDate ? formatDate(selected.startDate) : '—'],
                  ['Date fin', selected.endDate ? formatDate(selected.endDate) : '—'],
                  ['Date signature', selected.signedDate ? formatDate(selected.signedDate) : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="text-xs text-slate-500 mb-1">{k}</div>
                    <div className="text-sm text-white font-medium">{v}</div>
                  </div>
                ))}
              </div>

              {/* AI Review */}
              {selected.aiReview && (
                <div className="bg-slate-900 border border-purple-500/20 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Bot size={16} className="text-purple-400" />
                    <h3 className="font-semibold text-white">Analyse juridique IA</h3>
                    {selected.riskScore !== undefined && (
                      <span className={`ml-auto text-sm font-bold ${getRiskColor(selected.riskScore)}`}>
                        Score de risque: {selected.riskScore}/10
                        {selected.riskScore >= 7 && <AlertTriangle size={14} className="inline ml-1" />}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{selected.aiReview}</div>
                  <p className="mt-3 text-xs text-slate-600 italic">⚠ Cette analyse est fournie à titre informatif. Consultez un avocat pour toute décision juridique importante.</p>
                </div>
              )}

              {/* Contract Content */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="font-semibold text-white mb-4">Contenu du contrat</h3>
                <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-mono bg-slate-950 p-4 rounded-lg max-h-96 overflow-y-auto">
                  {selected.content}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <FileText size={48} className="mb-4 opacity-20" />
              <p className="text-lg">Sélectionnez un contrat</p>
              <p className="text-sm mt-1">ou générez-en un nouveau avec l'IA</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Contract Modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Nouveau contrat" size="xl">
        <form onSubmit={createContract} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Titre *</label>
              <input required className={inputCls} placeholder="Titre du contrat" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select className={inputCls} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {CONTRACT_TYPES.map(t => <option key={t} value={t}>{CONTRACT_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Valeur ($)</label>
              <input type="number" className={inputCls} value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Partie A</label>
              <input className={inputCls} value={form.partyA} onChange={e => setForm({ ...form, partyA: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Partie B</label>
              <input className={inputCls} value={form.partyB} onChange={e => setForm({ ...form, partyB: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Date début</label>
              <input type="date" className={inputCls} value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Date fin</label>
              <input type="date" className={inputCls} value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Contenu du contrat</label>
              <textarea className={inputCls} rows={8} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Rédigez le contrat ici..." />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setCreateModal(false)} className="px-4 py-2 text-sm text-slate-400">Annuler</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg">Créer</button>
          </div>
        </form>
      </Modal>

      {/* Upload Contract Modal */}
      <Modal open={uploadModal} onClose={() => setUploadModal(false)} title="Importer un contrat" size="md">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">Importez un contrat existant en PDF ou Word. Le texte sera extrait automatiquement.</p>
          <FileUpload
            accept=".pdf,.docx,.doc,.txt"
            label="Déposer votre contrat ici"
            hint="PDF ou Word (.docx) — glissez-déposez ou cliquez"
            onResult={async (result) => {
              if (result.text) {
                const title = result.filename.replace(/\.[^/.]+$/, '');
                await fetch('/api/legal/contracts', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ title, content: result.text, type: 'AUTRE', status: 'DRAFT' }),
                });
                setUploadModal(false);
                fetchContracts();
              }
            }}
          />
          <div className="p-3 bg-slate-800 rounded-lg text-xs text-slate-400 space-y-1">
            <p>✓ PDF — contrats scannés ou numériques</p>
            <p>✓ Word (.docx) — documents modifiables</p>
            <p>✓ Texte brut (.txt)</p>
          </div>
        </div>
      </Modal>

      {/* Generate Contract Modal */}
      <Modal open={generateModal} onClose={() => setGenerateModal(false)} title="Générer un contrat avec l'IA" size="lg">
        <form onSubmit={generateContract} className="space-y-4">
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-sm text-purple-300">
            L'IA va générer un contrat professionnel basé sur vos informations. Toujours valider avec un juriste.
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Type de contrat</label>
              <select className={inputCls} value={genForm.type} onChange={e => setGenForm({ ...genForm, type: e.target.value })}>
                {CONTRACT_TYPES.map(t => <option key={t} value={t}>{CONTRACT_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Valeur ($)</label>
              <input type="number" className={inputCls} placeholder="Valeur du contrat" value={genForm.value} onChange={e => setGenForm({ ...genForm, value: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Partie A (vous)</label>
              <input className={inputCls} value={genForm.partyA} onChange={e => setGenForm({ ...genForm, partyA: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Partie B (cocontractant)</label>
              <input className={inputCls} placeholder="Nom du cocontractant" value={genForm.partyB} onChange={e => setGenForm({ ...genForm, partyB: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Description de l'événement ou du contexte</label>
              <textarea className={inputCls} rows={3} value={genForm.eventDescription} onChange={e => setGenForm({ ...genForm, eventDescription: e.target.value })}
                placeholder="Ex: Gala de 500 personnes au Palais des Congrès le 15 juin 2026, service de traiteur gastronomique complet..." />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Conditions particulières (optionnel)</label>
              <textarea className={inputCls} rows={2} value={genForm.specificTerms} onChange={e => setGenForm({ ...genForm, specificTerms: e.target.value })}
                placeholder="Clauses spéciales, pénalités, conditions d'annulation particulières..." />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setGenerateModal(false)} className="px-4 py-2 text-sm text-slate-400">Annuler</button>
            <button type="submit" disabled={generating} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg disabled:opacity-50">
              {generating ? <><Loader2 size={14} className="animate-spin" />Génération...</> : <><Bot size={14} />Générer</>}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
