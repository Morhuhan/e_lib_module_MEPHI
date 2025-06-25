// src/components/AddBookCopyDialog.tsx
import React, { useEffect, useMemo, useState } from 'react';
import httpClient from '../../../utils/httpsClient.tsx';
import BaseDialog from '../../BaseDialog.tsx';

/* ──────────── Типы ──────────── */
export interface CopySearchItem {
  id: number;
  bookTitle: string;
  authors?: string | null;
  inventoryNo?: string | null;
  receiptDate?: string | null;
  storagePlace?: string | null;
  price?: string | null;
}

interface AddBookCopyDialogProps {
  open: boolean;
  bookId: number | null;
  onClose: () => void;
  onPick: (copy: CopySearchItem) => void;
}

/* ──────────── Компонент ──────────── */
const AddBookCopyDialog: React.FC<AddBookCopyDialogProps> = ({
  open,
  bookId,
  onClose,
  onPick,
}) => {
  const [query, setQuery]       = useState('');
  const [copies, setCopies]     = useState<CopySearchItem[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!open || !bookId) return;

    const ctrl = new AbortController();
    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await httpClient.get<CopySearchItem[]>(
          `/book-copies/by-book/${bookId}`,
          { params: { onlyFree: true }, signal: ctrl.signal },
        );
        setCopies(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (e.name !== 'CanceledError') {
          console.error(e);
          setError('Не удалось загрузить экземпляры');
        }
      } finally {
        setLoading(false);
      }
    };

    fetch();
    return () => ctrl.abort();
  }, [open, bookId]);

  useEffect(() => {
    if (!open) { setQuery(''); setCopies([]); setError(null); }
  }, [open]);

  const filtered = useMemo(() => {
    const list = Array.isArray(copies) ? copies : [];
    const q = query.trim().toLowerCase();
    if (!q) return list;

    return list.filter(c => {
      const concat =
        `${c.bookTitle} ${c.authors ?? ''} ${c.inventoryNo ?? ''} ` +
        `${c.storagePlace ?? ''} ${c.receiptDate ?? ''} ${c.price ?? ''}`.toLowerCase();
      return concat.includes(q);
    });
  }, [copies, query]);

  return (
    <BaseDialog
      open={open}
      onOpenChange={v => !v && onClose()}
      title="Выберите экземпляр"
      widthClass="max-w-lg"
    >
      {error && <p className="text-sm text-red-500 mb-2">{error}</p>}

      <div className="space-y-3">
        <input
          className="w-full rounded border px-2 py-1 text-sm"
          placeholder="Поиск…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
          disabled={loading}
        />

        <div className="max-h-60 overflow-y-auto space-y-1">
          {loading && <p className="text-sm text-gray-500">Загрузка…</p>}
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-gray-500">Ничего не найдено</p>
          )}

          {!loading && filtered.map(c => {
            const selectable = Boolean(c.inventoryNo);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => selectable && onPick(c)}
                disabled={!selectable}
                className={
                  `block w-full text-left rounded px-2 py-1 ` +
                  (selectable
                    ? 'hover:bg-gray-100'
                    : 'bg-gray-50 opacity-50 cursor-not-allowed')
                }
              >
                {c.inventoryNo && (
                  <div className="font-semibold text-base">
                    № {c.inventoryNo}
                  </div>
                )}

                {(c.bookTitle || c.storagePlace || c.receiptDate || c.price) && (
                  <div className="text-xs text-gray-500">
                    {c.bookTitle && c.bookTitle}
                    {c.bookTitle && (c.storagePlace || c.receiptDate || c.price) && ' • '}

                    {c.storagePlace && c.storagePlace}
                    {c.storagePlace && (c.receiptDate || c.price) && ' • '}

                    {c.receiptDate && `Поступление: ${c.receiptDate}`}
                    {c.receiptDate && c.price && ' • '}

                    {c.price && `Цена: ${c.price} ₽`}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </BaseDialog>
  );
};

export default AddBookCopyDialog;