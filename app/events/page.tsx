'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import { formatCurrency, formatDate, getDaysUntil, getStatusColor, getStatusLabel } from '@/lib/utils';
import { Plus, Calendar, MapPin, DollarSign, Users, Search, Filter } from 'lucide-react';
import Link from 'next/link';

type Event = {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  venue?: string;
  city?: string;
  status: string;
  budget: number;
  clientName?: string;
  type?: string;
  capacity?: number;
  _count?: { guests: number };
  expenses?: { amount: number }[];
};

const EVENT_TYPES = ['Gala', 'Conférence', 'Mariage', 'Lancement', 'Corporatif', 'Sportif', 'Culturel', 'Autre'];
const EVENT_STATUSES = ['PLANNING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', startDate: '', endDate: '',
    venue: '', city: '', status: 'PLANNING', budget: '',
    clientName: '', clientEmail: '', clientPhone: '', type: '', capacity: '',
  });

  const fetchEvents = async () => {
    const r = await fetch('/api/events');
    const data = await r.json();
    setEvents(data);
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, budget: parseFloat(form.budget) || 0, capacity: parseInt(form.capacity) || null }),
    });
    setModalOpen(false);
    setForm({ name: '', description: '', startDate: '', endDate: '', venue: '', city: '', status: 'PLANNING', budget: '', clientName: '', clientEmail: '', clientPhone: '', type: '', capacity: '' });
    fetchEvents();
  };

  const filtered = events.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.name.toLowerCase().includes(q) || e.clientName?.toLowerCase().includes(q) || e.venue?.toLowerCase().includes(q);
    const matchStatus = !statusFilter || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500';
  const labelCls = 'block text-xs text-slate-400 mb-1';

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Événements"
        subtitle={`${filtered.length} événement${filtered.length > 1 ? 's' : ''}`}
        actions={
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={16} />
            Nouvel événement
          </button>
        }
      />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">Tous les statuts</option>
            {EVENT_STATUSES.map((s) => (
              <option key={s} value={s}>{getStatusLabel(s)}</option>
            ))}
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filtered.map((event) => {
              const spent = event.expenses?.reduce((s, e) => s + e.amount, 0) ?? 0;
              const pct = event.budget > 0 ? Math.round((spent / event.budget) * 100) : 0;
              const days = getDaysUntil(event.startDate);
              return (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-900/20 transition-all group cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(event.status)}`}>
                        {getStatusLabel(event.status)}
                      </span>
                      {event.type && (
                        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{event.type}</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-white mb-1 group-hover:text-indigo-300 transition-colors line-clamp-2">{event.name}</h3>
                    {event.clientName && <p className="text-xs text-slate-500 mb-3">{event.clientName}</p>}

                    <div className="space-y-2 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-indigo-400" />
                        <span>{formatDate(event.startDate)}</span>
                        {days > 0 && <span className="ml-auto text-indigo-400 font-medium">J-{days}</span>}
                      </div>
                      {event.venue && (
                        <div className="flex items-center gap-1.5">
                          <MapPin size={12} className="text-indigo-400" />
                          <span className="truncate">{event.venue}</span>
                        </div>
                      )}
                      {event.capacity && (
                        <div className="flex items-center gap-1.5">
                          <Users size={12} className="text-indigo-400" />
                          <span>{event.capacity} personnes</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <DollarSign size={12} className="text-emerald-400" />
                          <span>{formatCurrency(spent)} / {formatCurrency(event.budget)}</span>
                        </div>
                        <span className={`text-xs font-medium ${pct > 90 ? 'text-red-400' : pct > 70 ? 'text-amber-400' : 'text-emerald-400'}`}>{pct}%</span>
                      </div>
                      <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}

            {filtered.length === 0 && (
              <div className="col-span-3 text-center py-20 text-slate-500">
                <Calendar size={40} className="mx-auto mb-3 opacity-30" />
                <p>Aucun événement trouvé</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvel événement" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Nom de l'événement *</label>
              <input required className={inputCls} placeholder="Ex: Gala Annuel 2026" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select className={inputCls} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="">Sélectionner...</option>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Statut</label>
              <select className={inputCls} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {EVENT_STATUSES.map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Date de début *</label>
              <input required type="datetime-local" className={inputCls} value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Date de fin *</label>
              <input required type="datetime-local" className={inputCls} value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Lieu / Salle</label>
              <input className={inputCls} placeholder="Ex: Palais des Congrès" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Ville</label>
              <input className={inputCls} placeholder="Ex: Montréal" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Budget ($)</label>
              <input type="number" className={inputCls} placeholder="0" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Capacité (personnes)</label>
              <input type="number" className={inputCls} placeholder="0" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Client / Organisation</label>
              <input className={inputCls} placeholder="Nom du client" value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Courriel client</label>
              <input type="email" className={inputCls} placeholder="client@exemple.com" value={form.clientEmail} onChange={e => setForm({ ...form, clientEmail: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Description</label>
              <textarea className={inputCls} rows={3} placeholder="Description de l'événement..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Annuler</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">Créer l'événement</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
