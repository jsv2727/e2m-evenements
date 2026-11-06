'use client';

import { Check, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CalendarTask, DateKey, TaskStatus } from '@/lib/calendar';

export const PRIORITY_META: Record<string, { label: string; dot: string; text: string }> = {
  URGENT: { label: 'Urgent', dot: 'bg-rose-500', text: 'text-rose-300' },
  HIGH: { label: 'Élevée', dot: 'bg-amber-400', text: 'text-amber-300' },
  MEDIUM: { label: 'Moyenne', dot: 'bg-sky-400', text: 'text-sky-300' },
  LOW: { label: 'Faible', dot: 'bg-slate-500', text: 'text-slate-400' },
};

export const STATUS_META: Record<TaskStatus, { label: string; cls: string }> = {
  TODO: { label: 'À faire', cls: 'bg-slate-700/60 text-slate-200' },
  IN_PROGRESS: { label: 'En cours', cls: 'bg-sky-500/15 text-sky-300' },
  DONE: { label: 'Terminé', cls: 'bg-emerald-500/15 text-emerald-300' },
};

export function isOverdue(task: CalendarTask, today: DateKey) {
  return task.status !== 'DONE' && !!task.dueDate && task.dueDate < today;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  return (
    <span
      title={name}
      className={cn(
        'inline-flex flex-shrink-0 items-center justify-center rounded-full bg-slate-700 font-semibold text-slate-200 ring-1 ring-slate-600',
        size === 'sm' ? 'h-5 w-5 text-[9px]' : 'h-7 w-7 text-[11px]',
      )}
    >
      {initials(name)}
    </span>
  );
}

export function StatusCheck({
  status,
  color,
  onToggle,
  size = 'sm',
}: {
  status: TaskStatus;
  color: string;
  onToggle: () => void;
  size?: 'sm' | 'md';
}) {
  const done = status === 'DONE';
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={done ? 'Marquer comme à faire' : 'Marquer comme terminé'}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        'group/check flex flex-shrink-0 items-center justify-center rounded-full border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
        size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5',
        done ? 'border-emerald-500 bg-emerald-500' : 'border-slate-500 hover:border-slate-300',
      )}
      style={!done && status === 'IN_PROGRESS' ? { borderColor: color, boxShadow: `inset 0 0 0 2px ${color}55` } : undefined}
    >
      {done ? (
        <Check className="text-white" size={size === 'sm' ? 9 : 12} strokeWidth={3} />
      ) : (
        <Check className="text-slate-400 opacity-0 group-hover/check:opacity-100" size={size === 'sm' ? 9 : 12} strokeWidth={3} />
      )}
    </button>
  );
}

/** Puce compacte utilisée dans les vues Mois et Semaine. */
export function TaskChip({
  task,
  today,
  onOpen,
  onToggle,
  showActivity = false,
  draggable = true,
}: {
  task: CalendarTask;
  today: DateKey;
  onOpen: (task: CalendarTask) => void;
  onToggle: (task: CalendarTask) => void;
  showActivity?: boolean;
  draggable?: boolean;
}) {
  const overdue = isOverdue(task, today);
  const done = task.status === 'DONE';
  return (
    <div
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/x-task-id', task.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={() => onOpen(task)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(task);
        }
      }}
      title={`${task.title} — ${task.eventName}`}
      className={cn(
        'group relative flex w-full cursor-pointer items-center gap-1.5 overflow-hidden rounded-md py-[3px] pl-2 pr-1.5 text-left text-[11.5px] leading-tight transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
        overdue ? 'bg-rose-500/10 hover:bg-rose-500/20' : 'bg-slate-800/70 hover:bg-slate-700/80',
      )}
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: task.color }} />
      <StatusCheck status={task.status} color={task.color} onToggle={() => onToggle(task)} />
      <span className={cn('min-w-0 flex-1', done && 'text-slate-500 line-through')}>
        <span className={cn('block truncate', !done && (overdue ? 'text-rose-100' : 'text-slate-100'))}>{task.title}</span>
        {showActivity && <span className="block truncate text-[10.5px] text-slate-500">{task.eventName}</span>}
      </span>
      {overdue && <Clock3 size={11} className="flex-shrink-0 text-rose-400" aria-label="En retard" />}
      {!done && (task.priority === 'URGENT' || task.priority === 'HIGH') && (
        <span className={cn('h-1.5 w-1.5 flex-shrink-0 rounded-full', PRIORITY_META[task.priority].dot)} aria-label={`Priorité ${PRIORITY_META[task.priority].label}`} />
      )}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="tablist" className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          title={o.hint}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
            value === o.value ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
