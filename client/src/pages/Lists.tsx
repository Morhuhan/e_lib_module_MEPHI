// src/pages/Lists.tsx
import React, { useState, useEffect, useCallback, ChangeEvent, Fragment } from 'react';
import clsx from 'clsx';
import { toast } from 'react-toastify';

import { type Book, type PaginatedResponse } from '../utils/interfaces.tsx';

import httpClient from '../utils/httpsClient.tsx';

import Pagination          from '../components/Pagination.tsx';

import ReferenceManagerModal, {
  EntityKey,
} from '../components/ReferenceManagerModal.tsx';
import CreateBookModal from '../components/Modals/CreateBookModal.tsx';
import EditBookModal from '../components/Modals/EditBookModal.tsx';
import DeleteBookConfirmModal from '../components/DeleteBookConfirmModal.tsx';
import PrintBooksSlip from '../utils/print/PrintBooksSlip.tsx';

const LIMIT_OPTIONS = [10, 20, 50] as const;

/* ---------- колонки таблицы книг ---------- */
const COLUMNS = [
  { key: 'title',             label: 'Название' },
  { key: 'authors',           label: 'Авторы' },
  { key: 'bookType',          label: 'Тип' },
  { key: 'edit',              label: 'Редакция' },
  { key: 'series',            label: 'Серия' },
  { key: 'physDesc',          label: 'Хар-ки' },
  { key: 'description',       label: 'Описание' },
  { key: 'bbks',              label: 'ББК' },
  { key: 'udcs',              label: 'УДК' },
  { key: 'grntis',            label: 'ГРНТИ' },
  { key: 'publicationPlaces', label: 'Издательство' },
] as const;

type ColumnKey = (typeof COLUMNS)[number]['key'];
type SortState = { field: ColumnKey; order: 'asc' | 'desc' } | null;

const DEBOUNCE_MS = 400;

const Lists: React.FC = () => {
  /* ───────── фильтры, пагинация, сортировка ───────── */
  const [rawSearch, setRawSearch] = useState('');
  const [searchColumn, setSearchColumn] = useState<ColumnKey>(COLUMNS[0].key);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<typeof LIMIT_OPTIONS[number]>(LIMIT_OPTIONS[0]);
  const [sort, setSort] = useState<SortState>(null);

  /* ───────── данные ───────── */
  const [data, setData] = useState<PaginatedResponse<Book> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  /* ───────── модалки книг ───────── */
  const [editing,  setEditing]  = useState<Book | null>(null);
  const [deleting, setDeleting] = useState<Book | null>(null);
  const [creating, setCreating] = useState(false);

  /* ───────── раскрытие строк ───────── */
  const [expandedId, setExpandedId] = useState<number | null>(null);

  /* ───────── ctrl-подсветка справочников ───────── */
  const [ctrlPressed, setCtrlPressed] = useState(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.ctrlKey || e.metaKey) setCtrlPressed(true); };
    const up   = (e: KeyboardEvent) => { if (!e.ctrlKey && !e.metaKey) setCtrlPressed(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  /* ───────── ReferenceManagerModal ───────── */
  const [refOpen, setRefOpen] = useState(false);
  const [refEntity, setRefEntity] = useState<EntityKey>('authors');
  const [refField,  setRefField]  = useState('lastName');
  const [refValue,  setRefValue]  = useState('');

  const openReference = (
    e: React.MouseEvent,
    entity: EntityKey,
    field: string,
    value: string | null | undefined,
  ) => {
    if (!ctrlPressed || !value) return;
    e.stopPropagation();
    setRefEntity(entity);
    setRefField(field);
    setRefValue(value);
    setRefOpen(true);
  };

  /* ───────── сортировка ───────── */
  const cycleSortState = useCallback((field: ColumnKey) => {
    setSort(prev => {
      if (!prev || prev.field !== field) return { field, order: 'asc' };
      if (prev.order === 'asc') return { field, order: 'desc' };
      return null;
    });
    setPage(1);
  }, []);

  /* ───────── раскрытие строк книги ───────── */
  const handleRowClick = (book: Book) => {
    if (!book.bookCopies || book.bookCopies.length === 0) {
      toast.info(`У книги "${book.title ?? 'Без названия'}" нет доступных экземпляров`);
      return;
    }
    const sel = window.getSelection();
    if (sel && sel.toString().length) return;
    setExpandedId(prev => (prev === book.id ? null : book.id));
  };
  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  /* ───────── загрузка книг ───────── */
  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const p = new URLSearchParams();
        p.append('search', rawSearch.trim());
        p.append('searchColumn', searchColumn);
        p.append('onlyAvailable', String(onlyAvailable));
        p.append('page', String(page));
        p.append('limit', String(limit));
        if (sort) p.append('sort', `${sort.field}.${sort.order}`);

        const { data } = await httpClient.get<PaginatedResponse<Book>>(
          `/books/paginated?${p.toString()}`,
          { signal: ctrl.signal },
        );
        setData(data);
      } catch (err: any) {
        if (err.name !== 'CanceledError') {
          setError('Не удалось загрузить книги. Попробуйте ещё раз.');
          setData(null);
        }
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [rawSearch, searchColumn, onlyAvailable, page, limit, sort, reloadToken]);

  /* ───────── helpers ───────── */
  const refresh = () => setReloadToken(v => v + 1);

  const cleanBook = (b: Book): any =>
    Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v === null ? undefined : v]));

  /* ───────── callbacks ───────── */
  const onBookSaved   = () => { setEditing(null);  refresh(); };
  const onBookDeleted = () => { setDeleting(null); refresh(); };

  /* ───────── вычисления ───────── */
  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  const arrowFor = (field: ColumnKey) =>
    !sort || sort.field !== field
      ? { char: '▼', className: 'text-gray-400' }
      : { char: sort.order === 'asc' ? '▲' : '▼', className: 'text-black' };

  /* ───────── UI ───────── */
  return (
    <div className="w-full max-w-full px-4 py-4">
      <h2 className="text-lg font-medium mb-4">Список книг</h2>

      {error && (
        <div className="bg-red-100 border rounded p-3 mb-2 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* ---------- фильтры ---------- */}
      <div className="flex flex-col sm:flex-row items-center gap-2 mb-4">
        <select
          value={searchColumn}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => {
            setSearchColumn(e.target.value as ColumnKey);
            setPage(1);
          }}
          className="border rounded px-2 py-1 text-sm"
        >
          {COLUMNS.map(c => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Введите поисковый запрос…"
          value={rawSearch}
          onChange={e => {
            setRawSearch(e.target.value);
            setPage(1);
          }}
          className="border rounded px-2 py-1 text-sm w-full sm:w-64"
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={e => {
              setOnlyAvailable(e.target.checked);
              setPage(1);
            }}
          />
          Только доступные
        </label>

        <div className="w-full sm:w-auto sm:ml-auto" />

        {/* кнопка печати */}
        <PrintBooksSlip
          search={rawSearch.trim()}
          searchColumn={searchColumn}
          onlyAvailable={onlyAvailable}
          sort={sort}
        />

        <button
          type="button"
          onClick={() => setCreating(true)}
          className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-300 text-sm font-medium"
        >
          + Новая книга
        </button>
      </div>

      {/* ---------- таблица книг ---------- */}
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
              <tr>
                <td colSpan={COLUMNS.length + 1} className="p-4 text-center">
                  Загрузка…
                </td>
              </tr>
            ) : !data || !data.data.length ? (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="p-4 text-center">
                  Нет книг
                </td>
              </tr>
            ) : (
              data.data.map(book => (
                <Fragment key={book.id}>
                  {/* ---------- строка книги ---------- */}
                  <tr
                    className="hover:bg-gray-200 cursor-pointer"
                    onClick={() => handleRowClick(book)}
                  >
                  <td className="p-2 border font-medium">
                    {book.title ?? '—'}
                  </td>

                  {/* ─── авторы ─── */}
                  <td className="p-2 border">
                    {(book.authors ?? []).length
                      ? book.authors!.map((a, idx) => (
                          <span
                            key={idx}
                            onClick={e =>
                              openReference(
                                e,
                                'authors',
                                'lastName',
                                a.lastName,
                              )
                            }
                            className={clsx(
                              'cursor-pointer',
                              ctrlPressed &&
                                'underline text-blue-600',
                            )}
                          >
                            {[
                              a.firstName,
                              a.patronymic,
                              a.lastName,
                              a.birthYear,
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            {idx < book.authors!.length - 1
                              ? '; '
                              : ''}
                          </span>
                        ))
                      : '—'}
                  </td>

                  <td className="p-2 border">
                    {book.bookType ?? '—'}
                  </td>
                  <td className="p-2 border">
                    {book.edit ?? '—'}
                    {book.editionStatement
                      ? `, ${book.editionStatement}`
                      : ''}
                  </td>
                  <td className="p-2 border">
                    {book.series ?? '—'}
                  </td>
                  <td className="p-2 border">
                    {book.physDesc ?? '—'}
                  </td>
                  <td className="p-2 border">
                    {book.description ?? '—'}
                  </td>

                  {/* ─── ББК ─── */}
                  <td className="p-2 border">
                    {book.bbks?.length
                      ? book.bbks.map((x, i) => (
                          <span
                            key={i}
                            onClick={e =>
                              openReference(e, 'bbk', 'bbkAbb', x.bbkAbb)
                            }
                            className={clsx(
                              'cursor-pointer',
                              ctrlPressed && 'underline text-blue-600',
                            )}
                          >
                            {x.bbkAbb}
                            {i < book.bbks!.length - 1 ? ', ' : ''}
                          </span>
                        ))
                      : '—'}
                  </td>

                  {/* ─── УДК ─── */}
                  <td className="p-2 border">
                    {book.udcs?.length
                      ? book.udcs.map((x, i) => (
                          <span
                            key={i}
                            onClick={e =>
                              openReference(e, 'udc', 'udcAbb', x.udcAbb)
                            }
                            className={clsx(
                              'cursor-pointer',
                              ctrlPressed && 'underline text-blue-600',
                            )}
                          >
                            {x.udcAbb}
                            {i < book.udcs!.length - 1 ? ', ' : ''}
                          </span>
                        ))
                      : '—'}
                  </td>

                  {/* ─── ГРНТИ ─── */}
                  <td className="p-2 border">
                    {book.grntis?.length
                      ? book.grntis.map((x, i) => (
                          <span
                            key={i}
                            onClick={e =>
                              openReference(e, 'grnti', 'code', x.code)
                            }
                            className={clsx(
                              'cursor-pointer',
                              ctrlPressed && 'underline text-blue-600',
                            )}
                          >
                            {x.code}
                            {i < book.grntis!.length - 1 ? ', ' : ''}
                          </span>
                        ))
                      : '—'}
                  </td>
                    <td className="p-2 border">
                      {(book.publicationPlaces ?? []).map((p, i) => (
                        <span key={i}>
                          {p.publisher?.name && (
                            <span
                              onClick={e =>
                                openReference(e, 'publishers', 'name', p.publisher!.name)
                              }
                              className={clsx(
                                'cursor-pointer',
                                ctrlPressed && 'underline text-blue-600',
                              )}
                            >
                              {p.publisher!.name}
                            </span>
                          )}
                          {[p.city, p.pubYear].filter(Boolean).length
                            ? `, ${[p.city, p.pubYear].filter(Boolean).join(', ')}`
                            : ''}
                          {i < book.publicationPlaces!.length - 1 ? '; ' : ''}
                        </span>
                      )) || '—'}
                    </td>

                    {/* ─── действия ─── */}
                    <td className="p-2 border text-center space-x-2 whitespace-nowrap">
                      <button
                        className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                        onClick={e => {
                          stopPropagation(e);
                          setEditing(book);
                        }}
                      >
                        Изм
                      </button>
                      <button
                        className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                        onClick={e => {
                          stopPropagation(e);
                          setDeleting(book);
                        }}
                      >
                        Удл
                      </button>
                    </td>
                  </tr>

                  {/* ---------- подтаблица экземпляров ---------- */}
                  {expandedId === book.id && (
                    <tr className="bg-blue-100">
                      <td colSpan={COLUMNS.length + 1} className="p-0">
                        <table className="w-full text-xs">
                          <thead className="bg-blue-200">
                            <tr>
                              <th className="p-2 border">Инвентарный №</th>
                              <th className="p-2 border">Дата поступления</th>
                              <th className="p-2 border">Место хранения</th>
                              <th className="p-2 border">Цена</th>
                              <th className="p-2 border">Статус</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(book.bookCopies ?? []).map(copy => {
                              const issued = (copy.borrowRecords ?? []).some(r => !r.returnDate);
                              const priceNum =
                                copy.price != null ? Number(copy.price) : null;
                              return (
                                <tr key={copy.id}>
                                  <td className="p-2 border">
                                    {copy.inventoryNo || '—'}
                                  </td>
                                  <td className="p-2 border">
                                    {copy.receiptDate
                                      ? new Date(copy.receiptDate).toLocaleDateString()
                                      : '—'}
                                  </td>
                                  <td className="p-2 border">
                                    {copy.storagePlace || '—'}
                                  </td>
                                  <td className="p-2 border">
                                    {priceNum != null && !isNaN(priceNum)
                                      ? priceNum.toFixed(2)
                                      : '—'}
                                  </td>
                                  <td
                                    className={clsx(
                                      'p-2 border text-center',
                                      issued ? 'text-red-600' : 'text-green-600',
                                    )}
                                  >
                                    {issued ? 'выдан' : 'в наличии'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ---------- пагинация ---------- */}
      <Pagination
        page={page}
        totalPages={totalPages}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={l => {
          setLimit(l as typeof limit);
          setPage(1);
        }}
      />

      {/* ---------- модалки книг ---------- */}
      <EditBookModal
        book={editing}
        onClose={() => setEditing(null)}
        onSaved={onBookSaved}
      />
      <DeleteBookConfirmModal
        book={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={onBookDeleted}
      />
      <CreateBookModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          refresh();
        }}
      />

      {/* ---------- справочник ---------- */}
      <ReferenceManagerModal
        open={refOpen}
        onOpenChange={setRefOpen}
        initialEntity={refEntity}
        initialSearchField={refField}
        initialSearch={refValue}
      />
    </div>
  );
};

export default Lists;