// src/components/AddBookDialog.tsx
import React, { useEffect, useState } from 'react';
import httpClient from '../../../utils/httpsClient.tsx';
import BaseDialog from '../../BaseDialog.tsx';

/** Что минимально нужно модалкам после выбора */
export interface BookPick {
  id: number;
  title: string;
  author: string | null;
  publisher: string | null;
}

/** Пропсы самого диалога */
interface AddBookDialogProps {
  open: boolean;
  onClose: () => void;
  onPick: (book: BookPick) => void;
}

/** Приводим ответ сервера к виду BookPick */
const normalize = (raw: any): BookPick => ({
  id   : raw.id,
  title: raw.title ?? 'Без названия',
  author:
    raw.authors?.[0]
      ? `${raw.authors[0].lastName} ${raw.authors[0].firstName}` +
        (raw.authors[0].patronymic ? ` ${raw.authors[0].patronymic}` : '')
      : null,
  publisher: raw.publicationPlaces?.[0]?.publisher?.name ?? null,
});

const AddBookDialog: React.FC<AddBookDialogProps> = ({ open, onClose, onPick }) => {
  const [query, setQuery]           = useState('');
  const [items, setItems]           = useState<BookPick[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  /** ─── поиск книг ─── */
  useEffect(() => {
    // очистка, когда диалог закрывается
    if (!open) { setQuery(''); setItems([]); setError(null); return; }

    // ждать хотя-бы 2 символа
    if (query.trim().length < 2) { setItems([]); setError(null); return; }

    const ctrl  = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        /** ВАЖНО:  теперь /books/paginated и параметр search   &darr;&darr;&darr; */
        const { data } = await httpClient.get('/books/paginated', {
          params: {
            search: query.trim(),
            page  : 1,
            limit : 20,
            sort  : 'title.asc',
          },
          signal: ctrl.signal,
        });

        /* сервер возвращает { data, total, page, limit } */
        setItems((data?.data ?? []).map(normalize));
      } catch (e: any) {
        if (e.name !== 'CanceledError') {
          console.error('Ошибка при поиске книг:', e);
          setError('Не удалось загрузить книги. Попробуйте ещё раз.');
          setItems([]);
        }
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [query, open]);

  /** ─── UI ─── */
  return (
    <BaseDialog
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title="Выбрать книгу"
      widthClass="max-w-xl"
    >
      <input
        autoFocus
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Поиск по названию/автору…"
        className="w-full rounded border px-2 py-1 text-sm mb-3"
      />

      {loading && <p className="text-sm text-gray-500">Загрузка…</p>}
      {error   && <p className="text-sm text-red-500">{error}</p>}
      {!loading && !error && items.length === 0 && query.trim() && (
        <p className="text-sm text-gray-500">Книги не найдены</p>
      )}

      <div className="max-h-72 overflow-y-auto space-y-1">
        {items.map(b => (
          <button
            key={b.id}
            type="button"
            onClick={() => { onPick(b); onClose(); }}
            className="block w-full text-left rounded hover:bg-gray-100 px-2 py-1"
          >
            <strong>{b.title}</strong>
            {b.author    && ` — ${b.author}`}
            {b.publisher && `, ${b.publisher}`}
          </button>
        ))}
      </div>
    </BaseDialog>
  );
};

export default AddBookDialog;