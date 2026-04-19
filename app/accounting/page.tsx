'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel, generateInvoiceNumber } from '@/lib/utils';
import { Plus, TrendingUp, TrendingDown, DollarSign, FileText, Bot, Loader2, Upload } from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell } from 'recharts';

type Expense = { id: string; description: string; amount: number; category: string; date: string; vendor?: string; approved: boolean; event?: { name: string } };
type Invoice = { id: string; number: string; amount: number; tax: number; status: string; type: string; dueDate: string; paidDate?: string; issuer?: string; recipient?: string; event?: { name: string }; supplier?: { name: string } };

const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500';
const labelCls = 'block text-xs text-slate-400 mb-1';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

export default function AccountingPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);
  const [tab, setTab] = useState<'overview' | 'expenses' | 'invoices'>('overview');
  const [expenseModal, setExpenseModal] = useState(false);
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [aiModal, setAiModal] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [importEventId, setImportEventId] = useState('');
  const [importResult, setImportResult] = useState<{count: number} | null>(null);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const [expForm, setExpForm] = useState({ description: '', amount: '', category: 'Venue', date: new Date().toISOString().split('T')[0], vendor: '', eventId: '' });
  const [invForm, setInvForm] = useState({ number: generateInvoiceNumber(), issuer: 'Événements 2M Inc.', recipient: '', amount: '', tax: '15', dueDate: '', type: 'RECEIVABLE', eventId: '' });

  const fetchData = async () => {
    const [e, i, ev] = await Promise.all([
      fetch('/api/accounting/expenses').then(r => r.json()),
      fetch('/api/accounting/invoices').then(r => r.json()),
      fetch('/api/events').then(r => r.json()),
    ]);
    setExpenses(e);
    setInvoices(i);
    setEvents(ev);
  };

  useEffect(() => { fetchData(); }, []);

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/accounting/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...expForm, amount: parseFloat(expForm.amount) }),
    });
    setExpenseModal(false);
    fetchData();
  };

  const addInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/accounting/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...invForm, amount: parseFloat(invForm.amount), tax: parseFloat(invForm.tax) }),
    });
    setInvoiceModal(false);
    setInvForm({ ...invForm, number: generateInvoiceNumber() });
    fetchData();
  };

  const markPaid = async (id: string) => {
    await fetch('/api/accounting/invoices', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'PAID', paidDate: new Date().toISOString() }),
    });
    fetchData();
  };

  const askAi = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiResponse('');
    const r = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'accounting',
        messages: [{
          role: 'user', content: `${aiQuery}\n\nDonnées actuelles:\n- Dépenses totales: ${formatCurrency(totalExpenses)}\n- Factures à recevoir: ${formatCurrency(totalReceivable)}\n- Factures à payer: ${formatCurrency(totalPayable)}\n- Factures en retard: ${overdueInvoices}`
        }],
      }),
    });
    const data = await r.json();
    setAiResponse(data.content);
    setAiLoading(false);
  };

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalReceivable = invoices.filter(i => i.type === 'RECEIVABLE' && i.status !== 'PAID').reduce((s, i) => s + i.amount + i.tax, 0);
  const totalPayable = invoices.filter(i => i.type === 'PAYABLE' && i.status !== 'PAID').reduce((s, i) => s + i.amount + i.tax, 0);
  const overdueInvoices = invoices.filter(i => i.status === 'PENDING' && new Date(i.dueDate) < new Date()).length;

  // Category breakdown
  const byCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(byCategory).map(([name, value]) => ({ name, value }));

  // Monthly breakdown
  const byMonth = expenses.reduce((acc, e) => {
    const m = new Date(e.date).toLocaleString('fr-CA', { month: 'short' });
    acc[m] = (acc[m] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);
  const barData = Object.entries(byMonth).map(([month, amount]) => ({ month, amount }));

  const EXPENSE_CATEGORIES = ['Venue', 'Restauration', 'Son & Éclairage', 'Décoration', 'Marketing', 'Transport', 'Hébergement', 'Intervenants', 'Équipement', 'Divers'];

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Comptabilité"
        subtitle="Gestion financière et facturation"
        actions={
          <div className="flex gap-2">
            <button onClick={() => { setImportModal(true); setImportResult(null); }} className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg border border-slate-600">
              <Upload size={15} /> Importer Excel
            </button>
            <button onClick={() => setAiModal(true)} className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg border border-slate-700">
              <Bot size={15} /> Analyste IA
            </button>
            <button onClick={() => setExpenseModal(true)} className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg">
              <Plus size={15} /> Dépense
            </button>
            <button onClick={() => setInvoiceModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg">
              <Plus size={15} /> Facture
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Dépenses totales', value: formatCurrency(totalExpenses), icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
            { label: 'À recevoir', value: formatCurrency(totalReceivable), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
            { label: 'À payer', value: formatCurrency(totalPayable), icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
            { label: 'Factures en retard', value: overdueInvoices, icon: FileText, color: overdueInvoices > 0 ? 'text-red-400' : 'text-slate-400', bg: overdueInvoices > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-slate-800 border-slate-700' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-5 ${s.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">{s.label}</span>
                <s.icon size={16} className={s.color} />
              </div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
          {[['overview', 'Vue d\'ensemble'], ['expenses', 'Dépenses'], ['invoices', 'Factures']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="font-semibold text-white mb-4">Dépenses par mois</h3>
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData}>
                    <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} />
                    <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-slate-500 text-sm text-center py-12">Aucune dépense enregistrée</p>}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="font-semibold text-white mb-4">Répartition par catégorie</h3>
              {pieData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={180}>
                    <RechartsPie>
                      <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                    </RechartsPie>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1.5">
                    {pieData.slice(0, 6).map((d, i) => (
                      <div key={d.name} className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-slate-400 truncate flex-1">{d.name}</span>
                        <span className="text-white font-medium">{formatCurrency(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="text-slate-500 text-sm text-center py-12">Aucune donnée</p>}
            </div>
          </div>
        )}

        {tab === 'expenses' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-800">
                <tr className="text-xs text-slate-500">
                  <th className="text-left p-4 font-medium">Description</th>
                  <th className="text-left p-4 font-medium">Événement</th>
                  <th className="text-left p-4 font-medium">Catégorie</th>
                  <th className="text-left p-4 font-medium">Date</th>
                  <th className="text-right p-4 font-medium">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {expenses.map(e => (
                  <tr key={e.id} className="hover:bg-slate-800/50">
                    <td className="p-4 text-white">{e.description}</td>
                    <td className="p-4 text-slate-400">{e.event?.name || '—'}</td>
                    <td className="p-4"><span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded">{e.category}</span></td>
                    <td className="p-4 text-slate-400">{formatDate(e.date)}</td>
                    <td className="p-4 text-right text-red-400 font-semibold">{formatCurrency(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {expenses.length === 0 && <p className="text-slate-500 text-sm text-center py-12">Aucune dépense</p>}
          </div>
        )}

        {tab === 'invoices' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-800">
                <tr className="text-xs text-slate-500">
                  <th className="text-left p-4 font-medium">N°</th>
                  <th className="text-left p-4 font-medium">De / À</th>
                  <th className="text-left p-4 font-medium">Type</th>
                  <th className="text-left p-4 font-medium">Échéance</th>
                  <th className="text-left p-4 font-medium">Statut</th>
                  <th className="text-right p-4 font-medium">Montant TTC</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-800/50">
                    <td className="p-4 font-mono text-xs text-indigo-400">{inv.number}</td>
                    <td className="p-4 text-slate-300">{inv.type === 'RECEIVABLE' ? inv.recipient : inv.issuer}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${inv.type === 'RECEIVABLE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                        {inv.type === 'RECEIVABLE' ? 'À recevoir' : 'À payer'}
                      </span>
                    </td>
                    <td className={`p-4 text-sm ${new Date(inv.dueDate) < new Date() && inv.status !== 'PAID' ? 'text-red-400' : 'text-slate-400'}`}>{formatDate(inv.dueDate)}</td>
                    <td className="p-4"><span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(inv.status)}`}>{getStatusLabel(inv.status)}</span></td>
                    <td className="p-4 text-right font-semibold text-white">{formatCurrency(inv.amount + inv.tax)}</td>
                    <td className="p-4">
                      {inv.status === 'PENDING' && (
                        <button onClick={() => markPaid(inv.id)} className="text-xs text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded hover:bg-emerald-500/10">Marquer payé</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {invoices.length === 0 && <p className="text-slate-500 text-sm text-center py-12">Aucune facture</p>}
          </div>
        )}
      </div>

      {/* Expense Modal */}
      <Modal open={expenseModal} onClose={() => setExpenseModal(false)} title="Nouvelle dépense" size="md">
        <form onSubmit={addExpense} className="space-y-4">
          <div>
            <label className={labelCls}>Description *</label>
            <input required className={inputCls} value={expForm.description} onChange={e => setExpForm({ ...expForm, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Montant ($) *</label>
              <input required type="number" step="0.01" className={inputCls} value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Catégorie</label>
              <select className={inputCls} value={expForm.category} onChange={e => setExpForm({ ...expForm, category: e.target.value })}>
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Fournisseur</label>
              <input className={inputCls} value={expForm.vendor} onChange={e => setExpForm({ ...expForm, vendor: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" className={inputCls} value={expForm.date} onChange={e => setExpForm({ ...expForm, date: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Événement</label>
              <select className={inputCls} value={expForm.eventId} onChange={e => setExpForm({ ...expForm, eventId: e.target.value })}>
                <option value="">Sélectionner...</option>
                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setExpenseModal(false)} className="px-4 py-2 text-sm text-slate-400">Annuler</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg">Ajouter</button>
          </div>
        </form>
      </Modal>

      {/* Invoice Modal */}
      <Modal open={invoiceModal} onClose={() => setInvoiceModal(false)} title="Nouvelle facture" size="md">
        <form onSubmit={addInvoice} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>N° de facture</label>
              <input className={inputCls} value={invForm.number} onChange={e => setInvForm({ ...invForm, number: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select className={inputCls} value={invForm.type} onChange={e => setInvForm({ ...invForm, type: e.target.value })}>
                <option value="RECEIVABLE">À recevoir (client)</option>
                <option value="PAYABLE">À payer (fournisseur)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Émetteur</label>
              <input className={inputCls} value={invForm.issuer} onChange={e => setInvForm({ ...invForm, issuer: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Destinataire</label>
              <input className={inputCls} value={invForm.recipient} onChange={e => setInvForm({ ...invForm, recipient: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Montant avant taxes ($)</label>
              <input required type="number" step="0.01" className={inputCls} value={invForm.amount} onChange={e => setInvForm({ ...invForm, amount: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Taxes ($)</label>
              <input type="number" step="0.01" className={inputCls} value={invForm.tax} onChange={e => setInvForm({ ...invForm, tax: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Date d'échéance</label>
              <input required type="date" className={inputCls} value={invForm.dueDate} onChange={e => setInvForm({ ...invForm, dueDate: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Événement</label>
              <select className={inputCls} value={invForm.eventId} onChange={e => setInvForm({ ...invForm, eventId: e.target.value })}>
                <option value="">Aucun</option>
                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setInvoiceModal(false)} className="px-4 py-2 text-sm text-slate-400">Annuler</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg">Créer</button>
          </div>
        </form>
      </Modal>

      {/* Import Expenses Modal */}
      <Modal open={importModal} onClose={() => setImportModal(false)} title="Importer des dépenses (Excel/CSV)" size="md">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">Importez vos dépenses depuis un fichier Excel ou CSV. Colonnes reconnues:</p>
          <div className="bg-slate-800 rounded-lg p-3 text-xs text-slate-400 font-mono space-y-0.5">
            <p><span className="text-indigo-400">Description</span> — description de la dépense</p>
            <p><span className="text-indigo-400">Montant</span> ou Amount — montant en $</p>
            <p><span className="text-indigo-400">Catégorie</span> ou Category</p>
            <p><span className="text-indigo-400">Date</span> — format AAAA-MM-JJ</p>
            <p><span className="text-indigo-400">Fournisseur</span> ou Vendor</p>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Associer à l'événement</label>
            <select value={importEventId} onChange={e => setImportEventId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500">
              <option value="">Sélectionner un événement...</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          </div>
          {importEventId && (
            <FileUpload
              accept=".xlsx,.xls,.csv"
              label="Déposer votre fichier de dépenses"
              hint="Excel (.xlsx) ou CSV"
              onResult={async (result) => {
                if (!result.rows) return;
                let count = 0;
                for (const row of result.rows) {
                  const description = row['Description'] || row['description'] || '';
                  const amount = parseFloat(row['Montant'] || row['Amount'] || row['montant'] || '0');
                  if (!description || !amount) continue;
                  await fetch('/api/accounting/expenses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      description,
                      amount,
                      category: row['Catégorie'] || row['Category'] || row['categorie'] || 'Divers',
                      date: row['Date'] || row['date'] || new Date().toISOString().split('T')[0],
                      vendor: row['Fournisseur'] || row['Vendor'] || row['fournisseur'] || '',
                      eventId: importEventId,
                    }),
                  });
                  count++;
                }
                setImportResult({ count });
                fetchData();
              }}
            />
          )}
          {importResult && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-300">
              ✓ {importResult.count} dépense{importResult.count > 1 ? 's' : ''} importée{importResult.count > 1 ? 's' : ''} avec succès!
            </div>
          )}
          {!importEventId && <p className="text-xs text-amber-400">Sélectionnez d'abord un événement.</p>}
        </div>
      </Modal>

      {/* AI Modal */}
      <Modal open={aiModal} onClose={() => setAiModal(false)} title="Analyste financier IA" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">Posez vos questions financières — analyse de budget, TPS/TVQ, rentabilité, flux de trésorerie.</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              'Analyse ma rentabilité globale',
              'Comment optimiser mon budget événementiel?',
              'Quelles dépenses sont déductibles d\'impôt?',
              'Prévisions de flux de trésorerie pour les 3 prochains mois',
            ].map(q => (
              <button key={q} onClick={() => setAiQuery(q)} className="text-left text-xs p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors">{q}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={aiQuery} onChange={e => setAiQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && askAi()}
              placeholder="Votre question..." className={inputCls} />
            <button onClick={askAi} disabled={aiLoading || !aiQuery.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg disabled:opacity-50">
              {aiLoading ? '...' : 'Analyser'}
            </button>
          </div>
          {aiResponse && (
            <div className="bg-slate-800 rounded-xl p-4 text-sm text-slate-200 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">{aiResponse}</div>
          )}
        </div>
      </Modal>
    </div>
  );
}
