'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import { TASK_CATEGORIES, TASK_PRIORITIES, type DateKey, type TaskCreateInput } from '@/lib/calendar';
import { PRIORITY_META } from './ui';
import { inputCls, labelCls } from './TaskDrawer';

export type EventOption = { id: string; name: string; startDate: string; type: string | null };

const empty = (eventId: string, dueDate: string) => ({
  eventId,
  title: '',
  dueDate,
  priority: 'MEDIUM',
  category: '',
  assignee: '',
  description: '',
});

export default function TaskFormModal({
  open,
  initialDate,
  initialEventId,
  events,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initialDate: DateKey | null;
  initialEventId?: string;
  events: EventOption[];
  onClose: () => void;
  onSubmit: (input: TaskCreateInput) => Promise<void>;
}) {
  const [form, setForm] = useState(empty('', ''));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(empty(initialEventId ?? '', initialDate ?? ''));
      setError(null);
    }
  }, [open, initialDate, initialEventId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        ...form,
        dueDate: form.dueDate || null,
        status: 'TODO',
        priority: form.priority as TaskCreateInput['priority'],
        category: form.category || null,
        assignee: form.assignee || null,
        description: form.description || null,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nouvelle tâche" size="md">
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className={labelCls}>Activité *</span>
          <select required className={inputCls} value={form.eventId} onChange={(e) => setForm({ ...form, eventId: e.target.value })}>
            <option value="" disabled>Choisir une activité…</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Tâche *</span>
          <input
            required
            autoFocus
            maxLength={200}
            className={inputCls}
            placeholder="Ex. Envoyer les invitations Bateaux dragon"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className={labelCls}>Échéance</span>
            <input type="date" className={inputCls} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </label>
          <label className="block">
            <span className={labelCls}>Priorité</span>
            <select className={inputCls} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>{PRIORITY_META[p].label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Catégorie</span>
            <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">—</option>
              {TASK_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Responsable</span>
            <input className={inputCls} maxLength={120} placeholder="Nom" value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} />
          </label>
        </div>
        <label className="block">
          <span className={labelCls}>Notes</span>
          <textarea className={`${inputCls} min-h-[80px]`} maxLength={2000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
        {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-white">Annuler</button>
          <button type="submit" disabled={submitting} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
            {submitting ? 'Ajout…' : 'Ajouter la tâche'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
