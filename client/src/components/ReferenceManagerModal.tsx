import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import httpClient from '../utils/httpsClient.tsx';
import BaseDialog from './BaseDialog.tsx';

export type EntityKey = 'authors' | 'bbk' | 'udc' | 'grnti' | 'publishers';

interface CommonItem { id?: number; [k: string]: any }
interface FieldDef   { key: string; label: string; type?: 'text' | 'number' }

const ENTITIES: Record<EntityKey, {
  label: string;
  endpoint: string;
  searchFields: FieldDef[];
  formFields: FieldDef[];
}> = {
  authors: {
    label: 'Авторы',
    endpoint: '/authors',
    searchFields: [
      { key: 'lastName',  label: 'Фамилия' },
      { key: 'firstName', label: 'Имя' },
      { key: 'patronymic',label: 'Отчество' },
      { key: 'birthYear', label: 'Год рожд.', type: 'number' },
    ],
    formFields: [
      { key: 'lastName',  label: 'Фамилия' },
      { key: 'firstName', label: 'Имя' },
      { key: 'patronymic',label: 'Отчество' },
      { key: 'birthYear', label: 'Год рождения', type: 'number' },
    ],
  },
  bbk: {
    label: 'ББК',
    endpoint: '/bbk',
    searchFields: [
      { key: 'bbkAbb',     label: 'Аббр.' },
      { key: 'description',label: 'Описание' },
    ],
    formFields: [
      { key: 'bbkAbb',     label: 'Аббревиатура' },
      { key: 'description',label: 'Описание' },
    ],
  },
  udc: {
    label: 'УДК',
    endpoint: '/udc',
    searchFields: [
      { key: 'udcAbb',     label: 'Аббр.' },
      { key: 'description',label: 'Описание' },
    ],
    formFields: [
      { key: 'udcAbb',     label: 'Аббревиатура' },
      { key: 'description',label: 'Описание' },
    ],
  },
  grnti: {
    label: 'ГРНТИ',
    endpoint: '/grnti',
    searchFields: [
      { key: 'code',       label: 'Код' },
      { key: 'description',label: 'Описание' },
    ],
    formFields: [
      { key: 'code',       label: 'Код' },
      { key: 'description',label: 'Описание' },
    ],
  },
  publishers: {
    label: 'Издательства',
    endpoint: '/publishers',
    searchFields: [
      { key: 'name', label: 'Название' },
    ],
    formFields: [
      { key: 'name', label: 'Название' },
    ],
  },
};

const DEBOUNCE_MS = 400;

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
  const [entity, setEntity]           = useState<EntityKey>('authors');
  const [searchField, setSearchField] = useState(ENTITIES['authors'].searchFields[0].key);
  const [search, setSearch]           = useState('');
  const [data, setData]               = useState<CommonItem[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [editing, setEditing]         = useState<CommonItem | null>(null);
  const [formVals, setFormVals]       = useState<Record<string, string>>({});

  /* ─── инициализация при открытии ─── */
  useEffect(() => {
    if (!open) return;
    if (initialEntity)      setEntity(initialEntity);
    if (initialSearchField) setSearchField(initialSearchField);
    if (initialSearch !== undefined) setSearch(initialSearch);
  }, [open, initialEntity, initialSearchField, initialSearch]);

  /* ─── сброс полей при смене справочника ─── */
  useEffect(() => {
    const firstKey = ENTITIES[entity].searchFields[0].key;
    setSearchField(firstKey);
    setEditing(null);
  }, [entity]);

  /* ─── загрузка данных ─── */
  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const { endpoint } = ENTITIES[entity];
        const p = new URLSearchParams();
        if (search.trim()) {
          p.append('search',      search.trim());
          p.append('searchField', searchField);
        }
        const { data } = await httpClient.get(`${endpoint}?${p.toString()}`, { signal: ctrl.signal });
        setData(data as CommonItem[]);
      } catch {
        setError('Не удалось загрузить данные');
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [entity, search, searchField, open]);

  /* ─── CRUD ─── */
  const remove = useCallback(async (it: CommonItem) => {
    if (!window.confirm('Удалить выбранную запись?')) return;
    try {
      await httpClient.delete(`${ENTITIES[entity].endpoint}/${it.id}`);
      toast.success('Удалено');
      setData(d => d.filter(x => x.id !== it.id));
    } catch {
      toast.error('Не удалось удалить');
    }
  }, [entity]);

  const save = useCallback(async () => {
    const { endpoint } = ENTITIES[entity];
    const payload: Record<string, any> = { ...formVals };
    const id = editing?.id;
    try {
      if (id) {
        await httpClient.put(`${endpoint}/${id}`, payload);
        setData(d => d.map(x => x.id === id ? { ...x, ...payload } : x));
        toast.success('Обновлено');
      } else {
        const { data: created } = await httpClient.post(endpoint, payload);
        setData(d => [...d, created]);
        toast.success('Создано');
      }
      setEditing(null);
    } catch {
      toast.error('Не удалось сохранить');
    }
  }, [entity, editing, formVals]);

  /* ─── таблица результатов ─── */
  const itemsView = useMemo(() => {
    if (loading)      return <p className="p-4 text-center text-sm">Загрузка…</p>;
    if (error)        return <p className="p-4 text-center text-sm text-red-600">{error}</p>;
    if (!data.length) return <p className="p-4 text-center text-sm">Ничего не найдено</p>;

    const fields = ENTITIES[entity].formFields;

    return (
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            {fields.map(f => (
              <th key={f.key} className="px-2 py-1 text-left border-b font-medium">{f.label}</th>
            ))}
            <th className="px-2 py-1 border-b font-medium">Действия</th>
          </tr>
        </thead>
        <tbody>
          {data.map(it => (
            <tr key={it.id} className="border-b last:border-0">
              {fields.map(f => (
                <td key={f.key} className="px-2 py-1">{it[f.key]}</td>
              ))}
              <td className="px-2 py-1 whitespace-nowrap space-x-2">
                <button
                  className="px-2 py-0.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                  onClick={() => {
                    setEditing(it);
                    setFormVals(fields.reduce<Record<string, string>>(
                      (acc, f) => ({ ...acc, [f.key]: it[f.key] ?? '' }), {},
                    ));
                  }}
                >Изм</button>
                <button
                  className="px-2 py-0.5 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                  onClick={() => remove(it)}
                >Удл</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }, [loading, error, data, entity, remove]);

  /* ─── форма редактирования ─── */
  const editDrawer = editing !== null && (
    <div className="border-t pt-3 mt-3 space-y-3">
      <h4 className="font-medium text-sm">
        {editing?.id ? `Изменить (id ${editing.id})` : 'Создать новую'}
      </h4>
      {ENTITIES[entity].formFields.map(f => (
        <div key={f.key}>
          <label className="block text-xs mb-0.5">{f.label}</label>
          <input
            type={f.type ?? 'text'}
            value={formVals[f.key] ?? ''}
            onChange={e => setFormVals(v => ({ ...v, [f.key]: e.target.value }))}
            className="w-full border rounded px-2 py-1 text-sm pr-8"
          />
        </div>
      ))}
      <div className="flex justify-end gap-2 pt-1">
        <button
          className="rounded bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300"
          onClick={() => setEditing(null)}
        >
          Отмена
        </button>
        <button
          className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
          onClick={save}
        >
          Сохранить
        </button>
      </div>
    </div>
  );

  /* ─── рендер ─── */
  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className="flex items-center gap-3">
          <h2>Управление справочниками</h2>
          <select
            value={entity}
            onChange={e => setEntity(e.target.value as EntityKey)}
            className="border rounded px-2 py-1 text-sm pr-8"
          >
            {Object.entries(ENTITIES).map(([k, v]) =>
              <option key={k} value={k}>{v.label}</option>,
            )}
          </select>
        </div>
      }
      widthClass="max-w-4xl"
    >
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <select
          value={searchField}
          onChange={e => setSearchField(e.target.value)}
          className="border rounded px-2 py-1 text-sm pr-8"
        >
          {ENTITIES[entity].searchFields.map(f =>
            <option key={f.key} value={f.key}>{f.label}</option>,
          )}
        </select>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск…"
          className="flex-1 border rounded px-2 py-1 text-sm pr-8"
        />
        <button
          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
          onClick={() => {
            setEditing({});
            setFormVals(ENTITIES[entity].formFields.reduce<Record<string, string>>(
              (acc, f) => ({ ...acc, [f.key]: '' }), {},
            ));
          }}
        >＋ Создать</button>
      </div>
      <div className="border rounded max-h-[60vh] overflow-y-auto">{itemsView}</div>
      {editDrawer}
    </BaseDialog>
  );
};

export default ReferenceManagerModal;