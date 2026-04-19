import { db } from '@/lib/db';
import { formatCurrency, formatDate, getDaysUntil, getStatusColor, getStatusLabel } from '@/lib/utils';
import Header from '@/components/Header';
import { Calendar, DollarSign, Users, TrendingUp, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import Link from 'next/link';

async function getDashboardData() {
  const [events, expenses, guests, tasks, contracts] = await Promise.all([
    db.event.findMany({ orderBy: { startDate: 'asc' }, include: { expenses: true, guests: true } }),
    db.expense.findMany(),
    db.guest.findMany(),
    db.task.findMany({ where: { status: { not: 'DONE' } }, orderBy: { dueDate: 'asc' }, take: 5, include: { event: { select: { name: true } } } }),
    db.contract.findMany({ where: { status: 'DRAFT' } }),
  ]);

  const totalBudget = events.reduce((s, e) => s + e.budget, 0);
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const upcomingEvents = events.filter((e) => new Date(e.startDate) > new Date() && e.status !== 'CANCELLED');
  const confirmedGuests = guests.filter((g) => g.status === 'CONFIRMED').length;

  return { events, upcomingEvents, totalBudget, totalSpent, confirmedGuests, tasks, contracts };
}

export default async function Dashboard() {
  const { events, upcomingEvents, totalBudget, totalSpent, confirmedGuests, tasks, contracts } = await getDashboardData();

  const stats = [
    {
      label: 'Événements à venir',
      value: upcomingEvents.length,
      icon: Calendar,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20',
    },
    {
      label: 'Budget total',
      value: formatCurrency(totalBudget),
      icon: DollarSign,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      label: 'Dépenses engagées',
      value: formatCurrency(totalSpent),
      icon: TrendingUp,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      label: 'Invités confirmés',
      value: confirmedGuests,
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
  ];

  return (
    <div className="flex flex-col flex-1">
      <Header title="Tableau de bord" subtitle="Vue d'ensemble de votre activité" />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className={`rounded-xl border p-5 ${stat.bg}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-400">{stat.label}</span>
                <stat.icon className={`${stat.color}`} size={18} />
              </div>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Upcoming Events */}
          <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">Événements à venir</h2>
              <Link href="/events" className="text-sm text-indigo-400 hover:text-indigo-300">Voir tous →</Link>
            </div>
            <div className="space-y-3">
              {upcomingEvents.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-8">Aucun événement à venir</p>
              )}
              {upcomingEvents.slice(0, 5).map((event) => {
                const daysUntil = getDaysUntil(event.startDate);
                const spent = event.expenses.reduce((s, e) => s + e.amount, 0);
                const pct = event.budget > 0 ? Math.round((spent / event.budget) * 100) : 0;
                return (
                  <Link key={event.id} href={`/events/${event.id}`}>
                    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-800 transition-colors group">
                      <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-xs text-indigo-400 font-bold">{daysUntil}j</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white text-sm truncate group-hover:text-indigo-300 transition-colors">{event.name}</div>
                        <div className="text-xs text-slate-400">{event.venue} · {formatDate(event.startDate)}</div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500">{pct}%</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-semibold text-white">{formatCurrency(event.budget)}</div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(event.status)}`}>
                          {getStatusLabel(event.status)}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Pending Tasks */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white">Tâches urgentes</h2>
                <Clock size={16} className="text-slate-500" />
              </div>
              <div className="space-y-2">
                {tasks.length === 0 && <p className="text-slate-500 text-sm">Aucune tâche en attente</p>}
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-slate-800 transition-colors">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                      task.priority === 'URGENT' ? 'bg-red-400' :
                      task.priority === 'HIGH' ? 'bg-orange-400' :
                      task.priority === 'MEDIUM' ? 'bg-yellow-400' : 'bg-slate-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-200 truncate">{task.title}</div>
                      <div className="text-xs text-slate-500 truncate">{task.event.name}</div>
                      {task.dueDate && (
                        <div className={`text-xs mt-0.5 ${getDaysUntil(task.dueDate) < 0 ? 'text-red-400' : getDaysUntil(task.dueDate) < 7 ? 'text-amber-400' : 'text-slate-500'}`}>
                          {getDaysUntil(task.dueDate) < 0 ? 'En retard' : `Dans ${getDaysUntil(task.dueDate)}j`}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Alerts */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white">Alertes</h2>
                <AlertCircle size={16} className="text-amber-400" />
              </div>
              <div className="space-y-2">
                {contracts.length > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <AlertCircle size={14} className="text-amber-400 flex-shrink-0" />
                    <span className="text-xs text-amber-300">{contracts.length} contrat{contracts.length > 1 ? 's' : ''} en brouillon</span>
                  </div>
                )}
                {upcomingEvents.filter(e => getDaysUntil(e.startDate) <= 7).map(e => (
                  <div key={e.id} className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                    <span className="text-xs text-red-300 truncate">{e.name} dans {getDaysUntil(e.startDate)}j</span>
                  </div>
                ))}
                {contracts.length === 0 && upcomingEvents.filter(e => getDaysUntil(e.startDate) <= 7).length === 0 && (
                  <div className="flex items-center gap-2 p-2">
                    <CheckCircle2 size={14} className="text-green-400" />
                    <span className="text-xs text-green-300">Tout est en ordre!</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
