'use client';

import { useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { GanttChartSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  diffDays,
  formatKey,
  isWeekend,
  rangeKeys,
  toDateKey,
  type CalendarActivity,
  type CalendarTask,
  type DateKey,
} from '@/lib/calendar';
import { isOverdue } from './ui';
import type { ViewHandlers } from './MonthView';

const DAY_PX = 30;
const ROW_PX = 52;
const LABEL_PX = 280;

type Row = {
  id: string;
  name: string;
  color: string;
  start: DateKey;
  end: DateKey;
  activity?: CalendarActivity;
  tasks: CalendarTask[];
};

export default function TimelineView({
  from,
  to,
  activities,
  tasks,
  handlers,
}: {
  from: DateKey;
  to: DateKey;
  activities: CalendarActivity[];
  tasks: CalendarTask[];
  handlers: ViewHandlers;
}) {
  const { today, onOpenTask, onOpenActivity } = handlers;
  const scroller = useRef<HTMLDivElement>(null);
  const days = useMemo(() => rangeKeys(from, to), [from, to]);

  const months = useMemo(() => {
    const out: { key: string; label: string; span: number }[] = [];
    for (const d of days) {
      const k = d.slice(0, 7);
      const last = out[out.length - 1];
      if (last?.key === k) last.span++;
      else out.push({ key: k, label: formatKey(d, { month: 'long', year: 'numeric' }), span: 1 });
    }
    return out;
  }, [days]);

  const rows = useMemo<Row[]>(() => {
    const map = new Map<string, Row>();
    for (const a of activities) {
      map.set(a.id, { id: a.id, name: a.name, color: a.color, start: toDateKey(a.startDate), end: toDateKey(a.endDate), activity: a, tasks: [] });
    }
    for (const t of tasks) {
      if (!t.dueDate) continue;
      let row = map.get(t.eventId);
      if (!row) {
        row = { id: t.eventId, name: t.eventName, color: t.color, start: t.eventStart, end: t.eventStart, tasks: [] };
        map.set(t.eventId, row);
      }
      row.tasks.push(t);
    }
    return [...map.values()].sort((a, b) => a.start.localeCompare(b.start));
  }, [activities, tasks]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const idx = diffDays(today, from);
    if (idx >= 0 && idx < days.length) el.scrollLeft = Math.max(0, idx * DAY_PX - 3 * DAY_PX);
  }, [from, today, days.length]);

  const todayIdx = diffDays(today, from);
  const width = days.length * DAY_PX;

  if (rows.length === 0) {
    return (
      <div className="flex min-h-[480px] flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/40 text-center">
        <GanttChartSquare size={36} className="text-slate-600" />
        <p className="mt-3 text-sm font-medium text-slate-300">Aucune activité sur ces trois mois</p>
      </div>
    );
  }

  const clampIdx = (key: DateKey) => Math.min(days.length - 1, Math.max(0, diffDays(key, from)));

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
      <div ref={scroller} className="relative overflow-x-auto">
        <div style={{ width: LABEL_PX + width }}>
          {/* En-têtes */}
          <div className="sticky top-0 z-20 flex border-b border-slate-800 bg-slate-900">
            <div className="sticky left-0 z-30 flex items-end border-r border-slate-800 bg-slate-900 px-4 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500" style={{ width: LABEL_PX, minWidth: LABEL_PX }}>
              Activité · avancement
            </div>
            <div>
              <div className="flex">
                {months.map((m) => (
                  <div key={m.key} className="border-l border-slate-800 px-2 py-1.5 text-xs font-semibold capitalize text-slate-300 first:border-l-0" style={{ width: m.span * DAY_PX }}>
                    <span className="sticky left-[292px]">{m.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex">
                {days.map((d) => (
                  <div
                    key={d}
                    className={cn(
                      'flex flex-col items-center border-l border-slate-800/60 py-1 text-[10px] tabular-nums',
                      d === today ? 'font-bold text-indigo-300' : isWeekend(d) ? 'text-slate-600' : 'text-slate-400',
                    )}
                    style={{ width: DAY_PX }}
                  >
                    <span className="uppercase">{formatKey(d, { weekday: 'narrow' })}</span>
                    <span>{Number(d.slice(8))}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Lignes */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 flex" style={{ left: LABEL_PX }}>
              {days.map((d) => (
                <div key={d} className={cn('border-l border-slate-800/40', isWeekend(d) && 'bg-slate-950/40')} style={{ width: DAY_PX }} />
              ))}
            </div>
            {todayIdx >= 0 && todayIdx < days.length && (
              <div className="pointer-events-none absolute inset-y-0 z-10 w-px bg-indigo-400/80" style={{ left: LABEL_PX + todayIdx * DAY_PX + DAY_PX / 2 }}>
                <span className="absolute -left-[3px] -top-[3px] h-[7px] w-[7px] rounded-full bg-indigo-400" />
              </div>
            )}

            {rows.map((row) => {
              const total = row.activity?.taskTotal ?? row.tasks.length;
              const done = row.activity?.taskDone ?? row.tasks.filter((t) => t.status === 'DONE').length;
              const pct = total ? Math.round((done / total) * 100) : 0;
              const late = row.tasks.filter((t) => isOverdue(t, today)).length;
              const barVisible = row.end >= from && row.start <= to;
              const s = clampIdx(row.start);
              const e = clampIdx(row.end);
              const byDay = new Map<DateKey, CalendarTask[]>();
              for (const t of row.tasks) byDay.set(t.dueDate!, [...(byDay.get(t.dueDate!) ?? []), t]);

              return (
                <div key={row.id} className="relative flex border-b border-slate-800/60 last:border-b-0 hover:bg-slate-800/20" style={{ height: ROW_PX }}>
                  <div className="sticky left-0 z-10 flex flex-col justify-center gap-1.5 border-r border-slate-800 bg-slate-900 px-4" style={{ width: LABEL_PX, minWidth: LABEL_PX }}>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 flex-shrink-0 rounded-sm" style={{ backgroundColor: row.color }} />
                      <Link href={`/events/${row.id}`} className="truncate text-[13px] font-medium text-slate-100 hover:text-white hover:underline">
                        {row.name}
                      </Link>
                      {late > 0 && <span className="ml-auto flex-shrink-0 rounded-full bg-rose-500/15 px-1.5 text-[10px] font-semibold text-rose-300">{late} en retard</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-16 text-right text-[10px] tabular-nums text-slate-500">
                        {done}/{total} · {pct}%
                      </span>
                    </div>
                  </div>

                  <div className="relative" style={{ width }}>
                    {barVisible && (
                      <button
                        type="button"
                        onClick={() => row.activity && onOpenActivity(row.activity)}
                        title={row.name}
                        className="absolute top-1/2 h-5 -translate-y-1/2 rounded-md opacity-90 shadow-sm transition-opacity hover:opacity-100"
                        style={{ left: s * DAY_PX + 2, width: (e - s + 1) * DAY_PX - 4, background: `linear-gradient(90deg, ${row.color}, ${row.color}aa)` }}
                      />
                    )}
                    {[...byDay.entries()].map(([day, list]) => {
                      const idx = diffDays(day, from);
                      if (idx < 0 || idx >= days.length) return null;
                      const allDone = list.every((t) => t.status === 'DONE');
                      const anyLate = list.some((t) => isOverdue(t, today));
                      const fill = allDone ? '#10b981' : anyLate ? '#f43f5e' : row.color;
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => (list.length === 1 ? onOpenTask(list[0]!) : handlers.onShowList(`${row.name} — ${formatKey(day, { day: 'numeric', month: 'long' })}`, list))}
                          title={list.map((t) => `• ${t.title}`).join('\n')}
                          className="group absolute top-1/2 z-[5] flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center focus:outline-none"
                          style={{ left: idx * DAY_PX + DAY_PX / 2 }}
                        >
                          <span
                            className="h-3 w-3 rotate-45 rounded-[2px] ring-2 ring-slate-950 transition-transform group-hover:scale-125 group-focus-visible:scale-125"
                            style={{ backgroundColor: fill }}
                          />
                          {list.length > 1 && (
                            <span className="absolute -right-2 -top-2 rounded-full bg-slate-100 px-1 text-[9px] font-bold leading-[14px] text-slate-900">{list.length}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 border-t border-slate-800 px-4 py-2 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-5 rounded-sm bg-indigo-500/80" />Durée de l&apos;activité</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rotate-45 bg-indigo-400" />Échéance</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rotate-45 bg-emerald-500" />Terminée</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rotate-45 bg-rose-500" />En retard</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-px bg-indigo-400" />Aujourd&apos;hui</span>
      </div>
    </div>
  );
}
