'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import FileUpload from '@/components/FileUpload';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Upload, Trash2, Pencil, AlertTriangle, Bot, Loader2, ChevronDown, ChevronRight, FileText } from 'lucide-react';

type EventLite = { id: string; name: string; startDate: string; budget: number };
type BudgetItem = { id: string; category: string; amount: number; notes?: string; sortOrder: number };
type Expense = { id: string; description: string; amount: number; category: string; date: string; vendor?: string };
type Invoice = { id: string; number: string; amount: number; tax: number; status: string; type: string; dueDate: string; paidDate?: string; issuer?: string; recipient?: string; event?: { name: string } };

const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500';
const labelCls = 'block text-xs text-slate-400 mb-1';

export default function AccountingPage() {
  const [events, setEvents] = useState<EventLite[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [budget, setBudget] = useState<BudgetItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [importModal, setImportModal] = useState(false);
  const [importResult, setImportResult] = useState<{ count: number } | null>(null);

  const [budgetModal, setBudgetModal] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ id: '', category: '', amount: '', notes: '' });

  const [expenseModal, setExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ id: '', description: '', amount: '', category: '', date: new Date().toISOString().split('T')[0], vendor: '' });

  const [aiModal, setAiModal] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const [tab, setTab] = useState<'budget' | 'invoices'>('budget');

  const fetchEvents = async () => {
    const r = await fetch('/api/events');
    const data: EventLite[] = await r.json();
    setEvents(data);
    if (!selectedEventId && data[0]) setSelectedEventId(data[0].id);
  };

  const fetchEventData = async (eventId: string) => {
    if (!eventId) return;
    setLoading(true);
    const [b, e, inv] = await Promise.all([
      fetch(`/api/events/${eventId}/budget`).then(r => r.json()),
      fetch(`/api/events/${eventId}`).then(r => r.json()),
      fetch('/api/accounting/invoices').then(r => r.json()),
    ]);
    setBudget(b);
    setExpenses(e.expenses || []);
    setInvoices(inv);
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, []);
  useEffect(() => { fetchEventData(selectedEventId); }, [selectedEventId]);

  const selectedEvent = events.find(e => e.id === selectedEventId);

  // Build rows: one per budget category + virtual rows for expense-only categories
  const rows = useMemo(() => {
    const byCategory = new Map<string, { budget: number; spent: number; items: Expense[]; budgetId?: string; notes?: string; sortOrder: number }>();
    budget.forEach(b => {
      byCategory.set(b.category, { budget: b.amount, spent: 0, items: [], budgetId: b.id, notes: b.notes, sortOrder: b.sortOrder });
    });
    expenses.forEach(e => {
      const key = e.category || 'Divers';
      if (!byCategory.has(key)) byCategory.set(key, { budget: 0, spent: 0, items: [], sortOrder: 999 });
      const r = byCategory.get(key)!;
      r.spent += e.amount;
      r.items.push(e);
    });
    return Array.from(byCategory.entries())
      .map(([cat, v]) => ({ category: cat, ...v }))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.category.localeCompare(b.category));
  }, [budget, expenses]);

  const totalBudget = rows.reduce((s, r) => s + r.budget, 0);
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const globalPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const eventInvoices = invoices.filter(i => i.event?.name === selectedEvent?.name);
  const eventReceivable = eventInvoices.filter(i => i.type === 'RECEIVABLE' && i.status !== 'PAID').reduce((s, i) => s + i.amount + i.tax, 0);
  const eventPayable = eventInvoices.filter(i => i.type === 'PAYABLE' && i.status !== 'PAID').reduce((s, i) => s + i.amount + i.tax, 0);

  const openBudgetAdd = () => {
    setBudgetForm({ id: '', category: '', amount: '', notes: '' });
    setBudgetModal(true);
  };
  const openBudgetEdit = (b: BudgetItem) => {
    setBudgetForm({ id: b.id, category: b.category, amount: String(b.amount), notes: b.notes || '' });
    setBudgetModal(true);
  };
  const saveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (budgetForm.id) {
      await fetch(`/api/events/${selectedEventId}/budget`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(budgetForm),
      });
    } else {
      await fetch(`/api/events/${selectedEventId}/budget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(budgetForm),
      });
    }
    setBudgetModal(false);
    fetchEventData(selectedEventId);
  };
  const deleteBudgetItem = async (id: string, category: string) => {
    if (!confirm(`Supprimer la ligne de budget "${category}" ?`)) return;
    await fetch(`/api/events/${selectedEventId}/budget?itemId=${encodeURIComponent(id)}`, { method: 'DELETE' });
    fetchEventData(selectedEventId);
  };

  const openExpenseAdd = (category?: string) => {
    setExpenseForm({ id: '', description: '', amount: '', category: category || '', date: new Date().toISOString().split('T')[0], vendor: '' });
    setExpenseModal(true);
  };
  const openExpenseEdit = (e: Expense) => {
    setExpenseForm({ id: e.id, description: e.description, amount: String(e.amount), category: e.category, date: e.date.slice(0, 10), vendor: e.vendor || '' });
    setExpenseModal(true);
  };
  const saveExpense = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const payload = { ...expenseForm, amount: parseFloat(expenseForm.amount) };
    if (expenseForm.id) {
      await fetch(`/api/events/${selectedEventId}/expenses`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch(`/api/events/${selectedEventId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    setExpenseModal(false);
    fetchEventData(selectedEventId);
  };
  const deleteExpense = async (id: string, description: string) => {
    if (!confirm(`Supprimer la dépense "${description}" ?`)) return;
    await fetch(`/api/events/${selectedEventId}/expenses?expenseId=${encodeURIComponent(id)}`, { method: 'DELETE' });
    fetchEventData(selectedEventId);
  };

  const toggleExpand = (cat: string) => setExpanded(p => ({ ...p, [cat]: !p[cat] }));

  const askAi = async () => {
    if (!aiQuery.trim() || !selectedEvent) return;
    setAiLoading(true);
    setAiResponse('');
    const summary = rows.map(r => `${r.category}: budget ${formatCurrency(r.budget)}, dépensé ${formatCurrency(r.spent)} (${r.budget > 0 ? Math.round((r.spent / r.budget) * 100) : 0}%)`).join('\n');
    const r = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'accounting',
        messages: [{
          role: 'user',
          content: `Événement: ${selectedEvent.name}\nBudget total: ${formatCurrency(totalBudget)}\nDépenses totales: ${formatCurrency(totalSpent)}\n\nDétail par département:\n${summary}\n\nQuestion: ${aiQuery}`,
        }],
      }),
    });
    const data = await r.json();
    setAiResponse(data.content);
    setAiLoading(false);
  };

  const pctColor = (p: number) => p > 100 ? 'text-red-400' : p > 90 ? 'text-amber-400' : p > 70 ? 'text-yellow-400' : 'text-emerald-400';
  const barColor = (p: number) => p > 100 ? 'bg-red-500' : p > 90 ? 'bg-amber-500' : p > 70 ? 'bg-yellow-500' : 'bg-emerald-500';

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Suivi de budget"
        subtitle={selectedEvent ? selectedEvent.name : 'Sélectionnez un événement'}
        actions={
          <div className="flex gap-2">
            <button onClick={() => setAiModal(true)} disabled={!selectedEventId} className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg border border-slate-700 disabled:opacity-50">
              <Bot size={15} /> Analyse IA
            </button>
            <button onClick={() => { setImportModal(true); setImportResult(null); }} disabled={!selectedEventId} className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg border border-slate-600 disabled:opacity-50">
              <Upload size={15} /> Importer budget Excel
            </button>
            <button onClick={openBudgetAdd} disabled={!selectedEventId} className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg disabled:opacity-50">
              <Plus size={15} /> Département
            </button>
            <button onClick={() => openExpenseAdd()} disabled={!selectedEventId} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg disabled:opacity-50">
              <Plus size={15} /> Dépense
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Event selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-400">Événement:</label>
          <select value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 min-w-[320px]">
            <option value="">— Sélectionner —</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.name} ({formatDate(ev.startDate)})</option>
            ))}
          </select>
        </div>

        {!selectedEventId && (
          <div className="text-center py-20 text-slate-500">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p>Sélectionnez un événement pour voir son budget</p>
          </div>
        )}

        {selectedEventId && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Budget total', value: formatCurrency(totalBudget), color: 'text-white', bg: 'bg-slate-900 border-slate-800' },
                { label: 'Dépensé', value: formatCurrency(totalSpent), color: pctColor(globalPct), bg: 'bg-slate-900 border-slate-800' },
                { label: 'Restant', value: formatCurrency(totalRemaining), color: totalRemaining < 0 ? 'text-red-400' : 'text-emerald-400', bg: 'bg-slate-900 border-slate-800' },
                { label: '% utilisé', value: `${globalPct}%`, color: pctColor(globalPct), bg: globalPct > 100 ? 'bg-red-500/10 border-red-500/20' : 'bg-slate-900 border-slate-800' },
              ].map(s => (
                <div key={s.label} className={`rounded-xl border p-5 ${s.bg}`}>
                  <div className="text-xs text-slate-400 mb-1">{s.label}</div>
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
              {[['budget', 'Budget par département'], ['invoices', `Factures (${eventInvoices.length})`]].map(([id, label]) => (
                <button key={id} onClick={() => setTab(id as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                  {label}
                </button>
              ))}
            </div>

            {tab === 'budget' && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-800">
                    <tr className="text-xs text-slate-500">
                      <th className="text-left p-4 font-medium w-6"></th>
                      <th className="text-left p-4 font-medium">Département</th>
                      <th className="text-right p-4 font-medium">Budget prévu</th>
                      <th className="text-right p-4 font-medium">Dépensé</th>
                      <th className="text-right p-4 font-medium">Restant</th>
                      <th className="text-left p-4 font-medium w-64">Progression</th>
                      <th className="p-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {rows.length === 0 && !loading && (
                      <tr><td colSpan={7} className="p-12 text-center text-slate-500">
                        Aucun département configuré. Importez un budget Excel ou ajoutez un département.
                      </td></tr>
                    )}
                    {rows.map(r => {
                      const pct = r.budget > 0 ? Math.round((r.spent / r.budget) * 100) : (r.spent > 0 ? 100 : 0);
                      const remaining = r.budget - r.spent;
                      const isOpen = expanded[r.category];
                      return (
                        <>
                          <tr key={r.category} className="hover:bg-slate-800/50 group">
                            <td className="p-4">
                              <button onClick={() => toggleExpand(r.category)} className="text-slate-500 hover:text-white">
                                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                            </td>
                            <td className="p-4 text-white font-medium">
                              {r.category}
                              {r.budget === 0 && r.spent > 0 && (
                                <span className="ml-2 text-xs text-amber-400 inline-flex items-center gap-1">
                                  <AlertTriangle size={11} /> sans budget défini
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-right text-slate-300">{formatCurrency(r.budget)}</td>
                            <td className="p-4 text-right text-slate-300">{formatCurrency(r.spent)}</td>
                            <td className={`p-4 text-right font-medium ${remaining < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{formatCurrency(remaining)}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${barColor(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                </div>
                                <span className={`text-xs font-medium w-10 text-right ${pctColor(pct)}`}>{pct}%</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openExpenseAdd(r.category)} title="Ajouter une dépense dans ce département"
                                  className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded hover:bg-indigo-500/10">
                                  + dépense
                                </button>
                                {r.budgetId && (
                                  <>
                                    <button onClick={() => openBudgetEdit({ id: r.budgetId!, category: r.category, amount: r.budget, notes: r.notes, sortOrder: r.sortOrder })} title="Modifier le budget"
                                      className="text-slate-500 hover:text-indigo-400 p-1.5 rounded hover:bg-indigo-500/10">
                                      <Pencil size={14} />
                                    </button>
                                    <button onClick={() => deleteBudgetItem(r.budgetId!, r.category)} title="Supprimer ce département"
                                      className="text-slate-500 hover:text-red-400 p-1.5 rounded hover:bg-red-500/10">
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr key={`${r.category}-details`}>
                              <td></td>
                              <td colSpan={6} className="p-4 bg-slate-950/50">
                                {r.items.length === 0 ? (
                                  <p className="text-xs text-slate-500 italic">Aucune dépense enregistrée dans ce département.</p>
                                ) : (
                                  <table className="w-full text-xs">
                                    <thead className="text-slate-500">
                                      <tr>
                                        <th className="text-left pb-2 font-medium">Description</th>
                                        <th className="text-left pb-2 font-medium">Fournisseur</th>
                                        <th className="text-left pb-2 font-medium">Date</th>
                                        <th className="text-right pb-2 font-medium">Montant</th>
                                        <th className="pb-2"></th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                      {r.items.map(it => (
                                        <tr key={it.id} className="group/exp hover:bg-slate-800/40">
                                          <td className="py-2 text-white">{it.description}</td>
                                          <td className="py-2 text-slate-400">{it.vendor || '—'}</td>
                                          <td className="py-2 text-slate-400">{formatDate(it.date)}</td>
                                          <td className="py-2 text-right text-amber-400 font-medium">{formatCurrency(it.amount)}</td>
                                          <td className="py-2 text-right">
                                            <div className="inline-flex gap-1 opacity-0 group-hover/exp:opacity-100 transition-opacity">
                                              <button onClick={() => openExpenseEdit(it)} className="text-slate-500 hover:text-indigo-400 p-1 rounded">
                                                <Pencil size={12} />
                                              </button>
                                              <button onClick={() => deleteExpense(it.id, it.description)} className="text-slate-500 hover:text-red-400 p-1 rounded">
                                                <Trash2 size={12} />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                  {rows.length > 0 && (
                    <tfoot className="border-t-2 border-slate-700 bg-slate-950/50">
                      <tr className="font-semibold">
                        <td></td>
                        <td className="p-4 text-white">Total</td>
                        <td className="p-4 text-right text-white">{formatCurrency(totalBudget)}</td>
                        <td className="p-4 text-right text-white">{formatCurrency(totalSpent)}</td>
                        <td className={`p-4 text-right ${totalRemaining < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{formatCurrency(totalRemaining)}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${barColor(globalPct)}`} style={{ width: `${Math.min(globalPct, 100)}%` }} />
                            </div>
                            <span className={`text-xs font-medium w-10 text-right ${pctColor(globalPct)}`}>{globalPct}%</span>
                          </div>
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            {tab === 'invoices' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="text-xs text-slate-500 mb-1">À recevoir (événement)</div>
                    <div className="text-xl font-bold text-emerald-400">{formatCurrency(eventReceivable)}</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="text-xs text-slate-500 mb-1">À payer (événement)</div>
                    <div className="text-xl font-bold text-amber-400">{formatCurrency(eventPayable)}</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="text-xs text-slate-500 mb-1">Marge prévue</div>
                    <div className="text-xl font-bold text-white">{formatCurrency(eventReceivable - totalBudget)}</div>
                  </div>
                </div>
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {eventInvoices.map(inv => (
                        <tr key={inv.id} className="hover:bg-slate-800/50">
                          <td className="p-4 font-mono text-xs text-indigo-400">{inv.number}</td>
                          <td className="p-4 text-slate-300">{inv.type === 'RECEIVABLE' ? inv.recipient : inv.issuer}</td>
                          <td className="p-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${inv.type === 'RECEIVABLE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                              {inv.type === 'RECEIVABLE' ? 'À recevoir' : 'À payer'}
                            </span>
                          </td>
                          <td className="p-4 text-slate-400">{formatDate(inv.dueDate)}</td>
                          <td className="p-4 text-slate-400 text-xs">{inv.status}</td>
                          <td className="p-4 text-right font-semibold text-white">{formatCurrency(inv.amount + inv.tax)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {eventInvoices.length === 0 && <p className="text-slate-500 text-sm text-center py-12">Aucune facture liée à cet événement</p>}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Import Budget Modal */}
      <Modal open={importModal} onClose={() => setImportModal(false)} title="Importer un budget Excel" size="md">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">Importez le budget prévu par département depuis un fichier Excel ou CSV.</p>
          <div className="bg-slate-800 rounded-lg p-3 text-xs text-slate-400 font-mono space-y-0.5">
            <p>Colonnes reconnues:</p>
            <p><span className="text-indigo-400">Département</span> / Département / Category / Catégorie</p>
            <p><span className="text-indigo-400">Budget</span> / Montant / Amount</p>
            <p><span className="text-indigo-400">Notes</span> (optionnel)</p>
          </div>
          <FileUpload
            accept=".xlsx,.xls,.csv"
            label="Déposer votre budget ici"
            hint="Excel (.xlsx) ou CSV — une ligne par département"
            onResult={async (result) => {
              if (!result.rows) return;
              const items = result.rows
                .map(row => ({
                  category: row['Département'] || row['Departement'] || row['departement'] || row['Catégorie'] || row['categorie'] || row['Category'] || row['category'] || '',
                  amount: parseFloat(row['Budget'] || row['budget'] || row['Montant'] || row['montant'] || row['Amount'] || row['amount'] || '0'),
                  notes: row['Notes'] || row['notes'] || '',
                }))
                .filter(i => i.category && i.amount >= 0);
              const r = await fetch(`/api/events/${selectedEventId}/budget`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items }),
              });
              const data = await r.json();
              setImportResult({ count: data.count || items.length });
              fetchEventData(selectedEventId);
            }}
          />
          {importResult && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-300">
              ✓ {importResult.count} département{importResult.count > 1 ? 's' : ''} importé{importResult.count > 1 ? 's' : ''}!
            </div>
          )}
        </div>
      </Modal>

      {/* Budget Item Modal */}
      <Modal open={budgetModal} onClose={() => setBudgetModal(false)} title={budgetForm.id ? 'Modifier le département' : 'Nouveau département'} size="sm">
        <form onSubmit={saveBudget} className="space-y-4">
          <div>
            <label className={labelCls}>Département / Catégorie *</label>
            <input required className={inputCls} value={budgetForm.category} onChange={e => setBudgetForm({ ...budgetForm, category: e.target.value })} placeholder="Ex: Restauration, Son & Éclairage..." />
          </div>
          <div>
            <label className={labelCls}>Budget prévu ($) *</label>
            <input required type="number" step="0.01" min="0" className={inputCls} value={budgetForm.amount} onChange={e => setBudgetForm({ ...budgetForm, amount: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <input className={inputCls} value={budgetForm.notes} onChange={e => setBudgetForm({ ...budgetForm, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setBudgetModal(false)} className="px-4 py-2 text-sm text-slate-400">Annuler</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg">{budgetForm.id ? 'Enregistrer' : 'Ajouter'}</button>
          </div>
        </form>
      </Modal>

      {/* Expense Modal */}
      <Modal open={expenseModal} onClose={() => setExpenseModal(false)} title={expenseForm.id ? 'Modifier la dépense' : 'Nouvelle dépense'} size="md">
        <form onSubmit={saveExpense} className="space-y-4">
          <div>
            <label className={labelCls}>Description *</label>
            <input required className={inputCls} value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Montant ($) *</label>
              <input required type="number" step="0.01" className={inputCls} value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Département *</label>
              <select required className={inputCls} value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}>
                <option value="">Sélectionner...</option>
                {budget.map(b => <option key={b.id} value={b.category}>{b.category}</option>)}
                <option value="Divers">Divers (hors budget)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Fournisseur</label>
              <input className={inputCls} value={expenseForm.vendor} onChange={e => setExpenseForm({ ...expenseForm, vendor: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" className={inputCls} value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setExpenseModal(false)} className="px-4 py-2 text-sm text-slate-400">Annuler</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg">{expenseForm.id ? 'Enregistrer' : 'Ajouter'}</button>
          </div>
        </form>
      </Modal>

      {/* AI Modal */}
      <Modal open={aiModal} onClose={() => setAiModal(false)} title="Analyse du budget par IA" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">Posez une question sur le budget de cet événement. L'IA a accès au détail par département.</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              'Quels départements dépassent leur budget?',
              'Où puis-je optimiser pour rester dans le budget?',
              'Quels sont les risques financiers actuels?',
              'Projection finale vs budget prévu',
            ].map(q => (
              <button key={q} onClick={() => setAiQuery(q)} className="text-left text-xs p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300">{q}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={aiQuery} onChange={e => setAiQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && askAi()}
              placeholder="Votre question..." className={inputCls} />
            <button onClick={askAi} disabled={aiLoading || !aiQuery.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg disabled:opacity-50">
              {aiLoading ? <Loader2 size={14} className="animate-spin" /> : 'Analyser'}
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
