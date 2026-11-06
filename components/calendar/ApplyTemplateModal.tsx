'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import Modal from '@/components/Modal';
import { cn } from '@/lib/utils';
import { addDays, formatKey, offsetLabel, todayKey, toDateKey, type TemplateDTO } from '@/lib/calendar';
import { PRIORITY_META } from './ui';
import { inputCls, labelCls } from './TaskDrawer';
import type { EventOption } from './TaskFormModal';
import { requestJson } from './useCalendarData';

export default function ApplyTemplateModal({
  open,
  events,
  fixedEventId,
  onClose,
  onApplied,
}: {
  open: boolean;
  events: EventOption[];
  fixedEventId?: string;
  onClose: () => void;
  onApplied: (result: { created: number; skipped: number }) => void;
}) {
  const [templates, setTemplates] = useState<TemplateDTO[]>([]);
  const [eventId, setEventId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setEventId(fixedEventId ?? '');
    setTemplateId('');
    requestJson<TemplateDTO[]>('/api/task-templates').then(setTemplates).catch((e: Error) => setError(e.message));
  }, [open, fixedEventId]);

  const event = events.find((e) => e.id === eventId);

  // Présélection du modèle correspondant au type d'activité.
  useEffect(() => {
    if (!event || templateId) return;
    const match = templates.find((t) => t.eventType && t.eventType.toLowerCase() === event.type?.toLowerCase());
    if (match) setTemplateId(match.id);
  }, [event, templates, templateId]);

  const template = templates.find((t) => t.id === templateId);
  const today = todayKey();
  const preview = useMemo(() => {
    if (!event || !template) return [];
    const start = toDateKey(event.startDate);
    return template.items.map((i) => ({ ...i, date: addDays(start, i.offsetDays) }));
  }, [event, template]);
  const pastCount = preview.filter((p) => p.date < today).length;

  const apply = async () => {
    if (!eventId || !templateId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await requestJson<{ created: number; skipped: number }>(`/api/events/${eventId}/apply-template`, {
        method: 'POST',
        body: JSON.stringify({ templateId }),
      });
      onApplied(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Appliquer un rétroplanning" size="lg">
      <div className="space-y-5">
        <p className="text-sm text-slate-400">
          Génère automatiquement toutes les tâches du modèle, datées par rapport au début de l&apos;activité. Les tâches déjà présentes (même titre) ne sont pas dupliquées.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className={labelCls}>Activité</span>
            <select className={inputCls} value={eventId} disabled={!!fixedEventId} onChange={(e) => { setEventId(e.target.value); setTemplateId(''); }}>
              <option value="" disabled>Choisir…</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} — {formatKey(toDateKey(ev.startDate), { day: 'numeric', month: 'short', year: 'numeric' })}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Modèle</span>
            <select className={inputCls} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="" disabled>Choisir…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.items.length} étapes)</option>
              ))}
            </select>
          </label>
        </div>

        {preview.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-800/40 px-4 py-2 text-xs text-slate-400">
              <span>Aperçu — {preview.length} tâches</span>
              {pastCount > 0 && <span className="text-amber-300">{pastCount} échéance{pastCount > 1 ? 's' : ''} déjà passée{pastCount > 1 ? 's' : ''}</span>}
            </div>
            <ul className="max-h-[320px] divide-y divide-slate-800/70 overflow-y-auto">
              {preview.map((p) => (
                <li key={p.id} className="grid grid-cols-[64px_120px_1fr_auto] items-center gap-3 px-4 py-2 text-[13px]">
                  <span className="font-mono text-xs text-slate-500">{offsetLabel(p.offsetDays)}</span>
                  <span className={cn('text-xs tabular-nums', p.date < today ? 'text-amber-300' : 'text-slate-300')}>
                    {formatKey(p.date, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="truncate text-slate-100">{p.title}</span>
                  <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_META[p.priority]?.dot)} title={PRIORITY_META[p.priority]?.label} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}

        <div className="flex items-center justify-between pt-1">
          <Link href="/calendar/templates" className="text-xs text-indigo-300 hover:text-indigo-200">Gérer les modèles →</Link>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-white">Annuler</button>
            <button
              type="button"
              onClick={apply}
              disabled={!eventId || !templateId || busy}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
            >
              <Sparkles size={15} />
              {busy ? 'Génération…' : 'Générer les tâches'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
