// src/pages/Copies.tsx
import React, { useState, useEffect, ChangeEvent } from 'react';
import clsx from 'clsx';

import type { BookCopy, PaginatedResponse } from '../utils/interfaces.tsx';
import Pagination from '../components/Pagination.tsx';
import httpClient from '../utils/httpsClient.tsx';
import CreateCopyModal from '../components/Modals/CreateCopyModal.tsx';
import EditCopyModal from '../components/Modals/EditCopyModal.tsx';
import DeleteCopyConfirmModal from '../components/DeleteCopyConfirmModal.tsx';

const LIMIT_OPTIONS = [10, 20, 50] as const;

/* Колонки таблицы экземпляров */
const COLUMNS = [
  { key: 'inventoryNo',  label: 'Инвентарный №'  },
  { key: 'bookTitle',    label: 'Книга'           },
  { key: 'receiptDate',  label: 'Дата поступления'},
  { key: 'storagePlace', label: 'Место хранения'  },
  { key: 'price',        label: 'Цена'            },
  { key: 'status',       label: 'Статус'          },
] as const;

type ColumnKey = (typeof COLUMNS)[number]['key'];
type SortState = { field: ColumnKey; order: 'asc' | 'desc' } | null;

const DEBOUNCE_MS = 400;

const bookInfo = (c: BookCopy) => {
  const b = c.book;
  if (!b) return '—';

  const parts: string[] = [];
  if (b.title) parts.push(b.title);

  const a = b.authors?.[0];
  if (a) {
    const fio = [a.lastName, a.firstName, a.patronymic].filter(Boolean).join(' ');
    if (fio) parts.push(fio);
  }

  const p = b.publicationPlaces?.[0];
  if (p) {
    const pub: string[] = [];
    if (p.city)            pub.push(p.city);
    if (p.publisher?.name) pub.push(p.publisher.name);
    if (p.pubYear)         pub.push(String(p.pubYear));
    if (pub.length) parts.push(pub.join(', '));
  }

  return parts.join(' — ');
};

const Copies: React.FC = () => {
  /* ─── фильтры, пагинация, сортировка ─── */
  const [rawSearch,     setRawSearch]     = useState('');
  const [searchColumn,  setSearchColumn]  = useState<ColumnKey>(COLUMNS[0].key);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [page,          setPage]          = useState(1);
  const [limit,         setLimit]         = useState<typeof LIMIT_OPTIONS[number]>(LIMIT_OPTIONS[0]);
  const [sort,          setSort]          = useState<SortState>(null);

  /* ─── данные ─── */
  const [data,        setData]        = useState<PaginatedResponse<BookCopy> | null>(null);
  const [isLoading,   setIsLoading]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  /* ─── модалки ─── */
  const [editing,      setEditing]      = useState<BookCopy | null>(null);
  const [deletingCopy, setDeletingCopy] = useState<BookCopy | null>(null);
  const [creating,     setCreating]     = useState(false);

  /* ─── сортировка ─── */
  const cycleSortState = (field: ColumnKey) => {
    setSort(prev => {
      if (!prev || prev.field !== field) return { field, order: 'asc' };
      if (prev.order === 'asc')          return { field, order: 'desc' };
      return null;
    });
    setPage(1);
  };

  const arrowFor = (field: ColumnKey) =>
    !sort || sort.field !== field
      ? { char: '▼', className: 'text-gray-400' }
      : { char: sort.order === 'asc' ? '▲' : '▼', className: 'text-black' };

  /* ─── загрузка экземпляров ─── */
  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const p = new URLSearchParams();

        /* добавляем колонку ТОЛЬКО если есть поисковый текст */
        const trimmedSearch = rawSearch.trim();
        if (trimmedSearch) {
          p.append('search', trimmedSearch);
          p.append('searchColumn', searchColumn);
        }

        p.append('onlyAvailable', String(onlyAvailable));
        p.append('page',  String(page));
        p.append('limit', String(limit));
        if (sort) p.append('sort', `${sort.field}.${sort.order}`);

        const { data } = await httpClient.get<PaginatedResponse<BookCopy>>(
          `/book-copies/paginated?${p.toString()}`,
          { signal: ctrl.signal },
        );
        setData(data);
      } catch (err: any) {
        if (err.name !== 'CanceledError') {
          setError('Не удалось загрузить экземпляры. Попробуйте ещё раз.');
          setData(null);
        }
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [rawSearch, searchColumn, onlyAvailable, page, limit, sort, reloadToken]);

  /* ─── helpers ─── */
  const refresh = () => setReloadToken(v => v + 1);

  /* ─── callbacks ─── */
  const onCopySaved   = () => { setEditing(null);      refresh(); };
  const onCopyDeleted = () => { setDeletingCopy(null); refresh(); };

  /* ─── вычисления ─── */
  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  /* ─── UI ─── */
  return (
    <div className="w-full max-w-full px-4 py-4">
      <h2 className="text-lg font-medium mb-4">Список экземпляров</h2>

      {error && (
        <div className="bg-red-100 border rounded p-3 mb-2 text-red-700 text-sm">{error}</div>
      )}

      {/* ─── фильтры ─── */}
      <div className="flex flex-col sm:flex-row items-center gap-2 mb-4">
        <select
          value={searchColumn}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => { setSearchColumn(e.target.value as ColumnKey); setPage(1); }}
          className="border rounded px-2 py-1 text-sm pr-8"
        >
          {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>

        <input
          type="text"
          placeholder="Введите поисковый запрос…"
          value={rawSearch}
          onChange={e => { setRawSearch(e.target.value); setPage(1); }}
          className="border rounded px-2 py-1 text-sm w-full sm:w-64 "
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={e => { setOnlyAvailable(e.target.checked); setPage(1); }}
          />
          Только доступные
        </label>

        <div className="w-full sm:w-auto sm:ml-auto" />

        <button
          type="button"
          onClick={() => setCreating(true)}
          className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-300 text-sm font-medium"
        >
          + Новый экземпляр
        </button>
      </div>

      {/* ─── таблица ─── */}
      <div className="relative overflow-x-auto border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 select-none">
            <tr>
              {COLUMNS.map(col => {
                const { char, className } = arrowFor(col.key);
                return (
                  <th
                    key={col.key}
                    className="p-2 border cursor-pointer whitespace-nowrap"
                    onClick={() => cycleSortState(col.key)}
                  >
                    {col.label}
                    <span className={clsx('ml-1', className)}>{char}</span>
                  </th>
                );
              })}
              <th className="p-2 border whitespace-nowrap">Действия</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr><td colSpan={COLUMNS.length + 1} className="p-4 text-center">Загрузка…</td></tr>
            ) : !data || !data.data.length ? (
              <tr><td colSpan={COLUMNS.length + 1} className="p-4 text-center">Нет экземпляров</td></tr>
            ) : (
              data.data.map(c => {
                const issued = (c.borrowRecords ?? []).some(r => !r.returnDate);
                const price  = c.price != null && !isNaN(Number(c.price))
                  ? Number(c.price).toFixed(2)
                  : '—';

                return (
                  <tr key={c.id} className="hover:bg-gray-200">
                    <td className="p-2 border">{c.inventoryNo || '—'}</td>
                    <td className="p-2 border">{bookInfo(c)}</td>
                    <td className="p-2 border">
                      {c.receiptDate ? new Date(c.receiptDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-2 border">{c.storagePlace || '—'}</td>
                    <td className="p-2 border">{price}</td>
                    <td className={clsx(
                      'p-2 border text-center',
                      issued ? 'text-red-600' : 'text-green-600'
                    )}>
                      {issued ? 'выдан' : 'в наличии'}
                    </td>

                    {/* ─── действия ─── */}
                    <td className="p-2 border text-center space-x-2 whitespace-nowrap">
                      <button
                        className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                        onClick={() => setEditing(c)}
                      >
                        Изм
                      </button>
                      <button
                        className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                        onClick={() => setDeletingCopy(c)}
                      >
                        Удал
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ─── пагинация ─── */}
      <Pagination
        page={page}
        totalPages={totalPages}
        limit={limit}
        onPageChange={(p) => setPage(Number(p))}
        onLimitChange={l => { setLimit(Number(l) as typeof limit); setPage(1); }}
      />

      {/* ─── модалки ─── */}
      <EditCopyModal
        copy={editing}
        onClose={() => setEditing(null)}
        onSaved={onCopySaved}
      />
      <DeleteCopyConfirmModal
        copy={deletingCopy}
        onClose={() => setDeletingCopy(null)}
        onDeleted={onCopyDeleted}
      />
      <CreateCopyModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => { setCreating(false); refresh(); }}
      />
    </div>
  );
};

export default Copies;