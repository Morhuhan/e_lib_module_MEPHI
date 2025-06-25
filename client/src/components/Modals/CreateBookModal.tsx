import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-toastify';
import { X } from 'lucide-react';

import Chip from '../Chip.tsx';
import AddButton from '../AddButton.tsx';

import AddUdkDialog    from './Dialogs/AddUdkDialog.tsx';
import AddGrntiDialog  from './Dialogs/AddGrntiDialog.tsx';

import httpClient from '../../utils/httpsClient.tsx';
import {
  Author,
  FormValues,
  Publisher,
  bookSchema,
} from '../../utils/interfaces.tsx';
import BaseDialog from '../BaseDialog.tsx';
import AddBbkDialog, { ClassCode } from './Dialogs/AddBbkDialog.tsx';
import AddAuthorDialog from './Dialogs/AddAuthorDialog.tsx';
import AddPublisherDialog from './Dialogs/AddPublisherDialog.tsx';

export interface CreateBookModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const inputBase =
  'rounded border px-2 py-1 text-sm transition-colors focus:outline-none focus:border-emerald-500';

const CreateBookModal: React.FC<CreateBookModalProps> = ({
  open,
  onClose,
  onCreated,
}) => {
  /* ───────── state ───────── */
  const [authorsList, setAuthorsList] = useState<Author[]>([]);
  const [bbkList,  setBbkList]  = useState<ClassCode[]>([]);
  const [udcList,  setUdcList]  = useState<ClassCode[]>([]);
  const [grntiList,setGrntiList] = useState<ClassCode[]>([]);
  const [publisher, setPublisher] = useState<Publisher | null>(null);

  const [addAuthorDlgOpen,   setAddAuthorDlgOpen]   = useState(false);
  const [addBbkDlgOpen,      setAddBbkDlgOpen]      = useState(false);
  const [addUdkDlgOpen,      setAddUdkDlgOpen]      = useState(false);
  const [addGrntiDlgOpen,    setAddGrntiDlgOpen]    = useState(false);
  const [addPublisherDlgOpen,setAddPublisherDlgOpen]= useState(false);

  /* ───────── form ───────── */
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(bookSchema),
    mode: 'onBlur',
    defaultValues: {
      title: '',
      bookType: '',
      edit: '',
      editionStatement: '',
      series: '',
      physDesc: '',
      description: '',
      authors: '',
      bbkAbbs: '',
      udcAbbs: '',
      grntiAbbs: '',
      pubCity: '',
      pubName: '',
      pubYear: undefined,
    },
  });

  /* ───────── keep hidden fields up-to-date ───────── */
  useEffect(() => {
    const names = authorsList
      .map(a => [a.lastName, a.firstName, a.patronymic].filter(Boolean).join(' ').trim())
      .join('; ');
    setValue('authors', names, { shouldValidate: false });
  }, [authorsList, setValue]);

  useEffect(() => {
    setValue('bbkAbbs', bbkList.map(b => b.code).join(', '), { shouldValidate: false });
  }, [bbkList, setValue]);

  useEffect(() => {
    setValue('udcAbbs', udcList.map(u => u.code).join(', '), { shouldValidate: false });
  }, [udcList, setValue]);

  useEffect(() => {
    setValue('grntiAbbs', grntiList.map(g => g.code).join(', '), { shouldValidate: false });
  }, [grntiList, setValue]);

  useEffect(() => {
    setValue('pubName', publisher?.name ?? '', { shouldValidate: false });
  }, [publisher, setValue]);

  /* ───────── submit ───────── */
  const submit = handleSubmit(async values => {
    const dto: Record<string, any> = {};

    (
      ['title', 'bookType', 'edit', 'editionStatement', 'series', 'physDesc', 'description'] as const
    ).forEach(k => {
      const v = values[k]?.trim?.() ?? '';
      if (v) dto[k] = v;
    });

    if (authorsList.length) dto.authorsIds = authorsList.map(a => a.id);
    if (bbkList.length)    dto.bbkAbbs    = bbkList.map(b => b.code);
    if (udcList.length)    dto.udcAbbs    = udcList.map(u => u.code);
    if (grntiList.length)  dto.grntiCodes = grntiList.map(g => g.code);

    const city          = values.pubCity?.trim();
    const publisherName = publisher?.name ?? values.pubName?.trim();
    const pubYear       = values.pubYear;
    if (city || publisherName || pubYear) {
      dto.pubPlaces = [{ city, publisherName, pubYear }];
    }

    try {
      const { data } = await httpClient.post('/books', dto);
      toast.success(`Книга №${data.id} создана`);
      onCreated();
      reset();
      setAuthorsList([]);
      setBbkList([]); setUdcList([]); setGrntiList([]);
      setPublisher(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Не удалось создать книгу (см. консоль)';
      console.error(err);
      toast.error(msg);
    }
  });

  /* ───────── footer (всегда виден) ───────── */
  const footer = (
    <>
      <button
        type="button"
        className="rounded bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300"
        onClick={onClose}
        disabled={isSubmitting}
      >
        Отмена
      </button>
      <button
        type="submit"
        form="create-book-form"
        className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Создание…' : 'Сохранить'}
      </button>
    </>
  );

  /* ───────── UI ───────── */
  return (
    <>
      <BaseDialog
        open={open}
        onOpenChange={v => !v && onClose()}
        title="Новая книга"
        widthClass="max-w-2xl"
        footer={footer}
      >
        <form
          id="create-book-form"
          onSubmit={submit}
          className="space-y-3"
        >
          {/* ───── простые поля ───── */}
          {(
            [
              { name: 'title',            label: 'Название *' },
              { name: 'bookType',         label: 'Тип' },
              { name: 'edit',             label: 'Редактор' },
              { name: 'editionStatement', label: 'Сведения об изд.' },
              { name: 'series',           label: 'Серия' },
              { name: 'physDesc',         label: 'Характеристики (страницы, иллюстрации и т.д.)' },
              { name: 'description',      label: 'Описание' },
            ] as const
          ).map(f => (
            <div key={f.name}>
              <label className="block text-sm mb-1">{f.label}</label>
              <input
                {...register(f.name)}
                className="w-full rounded border px-2 py-1 text-sm"
                required={f.name === 'title'}
              />
            </div>
          ))}

          {/* ───── авторы ───── */}
          <div>
            <label className="block text-sm mb-1">Авторы</label>
            <input type="hidden" {...register('authors')} />
            <div className="flex flex-wrap gap-2">
              {authorsList.map(a => {
                const label = [a.lastName, a.firstName, a.patronymic].filter(Boolean).join(' ');
                return (
                  <Chip
                    key={a.id}
                    label={label}
                    onRemove={() => setAuthorsList(list => list.filter(x => x.id !== a.id))}
                  />
                );
              })}
              <AddButton onClick={() => setAddAuthorDlgOpen(true)} ariaLabel="Добавить автора" />
            </div>
          </div>

          {/* ───── BBK ───── */}
          <div>
            <label className="block text-sm mb-1">ББК</label>
            <input type="hidden" {...register('bbkAbbs')} />
            <div className="flex flex-wrap gap-2">
              {bbkList.map(b => (
                <Chip
                  key={b.id}
                  label={b.code}
                  onRemove={() => setBbkList(list => list.filter(x => x.id !== b.id))}
                />
              ))}
              <AddButton onClick={() => setAddBbkDlgOpen(true)} ariaLabel="Добавить ББК" />
            </div>
          </div>

          {/* ───── UDC ───── */}
          <div>
            <label className="block text-sm mb-1">УДК</label>
            <input type="hidden" {...register('udcAbbs')} />
            <div className="flex flex-wrap gap-2">
              {udcList.map(u => (
                <Chip
                  key={u.id}
                  label={u.code}
                  onRemove={() => setUdcList(list => list.filter(x => x.id !== u.id))}
                />
              ))}
              <AddButton onClick={() => setAddUdkDlgOpen(true)} ariaLabel="Добавить УДК" />
            </div>
          </div>

          {/* ───── GRNTI ───── */}
          <div>
            <label className="block text-sm mb-1">ГРНТИ</label>
            <input type="hidden" {...register('grntiAbbs')} />
            <div className="flex flex-wrap gap-2">
              {grntiList.map(g => (
                <Chip
                  key={g.id}
                  label={g.code}
                  onRemove={() => setGrntiList(list => list.filter(x => x.id !== g.id))}
                />
              ))}
              <AddButton onClick={() => setAddGrntiDlgOpen(true)} ariaLabel="Добавить ГРНТИ" />
            </div>
          </div>

          {/* ───── издательство ───── */}
          <div>
            <label className="block text-sm mb-1">
              Издательство "Город, Издатель, Год"
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* city */}
              <input
                placeholder="Город"
                {...register('pubCity')}
                className={inputBase}
              />

              {/* publisher picker */}
              <div className="flex items-center gap-1">
                <input type="hidden" {...register('pubName')} />
                <input
                  value={publisher?.name ?? ''}
                  onChange={e => {
                    setPublisher(p =>
                      p ? { ...p, name: e.target.value } : { id: 0, name: e.target.value }
                    );
                    setValue('pubName', e.target.value, { shouldValidate: true });
                  }}
                  onClick={() => setAddPublisherDlgOpen(true)}
                  placeholder="Издатель"
                  className={`flex-1 ${inputBase}`}
                />
                {publisher && (
                  <button
                    type="button"
                    onClick={() => {
                      setPublisher(null);
                      setValue('pubName', '', { shouldValidate: true });
                    }}
                    aria-label="Очистить издателя"
                    className="flex items-center justify-center rounded text-gray-500 hover:text-red-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <input
                type="number"
                placeholder="Год"
                {...register('pubYear', {
                  setValueAs: v => (v === '' ? undefined : Number(v)),
                })}
                className={inputBase}
              />
            </div>
          </div>
        </form>
      </BaseDialog>

      <AddAuthorDialog
        open={addAuthorDlgOpen}
        onClose={() => setAddAuthorDlgOpen(false)}
        onPick={a =>
          setAuthorsList(list => (list.some(x => x.id === a.id) ? list : [...list, a]))
        }
      />

      <AddBbkDialog
        open={addBbkDlgOpen}
        onClose={() => setAddBbkDlgOpen(false)}
        onPick={c =>
          setBbkList(list => (list.some(x => x.id === c.id) ? list : [...list, c]))
        }
      />

      <AddUdkDialog
        open={addUdkDlgOpen}
        onClose={() => setAddUdkDlgOpen(false)}
        onPick={c =>
          setUdcList(list => (list.some(x => x.id === c.id) ? list : [...list, c]))
        }
      />

      <AddGrntiDialog
        open={addGrntiDlgOpen}
        onClose={() => setAddGrntiDlgOpen(false)}
        onPick={c =>
          setGrntiList(list => (list.some(x => x.id === c.id) ? list : [...list, c]))
        }
      />

      <AddPublisherDialog
        open={addPublisherDlgOpen}
        onClose={() => setAddPublisherDlgOpen(false)}
        onPick={p => setPublisher(p)}
      />
    </>
  );
};

export default CreateBookModal;