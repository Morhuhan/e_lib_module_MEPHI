// src/components/ReferenceManagerModal.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'react-toastify';

import BaseDialog from './BaseDialog.tsx';
import httpClient from '../utils/httpsClient.tsx';

/* ─────────────── модалки ─────────────── */
import EditAuthorModal       from './Modals/EditAuthorModal.tsx';
import CreateBbkModal        from './Modals/CreateBbkModal.tsx';
import EditBbkModal          from './Modals/EditBbkModal.tsx';
import CreateUdcModal        from './Modals/CreateUdcModal.tsx';
import EditUdcModal          from './Modals/EditUdcModal.tsx';
import CreateGrntiModal      from './Modals/CreateGrntiModal.tsx';
import EditGrntiModal        from './Modals/EditGrntiModal.tsx';
import CreatePublisherModal  from './Modals/CreatePublisherModal.tsx';
import EditPublisherModal    from './Modals/EditPublisherModal.tsx';
import CreateAuthorModal from './Modals/CreateAuthorModal.tsx';


/* ─────────────────── типы ─────────────────── */
export type EntityKey = 'authors' | 'bbk' | 'udc' | 'grnti' | 'publishers';

interface CommonItem {
  id?: number;
  [k: string]: any;
}

interface FieldDef {
  key: string;
  label: string;
  type?: 'text' | 'number';
}

/* ─────────────────── константы ─────────────────── */
const ENTITIES: Record<
  EntityKey,
  {
    label: string;
    endpoint: string;
    searchFields: FieldDef[];
    formFields: FieldDef[];
  }
> = {
  authors: {
    label: 'Авторы',
    endpoint: '/authors',
    searchFields: [
      { key: 'lastName', label: 'Фамилия' },
      { key: 'firstName', label: 'Имя' },
      { key: 'patronymic', label: 'Отчество' },
      { key: 'birthYear', label: 'Год рожд.', type: 'number' },
    ],
    formFields: [
      { key: 'lastName', label: 'Фамилия' },
      { key: 'firstName', label: 'Имя' },
      { key: 'patronymic', label: 'Отчество' },
      { key: 'birthYear', label: 'Год рождения', type: 'number' },
    ],
  },
  bbk: {
    label: 'ББК',
    endpoint: '/bbk',
    searchFields: [
      { key: 'bbkAbb', label: 'Аббр.' },
      { key: 'description', label: 'Описание' },
    ],
    formFields: [
      { key: 'bbkAbb', label: 'Аббревиатура' },
      { key: 'description', label: 'Описание' },
    ],
  },
  udc: {
    label: 'УДК',
    endpoint: '/udc',
    searchFields: [
      { key: 'udcAbb', label: 'Аббр.' },
      { key: 'description', label: 'Описание' },
    ],
    formFields: [
      { key: 'udcAbb', label: 'Аббревиатура' },
      { key: 'description', label: 'Описание' },
    ],
  },
  grnti: {
    label: 'ГРНТИ',
    endpoint: '/grnti',
    searchFields: [
      { key: 'code', label: 'Код' },
      { key: 'description', label: 'Описание' },
    ],
    formFields: [
      { key: 'code', label: 'Код' },
      { key: 'description', label: 'Описание' },
    ],
  },
  publishers: {
    label: 'Издательства',
    endpoint: '/publishers',
    searchFields: [{ key: 'name', label: 'Название' }],
    formFields: [{ key: 'name', label: 'Название' }],
  },
};

const DEBOUNCE_MS = 400;

/* ─────────────────── кеш ─────────────────── */
let LAST_CACHE: { key: string; data: CommonItem[] } | null = null;
const cacheKey = (entity: EntityKey, field: string, q: string) =>
  `${entity}::${field}::${q.trim()}`;

/* ─────────────────── компонент ─────────────────── */
export interface ReferenceManagerModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialEntity?: EntityKey;
  initialSearchField?: string;
  initialSearch?: string;
}

const ReferenceManagerModal: React.FC<ReferenceManagerModalProps> = ({
  open,
  onOpenChange,
  initialEntity,
  initialSearchField,
  initialSearch,
}) => {
  /* ───────── state ───────── */
  const [entity, setEntity] = useState<EntityKey>('authors');
  const [searchField, setSearchField] = useState(
    ENTITIES['authors'].searchFields[0].key,
  );
  const searchFieldRef = useRef(searchField);

  const [search, setSearch]   = useState('');
  const [data, setData]       = useState<CommonItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem]     = useState<CommonItem | null>(null);

  /* ───────── ref sync ───────── */
  useEffect(() => { searchFieldRef.current = searchField; }, [searchField]);

  /* ───────── init props ───────── */
  useEffect(() => {
    if (!open) return;
    if (initialEntity)      setEntity(initialEntity);
    if (initialSearchField) setSearchField(initialSearchField);
    if (initialSearch !== undefined) setSearch(initialSearch);
  }, [open, initialEntity, initialSearchField, initialSearch]);

  /* ───────── reset field on entity change ───────── */
  useEffect(() => {
    const firstField = ENTITIES[entity].searchFields[0].key;
    searchFieldRef.current = firstField;
    setSearchField(firstField);
  }, [entity]);

  /* ───────── show cache ───────── */
  useEffect(() => {
    if (!open) return;
    const key = cacheKey(entity, searchFieldRef.current, search);
    if (LAST_CACHE && LAST_CACHE.key === key) setData(LAST_CACHE.data);
  }, [open, entity, search]);

  /* ───────── fetch ───────── */
  useEffect(() => {
    if (!open) return;
    const key = cacheKey(entity, searchFieldRef.current, search);
    if (LAST_CACHE && LAST_CACHE.key === key) return;

    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true); setError(null);
      try {
        const { endpoint } = ENTITIES[entity];
        const p = new URLSearchParams();
        if (search.trim()) {
          p.append('search', search.trim());
          p.append('searchField', searchFieldRef.current);
        }
        const { data } = await httpClient.get(`${endpoint}?${p.toString()}`, { signal: ctrl.signal });
        setData(data as CommonItem[]);
        LAST_CACHE = { key, data: data as CommonItem[] };
      } catch {
        setError('Не удалось загрузить данные');
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => { clearTimeout(t); ctrl.abort(); };
  }, [open, entity, search]);

  /* ───────── utils ───────── */
  const invalidateCache = () => { LAST_CACHE = null; };

  const removeItem = useCallback(async (it: CommonItem) => {
    if (!window.confirm('Удалить выбранную запись?')) return;
    try {
      await httpClient.delete(`${ENTITIES[entity].endpoint}/${it.id}`);
      toast.success('Удалено');
      setData(d => d.filter(x => x.id !== it.id));
      invalidateCache();
    } catch {
      toast.error('Не удалось удалить');
    }
  }, [entity]);

  /** используем any, чтобы не конфликтовать с точными типами модалок */
  const handleCreated = (item: any) => {
    setData(d => [...d, item]);
    invalidateCache();
  };

  const handleSaved = (item: any) => {
    setData(d => d.map(x => (x.id === item.id ? item : x)));
    invalidateCache();
  };

  /* ───────── table ───────── */
  const itemsView = useMemo(() => {
    if (loading)  return <p className="p-4 text-center text-sm text-gray-500">Загрузка…</p>;
    if (error)    return <p className="p-4 text-center text-sm text-red-600">{error}</p>;
    if (!data.length)
      return <p className="p-4 text-center text-sm text-gray-500">Ничего не найдено</p>;

    const fields = ENTITIES[entity].formFields;

    return (
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            {fields.map(f => (
              <th key={f.key} className="px-2 py-1 text-left border-b font-medium">
                {f.label}
              </th>
            ))}
            <th className="px-2 py-1 border-b font-medium">Действия</th>
          </tr>
        </thead>
        <tbody>
          {data.map(it => (
            <tr key={it.id} className="border-b last:border-0 hover:bg-gray-50">
              {fields.map(f => (
                <td key={f.key} className="px-2 py-1">
                  {it[f.key]}
                </td>
              ))}
              <td className="px-2 py-1 whitespace-nowrap space-x-2">
                <button
                  className="px-2 py-0.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                  onClick={() => setEditItem(it)}
                >
                  Изм
                </button>
                <button
                  className="px-2 py-0.5 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                  onClick={() => removeItem(it)}
                >
                  Удл
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }, [loading, error, data, entity, removeItem]);

  /* ───────── helpers to render modals ───────── */
  const renderCreateModal = () => {
    switch (entity) {
      case 'authors':
        return (
          <CreateAuthorModal
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            onCreated={handleCreated}
          />
        );
      case 'bbk':
        return (
          <CreateBbkModal
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            onCreated={handleCreated}
          />
        );
      case 'udc':
        return (
          <CreateUdcModal
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            onCreated={handleCreated}
          />
        );
      case 'grnti':
        return (
          <CreateGrntiModal
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            onCreated={handleCreated}
          />
        );
      case 'publishers':
        return (
          <CreatePublisherModal
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            onCreated={handleCreated}
          />
        );
      default: return null;
    }
  };

  const renderEditModal = () => {
    if (!editItem) return null;
    switch (entity) {
      case 'authors':
        return (
          <EditAuthorModal
            author={editItem as any}
            onClose={() => setEditItem(null)}
            onSaved={handleSaved}
          />
        );
      case 'bbk':
        return (
          <EditBbkModal
            bbk={editItem as any}
            onClose={() => setEditItem(null)}
            onSaved={handleSaved}
          />
        );
      case 'udc':
        return (
          <EditUdcModal
            udc={editItem as any}
            onClose={() => setEditItem(null)}
            onSaved={handleSaved}
          />
        );
      case 'grnti':
        return (
          <EditGrntiModal
            grnti={editItem as any}
            onClose={() => setEditItem(null)}
            onSaved={handleSaved}
          />
        );
      case 'publishers':
        return (
          <EditPublisherModal
            publisher={editItem as any}
            onClose={() => setEditItem(null)}
            onSaved={handleSaved}
          />
        );
      default: return null;
    }
  };

  /* ───────── render ───────── */
  return (
    <>
      <BaseDialog
        open={open}
        onOpenChange={onOpenChange}
        widthClass="max-w-4xl"
        title={
          <div className="flex items-center gap-3">
            <h2>Управление справочниками</h2>
            <select
              value={entity}
              onChange={e => setEntity(e.target.value as EntityKey)}
              className="border rounded px-2 py-1 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(ENTITIES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {/* панель поиска */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <select
            value={searchField}
            onChange={e => setSearchField(e.target.value)}
            className="border rounded px-2 py-1 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ENTITIES[entity].searchFields.map(f => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск…"
            className="flex-1 border rounded px-2 py-1 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            onClick={() => setCreateOpen(true)}
          >
            ＋ Создать
          </button>
        </div>

        {/* результаты */}
        <div className="border rounded overflow-y-auto">{itemsView}</div>
      </BaseDialog>

      {/* модалки */}
      {renderCreateModal()}
      {renderEditModal()}
    </>
  );
};

export default ReferenceManagerModal;