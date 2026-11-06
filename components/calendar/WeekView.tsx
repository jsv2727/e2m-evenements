'use client';

import { useState } from 'react';
import { MapPin, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  addDays,
  formatKey,
  formatTime,
  isWeekend,
  rangeKeys,
  startOfWeek,
  toDateKey,
  type CalendarActivity,
  type CalendarTask,
  type DateKey,
} from '@/lib/calendar';
import { Avatar, PRIORITY_META, StatusCheck, isOverdue } from './ui';
import type { ViewHandlers } from './MonthView';

export default function WeekView({
  anchor,
  activities,
  tasksByDay,
  handlers,
}: {
  anchor: DateKey;
  activities: CalendarActivity[];
  tasksByDay: Map<DateKey, CalendarTask[]>;
  handlers: ViewHandlers;
}) {
  const { today, onOpenTask, onToggleTask, onMoveTask, onCreateTask, onOpenActivity } = handlers;
  const [dropTarget, setDropTarget] = useState<DateKey | null>(null);
  const start = startOfWeek(anchor);
  const days = rangeKeys(start, addDays(start, 6));

  return (
    <div className="grid min-h-[640px] grid-cols-7 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
      {days.map((key) => {
        const isToday = key === today;
        const dayTasks = tasksByDay.get(key) ?? [];
        const dayActivities = activities.filter((a) => toDateKey(a.startDate) <= key && toDateKey(a.endDate) >= key);
        return (
          <section
            key={key}
            aria-label={formatKey(key, { weekday: 'long', day: 'numeric', month: 'long' })}
            onDragOver={(e) => {
              if (!e.dataTransfer.types.includes('text/x-task-id')) return;
              e.preventDefault();
              setDropTarget(key);
            }}
            onDragLeave={() => setDropTarget((t) => (t === key ? null : t))}
            onDrop={(e) => {
              const id = e.dataTransfer.getData('text/x-task-id');
              setDropTarget(null);
              if (id) onMoveTask(id, key);
            }}
            className={cn(
              'group/col flex min-w-0 flex-col border-r border-slate-800/80 last:border-r-0',
              isWeekend(key) && 'bg-slate-900/60',
              dropTarget === key && 'bg-indigo-500/10 ring-1 ring-inset ring-indigo-500/60',
            )}
          >
            <header className={cn('flex items-end justify-between border-b border-slate-800 px-3 pb-2 pt-3', isToday && 'border-b-indigo-500')}>
              <div>
                <div className={cn('text-[11px] font-semibold uppercase tracking-wider', isToday ? 'text-indigo-300' : 'text-slate-500')}>
                  {formatKey(key, { weekday: 'short' }).replace('.', '')}
                </div>
                <div className={cn('text-2xl font-semibold tabular-nums leading-none', isToday ? 'text-white' : 'text-slate-200')}>{Number(key.slice(8))}</div>
              </div>
              <button
                type="button"
                onClick={() => onCreateTask(key)}
                aria-label="Ajouter une tâche"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 opacity-0 hover:bg-slate-700 hover:text-white focus:opacity-100 group-hover/col:opacity-100"
              >
                <Plus size={15} />
              </button>
            </header>

            <div className="flex flex-1 flex-col gap-2 p-2">
              {dayActivities.map((a) => {
                const startsToday = toDateKey(a.startDate) === key;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onOpenActivity(a)}
                    className="rounded-lg px-2.5 py-2 text-left text-white shadow-sm transition-[filter] hover:brightness-110"
                    style={{ background: `linear-gradient(135deg, ${a.color}, ${a.color}b3)` }}
                  >
                    <div className="truncate text-[12px] font-semibold">{a.name}</div>
                    <div className="mt-0.5 flex items-center gap-1 text-[10.5px] text-white/80">
                      {startsToday ? formatTime(a.startDate) : 'Suite'}
                      {(a.venue || a.city) && (
                        <>
                          <MapPin size={10} className="ml-1" />
                          <span className="truncate">{a.venue || a.city}</span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}

              {dayTasks.map((t) => {
                const overdue = isOverdue(t, today);
                const done = t.status === 'DONE';
                return (
                  <div
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/x-task-id', t.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onClick={() => onOpenTask(t)}
                    onKeyDown={(e) => e.key === 'Enter' && onOpenTask(t)}
                    className={cn(
                      'relative cursor-pointer overflow-hidden rounded-lg border p-2 pl-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
                      overdue ? 'border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/15' : 'border-slate-800 bg-slate-800/50 hover:border-slate-700 hover:bg-slate-800',
                    )}
                  >
                    <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: t.color }} />
                    <div className="flex items-start gap-2">
                      <div className="pt-0.5">
                        <StatusCheck status={t.status} color={t.color} onToggle={() => onToggleTask(t)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={cn('text-[12px] font-medium leading-snug', done ? 'text-slate-500 line-through' : 'text-slate-100')}>{t.title}</div>
                        <div className="mt-1 truncate text-[10.5px] text-slate-500">{t.eventName}</div>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_META[t.priority]?.dot)} />
                          <span className={cn('text-[10px] font-medium', PRIORITY_META[t.priority]?.text)}>{PRIORITY_META[t.priority]?.label}</span>
                          {t.category && <span className="truncate text-[10px] text-slate-500">· {t.category}</span>}
                          {t.assignee && (
                            <span className="ml-auto">
                              <Avatar name={t.assignee} />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {dayActivities.length === 0 && dayTasks.length === 0 && (
                <button
                  type="button"
                  onClick={() => onCreateTask(key)}
                  className="mt-2 rounded-lg border border-dashed border-slate-800 py-6 text-[11px] text-slate-600 opacity-0 transition-opacity hover:border-slate-700 hover:text-slate-400 group-hover/col:opacity-100"
                >
                  Ajouter une tâche
                </button>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
