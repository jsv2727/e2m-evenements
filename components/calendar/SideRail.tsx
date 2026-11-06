'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  addMonths,
  diffDays,
  formatKey,
  monthGrid,
  type CalendarTask,
  type DateKey,
} from '@/lib/calendar';
import { useState, useEffect } from 'react';
import { StatusCheck } from './ui';

function MiniMonth({ anchor, today, marked, onPick }: { anchor: DateKey; today: DateKey; marked: Set<DateKey>; onPick: (k: DateKey) => void }) {
  const [cursor, setCursor] = useState(anchor);
  useEffect(() => setCursor(anchor), [anchor]);
  const grid = monthGrid(cursor);
  const month = cursor.slice(0, 7);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold capitalize text-white">{formatKey(cursor, { month: 'long', year: 'numeric' })}</span>
        <div className="flex">
          <button aria-label="Mois précédent" onClick={() => setCursor(addMonths(cursor, -1))} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"><ChevronLeft size={15} /></button>
          <button aria-label="Mois suivant" onClick={() => setCursor(addMonths(cursor, 1))} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"><ChevronRight size={15} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {grid.slice(0, 7).map((k) => (
          <span key={k} className="py-1 text-[10px] font-semibold uppercase text-slate-600">{formatKey(k, { weekday: 'narrow' })}</span>
        ))}
        {grid.map((k) => (
          <button
            key={k}
            onClick={() => onPick(k)}
            className={cn(
              'relative mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[11.5px] tabular-nums transition-colors',
              k === today ? 'bg-indigo-500 font-semibold text-white' : k === anchor ? 'bg-slate-700 text-white' : k.slice(0, 7) === month ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-800',
            )}
          >
            {Number(k.slice(8))}
            {marked.has(k) && k !== today && <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-indigo-400" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function TaskList({ tasks, today, empty, onOpen, onToggle }: { tasks: CalendarTask[]; today: DateKey; empty: string; onOpen: (t: CalendarTask) => void; onToggle: (t: CalendarTask) => void }) {
  if (!tasks.length) return <p className="py-3 text-xs text-slate-600">{empty}</p>;
  return (
    <ul className="space-y-0.5">
      {tasks.map((t) => {
        const rel = t.dueDate ? diffDays(t.dueDate, today) : 0;
        return (
          <li key={t.id}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => onOpen(t)}
              onKeyDown={(e) => e.key === 'Enter' && onOpen(t)}
              className="group flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-slate-800/60"
            >
              <span className="pt-0.5"><StatusCheck status={t.status} color={t.color} onToggle={() => onToggle(t)} /></span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] text-slate-100">{t.title}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
                  <span className="truncate">{t.eventName}</span>
                </div>
              </div>
              <span className={cn('flex-shrink-0 text-[11px] tabular-nums', rel < 0 ? 'font-semibold text-rose-400' : rel === 0 ? 'text-amber-300' : 'text-slate-500')}>
                {rel < 0 ? `${-rel} j` : rel === 0 ? "Auj." : formatKey(t.dueDate!, { day: 'numeric', month: 'short' }).replace('.', '')}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function SideRail({
  anchor,
  today,
  overdue,
  upcoming,
  marked,
  onPick,
  onOpen,
  onToggle,
  onShowAllOverdue,
}: {
  anchor: DateKey;
  today: DateKey;
  overdue: CalendarTask[];
  upcoming: CalendarTask[];
  marked: Set<DateKey>;
  onPick: (k: DateKey) => void;
  onOpen: (t: CalendarTask) => void;
  onToggle: (t: CalendarTask) => void;
  onShowAllOverdue: () => void;
}) {
  return (
    <aside className="hidden w-[300px] flex-shrink-0 flex-col gap-4 2xl:flex">
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <MiniMonth anchor={anchor} today={today} marked={marked} onPick={onPick} />
      </div>

      <section className="rounded-xl border border-rose-500/20 bg-gradient-to-b from-rose-500/[0.06] to-transparent p-4">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-300">En retard · {overdue.length}</h3>
          {overdue.length > 6 && <button onClick={onShowAllOverdue} className="text-[11px] text-slate-400 hover:text-white">Tout voir</button>}
        </div>
        <TaskList tasks={overdue.slice(0, 6)} today={today} empty="Rien en retard. Excellent." onOpen={onOpen} onToggle={onToggle} />
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">14 prochains jours · {upcoming.length}</h3>
        <TaskList tasks={upcoming.slice(0, 10)} today={today} empty="Aucune échéance à venir." onOpen={onOpen} onToggle={onToggle} />
      </section>
    </aside>
  );
}
