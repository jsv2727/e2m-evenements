'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatKey,
  isWeekend,
  monthGrid,
  toDateKey,
  type CalendarActivity,
  type CalendarTask,
  type DateKey,
} from '@/lib/calendar';
import { TaskChip } from './ui';

const MAX_LANES = 2;
const MAX_TASKS = 3;
const LANE_PX = 22;
const HEADER_PX = 30;

export type ViewHandlers = {
  today: DateKey;
  onOpenTask: (task: CalendarTask) => void;
  onToggleTask: (task: CalendarTask) => void;
  onMoveTask: (taskId: string, to: DateKey) => void;
  onCreateTask: (date: DateKey) => void;
  onOpenActivity: (activity: CalendarActivity) => void;
  onShowList: (title: string, tasks: CalendarTask[]) => void;
};

type Segment = { activity: CalendarActivity; start: number; end: number; lane: number; clippedStart: boolean; clippedEnd: boolean };

/** Répartit les activités d'une semaine sur des couloirs sans chevauchement. */
function layoutWeek(week: DateKey[], activities: CalendarActivity[]): Segment[] {
  const first = week[0]!;
  const last = week[6]!;
  const segments: Segment[] = [];
  const laneEnds: number[] = [];
  const overlapping = activities
    .map((a) => ({ a, s: toDateKey(a.startDate), e: toDateKey(a.endDate) }))
    .filter(({ s, e }) => s <= last && e >= first)
    .sort((x, y) => (x.s === y.s ? y.e.localeCompare(x.e) : x.s.localeCompare(y.s)));

  for (const { a, s, e } of overlapping) {
    const start = Math.max(0, week.indexOf(s < first ? first : s));
    const end = week.indexOf(e > last ? last : e);
    let lane = laneEnds.findIndex((laneEnd) => laneEnd < start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = end;
    segments.push({ activity: a, start, end, lane, clippedStart: s < first, clippedEnd: e > last });
  }
  return segments;
}

export default function MonthView({
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
  const { today, onOpenTask, onToggleTask, onMoveTask, onCreateTask, onOpenActivity, onShowList } = handlers;
  const [dropTarget, setDropTarget] = useState<DateKey | null>(null);
  const month = anchor.slice(0, 7);

  const weeks = useMemo(() => {
    const grid = monthGrid(anchor);
    return Array.from({ length: 6 }, (_, i) => grid.slice(i * 7, i * 7 + 7));
  }, [anchor]);

  const weekLayouts = useMemo(() => weeks.map((w) => layoutWeek(w, activities)), [weeks, activities]);

  return (
    <div className="flex h-full min-h-[640px] flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
      <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-900/80">
        {weeks[0]!.map((key) => (
          <div key={key} className={cn('px-3 py-2 text-[11px] font-semibold uppercase tracking-wider', isWeekend(key) ? 'text-slate-500' : 'text-slate-400')}>
            {formatKey(key, { weekday: 'short' }).replace('.', '')}
          </div>
        ))}
      </div>

      <div className="grid flex-1 grid-rows-6">
        {weeks.map((week, wi) => {
          const segments = weekLayouts[wi]!;
          const visible = segments.filter((s) => s.lane < MAX_LANES);
          const lanes = Math.min(MAX_LANES, segments.reduce((m, s) => Math.max(m, s.lane + 1), 0));
          return (
            <div key={week[0]} className="relative grid min-h-[132px] grid-cols-7 border-b border-slate-800/80 last:border-b-0">
              {week.map((key, di) => {
                const dayTasks = tasksByDay.get(key) ?? [];
                const hiddenActivities = segments.filter((s) => s.lane >= MAX_LANES && s.start <= di && s.end >= di).length;
                const inMonth = key.slice(0, 7) === month;
                const isToday = key === today;
                return (
                  <div
                    key={key}
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
                    onDoubleClick={() => onCreateTask(key)}
                    className={cn(
                      'group/cell relative flex min-w-0 flex-col border-r border-slate-800/80 px-1.5 pb-1.5 transition-colors last:border-r-0',
                      !inMonth && 'bg-slate-950/50',
                      inMonth && isWeekend(key) && 'bg-slate-900/60',
                      dropTarget === key && 'bg-indigo-500/10 ring-1 ring-inset ring-indigo-500/60',
                    )}
                    style={{ paddingTop: HEADER_PX + lanes * LANE_PX + 2 }}
                  >
                    <div className="absolute left-1.5 right-1.5 top-1.5 flex items-center justify-between">
                      <span
                        className={cn(
                          'flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums',
                          isToday ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : inMonth ? 'text-slate-200' : 'text-slate-600',
                        )}
                      >
                        {key.slice(8) === '01' && !isToday ? formatKey(key, { day: 'numeric', month: 'short' }).replace('.', '') : Number(key.slice(8))}
                      </span>
                      <button
                        type="button"
                        onClick={() => onCreateTask(key)}
                        aria-label={`Ajouter une tâche le ${formatKey(key, { day: 'numeric', month: 'long' })}`}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 opacity-0 transition-opacity hover:bg-slate-700 hover:text-white focus:opacity-100 group-hover/cell:opacity-100"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <div className="flex min-w-0 flex-col gap-[3px]">
                      {dayTasks.slice(0, MAX_TASKS).map((t) => (
                        <TaskChip key={t.id} task={t} today={today} onOpen={onOpenTask} onToggle={onToggleTask} />
                      ))}
                      {(dayTasks.length > MAX_TASKS || hiddenActivities > 0) && (
                        <button
                          type="button"
                          onClick={() => onShowList(formatKey(key, { weekday: 'long', day: 'numeric', month: 'long' }), dayTasks)}
                          className="rounded px-2 py-0.5 text-left text-[11px] font-medium text-slate-400 hover:bg-slate-800 hover:text-white"
                        >
                          {[
                            dayTasks.length > MAX_TASKS && `+${dayTasks.length - MAX_TASKS} tâche${dayTasks.length - MAX_TASKS > 1 ? 's' : ''}`,
                            hiddenActivities > 0 && `+${hiddenActivities} activité${hiddenActivities > 1 ? 's' : ''}`,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Couche des activités (barres multi-jours) */}
              <div
                className="pointer-events-none absolute inset-x-0 grid grid-cols-7 gap-y-[2px] px-0.5"
                style={{ top: HEADER_PX, gridAutoRows: `${LANE_PX - 2}px` }}
              >
                {visible.map((s) => (
                  <button
                    key={s.activity.id}
                    type="button"
                    onClick={() => onOpenActivity(s.activity)}
                    title={`${s.activity.name}${s.activity.venue ? ` — ${s.activity.venue}` : ''}`}
                    className={cn(
                      'pointer-events-auto mx-0.5 flex min-w-0 items-center gap-1.5 overflow-hidden px-2 text-[11px] font-semibold text-white shadow-sm transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                      s.clippedStart ? 'rounded-l-none' : 'rounded-l-md',
                      s.clippedEnd ? 'rounded-r-none' : 'rounded-r-md',
                      s.activity.status === 'CANCELLED' && 'line-through opacity-50',
                    )}
                    style={{
                      gridColumn: `${s.start + 1} / ${s.end + 2}`,
                      gridRow: s.lane + 1,
                      background: `linear-gradient(90deg, ${s.activity.color}, ${s.activity.color}cc)`,
                    }}
                  >
                    <span className="truncate">{s.activity.name}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
