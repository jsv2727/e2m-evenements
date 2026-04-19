'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import { formatCurrency, formatDate, getDaysUntil, getStatusColor, getStatusLabel, calculateBudgetUsage } from '@/lib/utils';
import { CheckCircle2, Circle, Plus, Trash2, Users, DollarSign, FileText, Calendar, ArrowLeft, Bot, ChevronRight } from 'lucide-react';
import Link from 'next/link';

type Task = { id: string; title: string; status: string; priority: string; dueDate?: string; assignee?: string };
type Guest = { id: string; firstName: string; lastName: string; email: string; company?: string; status: string };
type Expense = { id: string; description: string; amount: number; category: string; date: string; vendor?: string; approved: boolean };
type EventDetail = {
  id: string; name: string; description?: string; startDate: string; endDate: string;
  venue?: string; city?: string; status: string; budget: number; clientName?: string;
  clientEmail?: string; type?: string; capacity?: number;
  tasks: Task[]; guests: Guest[]; expenses: Expense[];
};

const tabs = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: Calendar },
  { id: 'tasks', label: 'Tâches', icon: CheckCircle2 },
  { id: 'guests', label: 'Invités', icon: Users },
  { id: 'budget', label: 'Budget', icon: DollarSign },
];

const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500';
const labelCls = 'block text-xs text-slate-400 mb-1';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [tab, setTab] = useState('overview');
  const [taskModal, setTaskModal] = useState(false);
  const [guestModal, setGuestModal] = useState(false);
  const [expenseModal, setExpenseModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', priority: 'MEDIUM', dueDate: '', assignee: '' });
  const [guestForm, setGuestForm] = useState({ firstName: '', lastName: '', email: '', phone: '', company: '', status: 'INVITED' });
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', category: 'Venue', date: new Date().toISOString().split('T')[0], vendor: '' });
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const fetchEvent = async () => {
    const r = await fetch(`/api/events/${id}`);
    const data = await r.json();
    setEvent(data);
  };

  useEffect(() => { fetchEvent(); }, [id]);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/events/${id}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskForm),
    });
    setTaskModal(false);
    setTaskForm({ title: '', priority: 'MEDIUM', dueDate: '', assignee: '' });
    fetchEvent();
  };

  const toggleTask = async (taskId: string, currentStatus: string) => {
    await fetch(`/api/events/${id}/tasks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskId, status: currentStatus === 'DONE' ? 'TODO' : 'DONE' }),
    });
    fetchEvent();
  };

  const addGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/events/${id}/guests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guestForm),
    });
    setGuestModal(false);
    setGuestForm({ firstName: '', lastName: '', email: '', phone: '', company: '', status: 'INVITED' });
    fetchEvent();
  };

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/events/${id}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...expenseForm, amount: parseFloat(expenseForm.amount) }),
    });
    setExpenseModal(false);
    setExpenseForm({ description: '', amount: '', category: 'Venue', date: new Date().toISOString().split('T')[0], vendor: '' });
    fetchEvent();
  };

  const getAiSuggestions = async () => {
    setAiLoading(true);
    setAiSuggestion('');
    try {
      const r = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'events',
          messages: [{ role: 'user', content: `Analyse cet événement et donne-moi 3 suggestions prioritaires pour garantir son succès:\n\nNom: ${event?.name}\nDate: ${formatDate(event?.startDate!)}\nLieu: ${event?.venue}\nBudget: ${formatCurrency(event?.budget!)}\nStatut: ${getStatusLabel(event?.status!)}\nTâches en attente: ${event?.tasks.filter(t => t.status !== 'DONE').length}\nInvités confirmés: ${event?.guests.filter(g => g.status === 'CONFIRMED').length}/${event?.guests.length}` }],
        }),
      });
      const data = await r.json();
      setAiSuggestion(data.content);
    } catch {
      setAiSuggestion('Erreur de connexion à l\'IA.');
    }
    setAiLoading(false);
  };

  if (!event) return (
    <div className="flex items-center justify-center flex-1">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const spent = event.expenses.reduce((s, e) => s + e.amount, 0);
  const budgetPct = calculateBudgetUsage(event.budget, spent);
  const confirmedGuests = event.guests.filter(g => g.status === 'CONFIRMED').length;
  const doneTasks = event.tasks.filter(t => t.status === 'DONE').length;

  const EXPENSE_CATEGORIES = ['Venue', 'Restauration', 'Son & Éclairage', 'Décoration', 'Marketing', 'Transport', 'Hébergement', 'Intervenants', 'Équipement', 'Divers'];
  const GUEST_STATUSES = ['INVITED', 'CONFIRMED', 'DECLINED', 'ATTENDED', 'NO_SHOW'];

  return (
    <div className="flex flex-col flex-1">
      <Header
        title={event.name}
        subtitle={event.clientName ? `Client: ${event.clientName}` : formatDate(event.startDate)}
        actions={
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full border ${getStatusColor(event.status)}`}>{getStatusLabel(event.status)}</span>
            <Link href="/events" className="flex items-center gap-1 text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-all">
              <ArrowLeft size={14} />
              Retour
            </Link>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Date', value: formatDate(event.startDate), sub: `J-${getDaysUntil(event.startDate)}`, color: 'text-indigo-400' },
            { label: 'Budget', value: formatCurrency(event.budget), sub: `${formatCurrency(spent)} dépensé (${budgetPct}%)`, color: budgetPct > 90 ? 'text-red-400' : 'text-emerald-400' },
            { label: 'Invités', value: `${confirmedGuests}/${event.guests.length}`, sub: 'confirmés', color: 'text-blue-400' },
            { label: 'Tâches', value: `${doneTasks}/${event.tasks.length}`, sub: 'complétées', color: 'text-purple-400' },
          ].map(s => (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-500 mb-1">{s.label}</div>
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'overview' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="font-semibold text-white">Informations</h3>
              {[
                ['Lieu', event.venue || '—'],
                ['Ville', event.city || '—'],
                ['Type', event.type || '—'],
                ['Capacité', event.capacity ? `${event.capacity} personnes` : '—'],
                ['Client', event.clientName || '—'],
                ['Courriel', event.clientEmail || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-slate-500">{k}</span>
                  <span className="text-white">{v}</span>
                </div>
              ))}
              {event.description && (
                <div className="pt-3 border-t border-slate-800">
                  <p className="text-xs text-slate-400">{event.description}</p>
                </div>
              )}
            </div>

            {/* AI Suggestions */}
            <div className="bg-slate-900 border border-indigo-500/20 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Bot size={18} className="text-indigo-400" />
                  <h3 className="font-semibold text-white">Analyse IA</h3>
                </div>
                <button
                  onClick={getAiSuggestions}
                  disabled={aiLoading}
                  className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {aiLoading ? 'Analyse...' : 'Analyser'}
                </button>
              </div>
              {aiSuggestion ? (
                <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{aiSuggestion}</div>
              ) : (
                <p className="text-sm text-slate-500">Cliquez sur "Analyser" pour obtenir des recommandations IA personnalisées pour cet événement.</p>
              )}
            </div>
          </div>
        )}

        {tab === 'tasks' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Tâches ({event.tasks.length})</h3>
              <button onClick={() => setTaskModal(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors">
                <Plus size={12} /> Ajouter
              </button>
            </div>
            <div className="space-y-2">
              {event.tasks.length === 0 && <p className="text-slate-500 text-sm text-center py-8">Aucune tâche. Ajoutez-en une!</p>}
              {['URGENT', 'HIGH', 'MEDIUM', 'LOW'].map(priority =>
                event.tasks.filter(t => t.priority === priority).map(task => (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors group">
                    <button onClick={() => toggleTask(task.id, task.status)} className="flex-shrink-0">
                      {task.status === 'DONE'
                        ? <CheckCircle2 size={18} className="text-green-400" />
                        : <Circle size={18} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm ${task.status === 'DONE' ? 'line-through text-slate-500' : 'text-white'}`}>{task.title}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(task.priority)}`}>{getStatusLabel(task.priority)}</span>
                        {task.assignee && <span className="text-xs text-slate-500">{task.assignee}</span>}
                        {task.dueDate && <span className={`text-xs ${getDaysUntil(task.dueDate) < 0 ? 'text-red-400' : 'text-slate-500'}`}>{formatDate(task.dueDate)}</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === 'guests' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h3 className="font-semibold text-white">Invités ({event.guests.length})</h3>
                <div className="flex gap-2">
                  {(['CONFIRMED', 'INVITED', 'DECLINED'] as const).map(s => (
                    <span key={s} className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(s)}`}>
                      {event.guests.filter(g => g.status === s).length} {getStatusLabel(s)}
                    </span>
                  ))}
                </div>
              </div>
              <button onClick={() => setGuestModal(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors">
                <Plus size={12} /> Ajouter
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 border-b border-slate-800">
                    <th className="text-left pb-2 font-medium">Nom</th>
                    <th className="text-left pb-2 font-medium">Courriel</th>
                    <th className="text-left pb-2 font-medium">Entreprise</th>
                    <th className="text-left pb-2 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {event.guests.map(g => (
                    <tr key={g.id} className="hover:bg-slate-800/50">
                      <td className="py-2.5 text-white">{g.firstName} {g.lastName}</td>
                      <td className="py-2.5 text-slate-400">{g.email}</td>
                      <td className="py-2.5 text-slate-400">{g.company || '—'}</td>
                      <td className="py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(g.status)}`}>{getStatusLabel(g.status)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {event.guests.length === 0 && <p className="text-slate-500 text-sm text-center py-8">Aucun invité enregistré.</p>}
            </div>
          </div>
        )}

        {tab === 'budget' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Budget total', value: formatCurrency(event.budget), color: 'text-white' },
                { label: 'Dépenses', value: formatCurrency(spent), color: 'text-amber-400' },
                { label: 'Restant', value: formatCurrency(event.budget - spent), color: event.budget - spent < 0 ? 'text-red-400' : 'text-emerald-400' },
              ].map(s => (
                <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs text-slate-500 mb-1">{s.label}</div>
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Dépenses ({event.expenses.length})</h3>
                <button onClick={() => setExpenseModal(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors">
                  <Plus size={12} /> Ajouter
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 border-b border-slate-800">
                      <th className="text-left pb-2 font-medium">Description</th>
                      <th className="text-left pb-2 font-medium">Catégorie</th>
                      <th className="text-left pb-2 font-medium">Fournisseur</th>
                      <th className="text-left pb-2 font-medium">Date</th>
                      <th className="text-right pb-2 font-medium">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {event.expenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-slate-800/50">
                        <td className="py-2.5 text-white">{exp.description}</td>
                        <td className="py-2.5 text-slate-400">{exp.category}</td>
                        <td className="py-2.5 text-slate-400">{exp.vendor || '—'}</td>
                        <td className="py-2.5 text-slate-400">{formatDate(exp.date)}</td>
                        <td className="py-2.5 text-right text-amber-400 font-medium">{formatCurrency(exp.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {event.expenses.length === 0 && <p className="text-slate-500 text-sm text-center py-8">Aucune dépense enregistrée.</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Task Modal */}
      <Modal open={taskModal} onClose={() => setTaskModal(false)} title="Nouvelle tâche" size="sm">
        <form onSubmit={addTask} className="space-y-4">
          <div>
            <label className={labelCls}>Titre *</label>
            <input required className={inputCls} placeholder="Titre de la tâche" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Priorité</label>
              <select className={inputCls} value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>
                {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(p => <option key={p} value={p}>{getStatusLabel(p)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Responsable</label>
              <input className={inputCls} placeholder="Nom" value={taskForm.assignee} onChange={e => setTaskForm({ ...taskForm, assignee: e.target.value })} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Date limite</label>
            <input type="date" className={inputCls} value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setTaskModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Annuler</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg">Ajouter</button>
          </div>
        </form>
      </Modal>

      {/* Guest Modal */}
      <Modal open={guestModal} onClose={() => setGuestModal(false)} title="Ajouter un invité" size="md">
        <form onSubmit={addGuest} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Prénom *</label>
              <input required className={inputCls} placeholder="Prénom" value={guestForm.firstName} onChange={e => setGuestForm({ ...guestForm, firstName: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Nom *</label>
              <input required className={inputCls} placeholder="Nom" value={guestForm.lastName} onChange={e => setGuestForm({ ...guestForm, lastName: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Courriel *</label>
              <input required type="email" className={inputCls} value={guestForm.email} onChange={e => setGuestForm({ ...guestForm, email: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Téléphone</label>
              <input className={inputCls} value={guestForm.phone} onChange={e => setGuestForm({ ...guestForm, phone: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Entreprise</label>
              <input className={inputCls} value={guestForm.company} onChange={e => setGuestForm({ ...guestForm, company: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Statut</label>
              <select className={inputCls} value={guestForm.status} onChange={e => setGuestForm({ ...guestForm, status: e.target.value })}>
                {GUEST_STATUSES.map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setGuestModal(false)} className="px-4 py-2 text-sm text-slate-400">Annuler</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg">Ajouter</button>
          </div>
        </form>
      </Modal>

      {/* Expense Modal */}
      <Modal open={expenseModal} onClose={() => setExpenseModal(false)} title="Nouvelle dépense" size="md">
        <form onSubmit={addExpense} className="space-y-4">
          <div>
            <label className={labelCls}>Description *</label>
            <input required className={inputCls} placeholder="Description" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Montant ($) *</label>
              <input required type="number" step="0.01" className={inputCls} placeholder="0.00" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Catégorie</label>
              <select className={inputCls} value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}>
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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
            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg">Ajouter</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
