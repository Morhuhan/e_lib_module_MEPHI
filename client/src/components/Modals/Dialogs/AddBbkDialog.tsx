// src/components/AddBbkDialog.tsx
import React, { useEffect, useState } from 'react';
import httpClient from '../../../utils/httpsClient.tsx';
import BaseDialog from '../../BaseDialog.tsx';

export interface ClassCode {
  id: number;
  code: string;          // аббревиатура (&laquo;BBK 32.973-72&raquo; и т.п.)
  description?: string;  // расшифровка
}

interface AddBbkDialogProps {
  open: boolean;
  onClose: () => void;
  onPick: (item: ClassCode) => void;
}

// сервер для ББК возвращает поле bbkAbb (аббревиатура) + optional description
const normalize = (raw: any): ClassCode => ({
  id         : raw.id        ?? 0,
  code       : (raw.bbkAbb   ?? raw.abb ?? raw.code ?? '').trim(),
  description: raw.description ?? null,
});

const AddBbkDialog: React.FC<AddBbkDialogProps> = ({ open, onClose, onPick }) => {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<ClassCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!open) { setQuery(''); setResults([]); setError(null); return; }

    if (query.trim().length < 1) { setResults([]); setError(null); return; }

    const ctrl = new AbortController();
    const tId  = setTimeout(async () => {
      setLoading(true); setError(null);
      try {
        const { data } = await httpClient.get('/bbk', {
          params: { q: query.trim() },
          signal: ctrl.signal,
        });
        setResults((Array.isArray(data) ? data : []).map(normalize));
      } catch (err: any) {
        if (err.name !== 'CanceledError') {
          console.error('Ошибка при поиске ББК:', err);
          setError('Не удалось загрузить коды. Попробуйте ещё раз.');
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => { clearTimeout(tId); ctrl.abort(); };
  }, [query, open]);

  return (
    <BaseDialog
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title="Добавить ББК"
      widthClass="max-w-lg"
    >
      <div className="space-y-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск ББК…"
          className="w-full rounded border px-2 py-1 text-sm"
          autoFocus
        />

        <div className="max-h-60 overflow-y-auto space-y-1">
          {loading && <p className="text-sm text-gray-500">Загрузка…</p>}
          {error   && <p className="text-sm text-red-500">{error}</p>}
          {!loading && !error && results.length === 0 && query.trim() && (
            <p className="text-sm text-gray-500">Коды не найдены</p>
          )}

          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { onPick(item); onClose(); }}
              className="block w-full text-left rounded hover:bg-gray-100 px-2 py-1"
            >
              <strong>{item.code}</strong>
              {item.description && ` — ${item.description}`}
            </button>
          ))}
        </div>
      </div>
    </BaseDialog>
  );
};

export default AddBbkDialog;