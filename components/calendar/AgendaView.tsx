'use client';

import { CalendarCheck2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  diffDays,
  formatKey,
  formatTime,
  offsetLabel,
  rangeKeys,
  toDateKey,
  type CalendarActivity,
  type CalendarTask,
  type DateKey,
} from '@/lib/calendar';
import { Avatar, PRIORITY_META, STATUS_META, StatusCheck, isOverdue } from './ui';
import type { ViewHandlers } from './MonthView';

export default function AgendaView({
  from,
  to,
  activities,
  tasksByDay,
  handlers,
}: {
  from: DateKey;
  to: DateKey;
  activities: CalendarActivity[];
  tasksByDay: Map<DateKey, CalendarTask[]>;
  handlers: ViewHandlers;
}) {
  const { today, onOpenTask, onToggleTask, onOpenActivity } = handlers;
  const days = rangeKeys(from, to).filter(
    (key) => (tasksByDay.get(key)?.length ?? 0) > 0 || activities.some((a) => toDateKey(a.startDate) === key),
  );

  if (days.length === 0) {
    return (
      <div className="flex min-h-[480px] flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/40 text-center">
        <CalendarCheck2 size={36} className="text-slate-600" />
        <p className="mt-3 text-sm font-medium text-slate-300">Aucune échéance sur cette période</p>
        <p className="mt-1 text-xs text-slate-500">Appliquez un rétroplanning à une activité pour générer ses tâches.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
      {days.map((key) => {
        const dayTasks = tasksByDay.get(key) ?? [];
        const starting = activities.filter((a) => toDateKey(a.startDate) === key);
        const isToday = key === today;
        const rel = diffDays(key, today);
        return (
          <section key={key} className="grid grid-cols-[132px_1fr] border-b border-slate-800/80 last:border-b-0">
            <div className={cn('border-r border-slate-800/80 px-4 py-4', isToday && 'bg-indigo-500/5')}>
              <div className={cn('text-3xl font-semibold tabular-nums leading-none', isToday ? 'text-indigo-300' : 'text-slate-100')}>{Number(key.slice(8))}</div>
              <div className="mt-1 text-xs font-medium capitalize text-slate-400">{formatKey(key, { weekday: 'long' })}</div>
              <div className={cn('mt-1 text-[11px]', rel < 0 ? 'text-slate-600' : isToday ? 'text-indigo-400' : 'text-slate-500')}>
                {isToday ? "Aujourd'hui" : rel === 1 ? 'Demain' : rel > 0 ? `Dans ${rel} j` : `Il y a ${-rel} j`}
              </div>
            </div>
            <div className="divide-y divide-slate-800/60">
              {starting.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onOpenActivity(a)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-800/40"
                >
                  <span className="h-8 w-1 rounded-full" style={{ backgroundColor: a.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{a.name}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                      <span>{formatTime(a.startDate)}</span>
                      {(a.venue || a.city) && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin size={11} />
                          {[a.venue, a.city].filter(Boolean).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300" style={{ borderColor: `${a.color}66` }}>
                    Activité
                  </span>
                </button>
              ))}
              {dayTasks.map((t) => {
                const overdue = isOverdue(t, today);
                const offset = t.dueDate ? diffDays(t.dueDate, t.eventStart) : null;
                return (
                  <div
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpenTask(t)}
                    onKeyDown={(e) => e.key === 'Enter' && onOpenTask(t)}
                    className="grid cursor-pointer grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-slate-800/40 focus:outline-none focus-visible:bg-slate-800/60"
                  >
                    <StatusCheck status={t.status} color={t.color} onToggle={() => onToggleTask(t)} size="md" />
                    <div className="min-w-0">
                      <div className={cn('truncate text-[13px] font-medium', t.status === 'DONE' ? 'text-slate-500 line-through' : overdue ? 'text-rose-200' : 'text-slate-100')}>
                        {t.title}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="h-2 w-2 flex-shrink-0 rounded-sm" style={{ backgroundColor: t.color }} />
                        <span className="truncate">{t.eventName}</span>
                        {offset !== null && <span className="font-mono text-slate-600">{offsetLabel(offset)}</span>}
                        {t.category && <span className="hidden truncate sm:inline">· {t.category}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      {overdue && <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-300">En retard</span>}
                      <span className={cn('hidden rounded-full px-2 py-0.5 text-[10px] font-semibold md:inline', STATUS_META[t.status].cls)}>{STATUS_META[t.status].label}</span>
                      <span className="flex w-16 items-center gap-1.5">
                        <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_META[t.priority]?.dot)} />
                        <span className={cn('text-[11px]', PRIORITY_META[t.priority]?.text)}>{PRIORITY_META[t.priority]?.label}</span>
                      </span>
                      {t.assignee ? <Avatar name={t.assignee} size="md" /> : <span className="w-7" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
