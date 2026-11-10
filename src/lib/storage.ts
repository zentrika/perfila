'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Claves de localStorage. El sufijo de versión permite migrar sin romper datos guardados. */
export const STORAGE_KEYS = {
  cv: 'perfila:cv:v1',
  cvSavedAt: 'perfila:cv:savedAt',
  editorStep: 'perfila:editor:step',
  ats: 'perfila:ats:v1',
  theme: 'perfila:theme',
} as const;

export function readJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // Cuota llena, modo privado o almacenamiento bloqueado: la app sigue funcionando en memoria.
    return false;
  }
}

export function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* sin almacenamiento disponible */
  }
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Estado que sobrevive a recargas. Se carga después del montaje (el HTML del servidor nunca
 * conoce los datos) y se guarda con un pequeño retardo para no escribir en cada tecla.
 * Antes de cerrar o esconder la pestaña se fuerza el guardado pendiente.
 * Si otra pestaña cambia los datos, este estado se actualiza.
 */
export function usePersistentState<T>(key: string, initial: () => T, sanitize: (raw: unknown) => T) {
  const [state, setState] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const pending = useRef<T | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sanitizeRef = useRef(sanitize);
  sanitizeRef.current = sanitize;

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (pending.current === null) return;
    const ok = writeJson(key, pending.current);
    pending.current = null;
    if (ok) {
      const now = Date.now();
      writeJson(`${key}:savedAt`, now);
      setSavedAt(now);
      setStatus('saved');
    } else {
      setStatus('error');
    }
  }, [key]);

  // Carga inicial
  useEffect(() => {
    const raw = readJson(key);
    if (raw !== null) setState(sanitizeRef.current(raw));
    const at = readJson(`${key}:savedAt`);
    if (typeof at === 'number') setSavedAt(at);
    setHydrated(true);
  }, [key]);

  // Guardado al salir y sincronización entre pestañas
  useEffect(() => {
    const onHide = () => flush();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || e.newValue === null) return;
      try {
        setState(sanitizeRef.current(JSON.parse(e.newValue)));
      } catch {
        /* valor ilegible: se ignora */
      }
    };
    window.addEventListener('pagehide', onHide);
    window.addEventListener('beforeunload', onHide);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('beforeunload', onHide);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('storage', onStorage);
      flush();
    };
  }, [key, flush]);

  // Copia síncrona del último valor: permite encadenar varias actualizaciones en el mismo evento
  // sin efectos secundarios dentro de funciones de actualización de React.
  const latest = useRef<T>(state);
  latest.current = state;

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      const value = typeof next === 'function' ? (next as (p: T) => T)(latest.current) : next;
      latest.current = value;
      setState(value);
      pending.current = value;
      setStatus('saving');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 350);
    },
    [flush],
  );

  return { state, setState: update, hydrated, status, savedAt, flush };
}

export function timeAgo(ts: number | null): string {
  if (!ts) return '';
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 10) return 'justo ahora';
  if (s < 60) return `hace ${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
}
