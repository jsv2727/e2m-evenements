'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CalendarPayload, CalendarTask, DateKey } from '@/lib/calendar';

const EMPTY: CalendarPayload = { activities: [], tasks: [], overdue: [] };

export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(body.issues) && body.issues.length ? ` — ${body.issues[0].message}` : '';
    throw new Error(`${body.error ?? `Erreur ${res.status}`}${detail}`);
  }
  return body as T;
}

/**
 * Charge les données du calendrier pour une plage donnée.
 * `reloadToken` force un rechargement après une mutation externe ; `enabled` diffère le chargement.
 */
export function useCalendarData(from: DateKey, to: DateKey, today: DateKey, reloadToken: number, enabled = true) {
  const [data, setData] = useState<CalendarPayload>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    const qs = new URLSearchParams({ from, to, today });
    requestJson<CalendarPayload>(`/api/calendar?${qs}`, { signal: controller.signal })
      .then((payload) => {
        setData(payload);
        setError(null);
      })
      .catch((e: unknown) => {
        if ((e as Error).name !== 'AbortError') setError((e as Error).message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [from, to, today, reloadToken, enabled]);

  /** Applique localement une modification de tâche (mise à jour optimiste). */
  const patchLocal = useCallback(
    (taskId: string, patch: Partial<CalendarTask> | null) => {
      setData((prev) => {
        const apply = (list: CalendarTask[]) =>
          patch === null ? list.filter((t) => t.id !== taskId) : list.map((t) => (t.id === taskId ? { ...t, ...patch } : t));
        const tasks = apply(prev.tasks);
        // Une tâche déplacée hors de la plage chargée disparaît de la vue.
        const inRange = tasks.filter((t) => !t.dueDate || (t.dueDate >= from && t.dueDate <= to));
        const overdue = apply(prev.overdue).filter((t) => t.status !== 'DONE' && !!t.dueDate && t.dueDate < today);
        return { ...prev, tasks: inRange, overdue };
      });
    },
    [from, to, today],
  );

  return { data, loading, error, patchLocal };
}
