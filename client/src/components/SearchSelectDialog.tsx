// src/components/SearchSelectDialog.tsx
import React, { useEffect, useMemo, useState } from 'react';
import BaseDialog from './BaseDialog';
import httpClient from '../utils/httpsClient';

type NormalizeFn<T> = (raw: any) => T;
type RenderFn<T>    = (item: T) => React.ReactNode;

interface RemoteConfig<T> {
  endpoint: string;
  normalize: NormalizeFn<T>;
  minQueryLen?: number;
  extraParams?: Record<string, any>;
}

interface LocalConfig<T> {
  items: T[];
  filter?: (item: T, q: string) => boolean;
}

interface Props<T> {
  open: boolean;
  onClose: () => void;
  onPick: (item: T) => void;

  title: string;
  placeholder: string;

  remote?: RemoteConfig<T>;
  local?: LocalConfig<T>;

  renderItem: RenderFn<T>;
}

export default function SearchSelectDialog<T>({
  open,
  onClose,
  onPick,

  title,
  placeholder,

  remote,
  local,
  renderItem,
}: Props<T>) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  /* ── reset ── */
  useEffect(() => {
    if (!open) { setQuery(''); setResults([]); setError(null); }
  }, [open]);

  /* ── remote search ── */
  useEffect(() => {
    if (!remote || !open) return;
    const min = remote.minQueryLen ?? 2;
    if (query.trim().length < min) { setResults([]); setError(null); return; }

    const ctrl = new AbortController();
    const tId  = setTimeout(async () => {
      setLoading(true); setError(null);
      try {
        const { data } = await httpClient.get(remote.endpoint, {
          params: { q: query.trim(), ...remote.extraParams },
          signal: ctrl.signal,
        });
        const arr = Array.isArray(data) ? data : data?.data ?? [];
        setResults(arr.map(remote.normalize));
      } catch (e: any) {
        if (e.name !== 'CanceledError') {
          console.error(e);
          setError('Не удалось загрузить данные. Попробуйте ещё раз.');
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => { clearTimeout(tId); ctrl.abort(); };
  }, [query, open, remote]);

  /* ── local filter ── */
  const localFiltered = useMemo(() => {
    if (!local) return [];
    const q = query.trim().toLowerCase();
    if (!q) return local.items;

    const base = (x: any) => JSON.stringify(x).toLowerCase().includes(q);
    const f    = local.filter ?? base;
    return local.items.filter(i => f(i, q));
  }, [local, query]);

  const items = remote ? results : localFiltered;

  /* ── UI ── */
  return (
    <BaseDialog
      open={open}
      onOpenChange={v => !v && onClose()}
      title={title}
      footer={
        <button
          className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm"
          onClick={onClose}
        >
          Отмена
        </button>
      }
    >
      <div className="space-y-3">
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded border px-2 py-1 text-sm"
        />

        {/* список результатов: BaseDialog ужеScrollable */}
        <div className="space-y-1">
          {loading && <p className="text-sm text-gray-500">Загрузка…</p>}
          {error   && <p className="text-sm text-red-500">{error}</p>}
          {!loading && !error && items.length === 0 && query.trim() && (
            <p className="text-sm text-gray-500">Ничего не найдено</p>
          )}

          {items.map(i => (
            <button
              key={(i as any).id}
              type="button"
              onClick={() => { onPick(i); onClose(); }}
              className="block w-full text-left rounded hover:bg-gray-100 px-2 py-1"
            >
              {renderItem(i)}
            </button>
          ))}
        </div>
      </div>
    </BaseDialog>
  );
}