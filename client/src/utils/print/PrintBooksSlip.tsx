import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Printer } from 'lucide-react';

import httpClient from '../httpsClient.tsx';
import { type Book } from '../interfaces.tsx';

/* ─────────── колонки, которые печатаем (равны колонкам в Lists) ─────────── */
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
  { key: 'publicationPlaces', label: 'Изд-во' },
] as const;
type ColumnKey = (typeof COLUMNS)[number]['key'];
type SortState = { field: ColumnKey; order: 'asc' | 'desc' } | null;

/* ─────────── свойства компонента ─────────── */
interface Props {
  search: string;
  searchColumn: ColumnKey;
  onlyAvailable: boolean;
  sort: SortState;
}

/* ─────────── helpers ─────────── */
const PAGE_LIMIT = 1000;
const dash = (v: unknown): string =>
  v == null || (typeof v === 'string' && v.trim() === '') ? '—' : String(v);

const colLabel = (k: ColumnKey): string =>
  COLUMNS.find(c => c.key === k)?.label ?? k;

/* ---------- строковые представления полей ---------- */
const authorsStr = (b: Book) =>
  (b.authors ?? [])
    .map(a =>
      [a.firstName, a.patronymic, a.lastName, a.birthYear]
        .filter(Boolean)
        .join(' ')
    )
    .join('; ');

const bbkStr   = (b: Book) => (b.bbks   ?? []).map(x => x.bbkAbb).join(', ');
const udcStr   = (b: Book) => (b.udcs   ?? []).map(x => x.udcAbb).join(', ');
const grntiStr = (b: Book) => (b.grntis ?? []).map(x => x.code  ).join(', ');
const pubStr   = (b: Book) =>
  (b.publicationPlaces ?? [])
    .map(p =>
      [p.publisher?.name, p.city, p.pubYear].filter(Boolean).join(', ')
    )
    .join('; ');

const cellFor = (book: Book, key: ColumnKey): string => {
  switch (key) {
    case 'title':             return dash(book.title);
    case 'authors':           return dash(authorsStr(book));
    case 'bookType':          return dash(book.bookType);
    case 'edit':
      return dash([book.edit, book.editionStatement].filter(Boolean).join(', '));
    case 'series':            return dash(book.series);
    case 'physDesc':          return dash(book.physDesc);
    case 'description':       return dash(book.description);
    case 'bbks':              return dash(bbkStr(book));
    case 'udcs':              return dash(udcStr(book));
    case 'grntis':            return dash(grntiStr(book));
    case 'publicationPlaces': return dash(pubStr(book));
    default:                  return '—';
  }
};

/* ─────────── компонент ─────────── */
const PrintBooksSlip: React.FC<Props> = ({
  search,
  searchColumn,
  onlyAvailable,
  sort,
}) => {
  const [loading, setLoading] = useState(false);

  /** Загружает ровно одну страницу (limit = PAGE_LIMIT). */
  const fetchPageOne = async () => {
    const p = new URLSearchParams();
    p.append('search', search);
    p.append('searchColumn', searchColumn);
    p.append('onlyAvailable', String(onlyAvailable));
    p.append('page', '1');
    p.append('limit', String(PAGE_LIMIT));
    if (sort) p.append('sort', `${sort.field}.${sort.order}`);

    const { data } = await httpClient.get<{ data: Book[]; total: number }>(
      `/books/paginated?${p.toString()}`
    );
    return { books: data.data, total: data.total };
  };

  const handlePrint = async () => {
    try {
      setLoading(true);
      const { books, total } = await fetchPageOne();

      if (!books.length) {
        toast.info('Нет книг для печати');
        return;
      }

      if (total > PAGE_LIMIT) {
        toast.warn(
          `Найдено ${total} записей. Будут напечатаны только первые ${PAGE_LIMIT}.`
        );
      }

      /* ---------- строка с фильтрами ---------- */
      const filters: string[] = [
        `<strong>Колонка поиска:</strong> ${colLabel(searchColumn)}`,
        `<strong>Поиск:</strong> ${search ? `"${search}"` : 'нет'}`,
        `<strong>Только доступные:</strong> ${onlyAvailable ? 'да' : 'нет'}`,
      ];
      if (sort) {
        filters.push(
          `<strong>Сортировка:</strong> ${colLabel(sort.field)} ${
            sort.order === 'asc' ? '▲' : '▼'
          }`
        );
      }

      /* ---------- построение HTML ---------- */
      const headerRow = COLUMNS.map(c => `<th>${c.label}</th>`).join('');
      const bodyRows = books
        .map(b => `<tr>${COLUMNS.map(c => `<td>${cellFor(b, c.key)}</td>`).join('')}</tr>`)
        .join('');

      const html = `
<!doctype html><html lang="ru"><head><meta charset="utf-8" />
<title>Список книг — печать</title>
<style>
  body{font-family:sans-serif;font-size:10pt;margin:20px;}
  h2{margin:0 0 12px;}
  table{width:100%;border-collapse:collapse;font-size:9pt;}
  th,td{border:1px solid #000;padding:4px;vertical-align:top;}
  th{background:#f3f3f3;}
  @media print { thead {display: table-header-group;} }
</style></head><body>
  <h2>Список книг (показано: ${books.length}${total > PAGE_LIMIT ? ` из ${total}` : ''})</h2>
  <p>${filters.join(' | ')}</p>

  <table>
    <thead><tr>${headerRow}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body></html>`;

      const w = window.open('', '_blank', 'width=1000,height=700');
      if (!w) return;
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
    } catch (err) {
      console.error(err);
      toast.error('Не удалось подготовить список для печати');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handlePrint}
      disabled={loading}
      className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 text-sm font-medium mr-2"
      title="Печать всех найденных книг"
    >
      {loading ? 'Печать…' : (
        <>
          <Printer className="inline-block w-4 h-4 mr-1" />
          Печать
        </>
      )}
    </button>
  );
};

export default PrintBooksSlip;