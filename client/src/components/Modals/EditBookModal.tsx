// src/components/EditBookModal.tsx
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-toastify';
import { X } from 'lucide-react';

import Chip from '../Chip.tsx';
import AddButton from '../AddButton.tsx';
import BaseDialog from '../BaseDialog.tsx';

import AddAuthorDialog from './Dialogs/AddAuthorDialog.tsx';
import AddBbkDialog, { ClassCode } from './Dialogs/AddBbkDialog.tsx';
import AddUdkDialog from './Dialogs/AddUdkDialog.tsx';
import AddGrntiDialog from './Dialogs/AddGrntiDialog.tsx';
import AddPublisherDialog, { Publisher } from './Dialogs/AddPublisherDialog.tsx';

import httpClient from '../../utils/httpsClient.tsx';
import { Author, Book, FormValues, bookSchema } from '../../utils/interfaces.tsx';

export interface EditBookModalProps {
  book: Book | null;
  onClose: () => void;
  onSaved: () => void;
}

const classifierFieldMap: Record<string, keyof FormValues> = {
  ББК: 'bbkAbbs',
  УДК: 'udcAbbs',
  ГРНТИ: 'grntiAbbs',
};

const inputBase =
  'rounded border px-2 py-1 text-sm transition-colors focus:outline-none focus:border-emerald-500';

const AddBtn: React.FC<{ onClick: () => void; ariaLabel: string }> = ({ onClick, ariaLabel }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={ariaLabel}
    className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-gray-400 text-gray-500 transition-colors hover:bg-emerald-100 hover:text-emerald-600 hover:border-emerald-500"
  >
    +
  </button>
);

const EditBookModal: React.FC<EditBookModalProps> = ({ book, onClose, onSaved }) => {
  const [fullBook, setFullBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [authorsList, setAuthorsList] = useState<Author[]>([]);
  const [bbkList, setBbkList] = useState<ClassCode[]>([]);
  const [udcList, setUdcList] = useState<ClassCode[]>([]);
  const [grntiList, setGrntiList] = useState<ClassCode[]>([]);
  const [publisher, setPublisher] = useState<Publisher | null>(null);

  const [dlgAuthor, setDlgAuthor] = useState(false);
  const [dlgBbk, setDlgBbk] = useState(false);
  const [dlgUdk, setDlgUdk] = useState(false);
  const [dlgGrnti, setDlgGrnti] = useState(false);
  const [dlgPublisher, setDlgPublisher] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(bookSchema),
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!book) return;
    (async () => {
      setIsLoading(true);
      try {
        const { data } = await httpClient.get(`/books/${book.id}`);
        setFullBook(data as Book);
      } catch {
        toast.error('Не удалось загрузить данные книги');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [book]);

  useEffect(() => {
    if (!fullBook) return;
    reset({
      title: fullBook.title ?? '',
      bookType: fullBook.bookType ?? '',
      edit: fullBook.edit ?? '',
      editionStatement: fullBook.editionStatement ?? '',
      series: fullBook.series ?? '',
      physDesc: fullBook.physDesc ?? '',
      description: fullBook.description ?? '',
      authors: '',
      bbkAbbs: '',
      udcAbbs: '',
      grntiAbbs: '',
      pubCity: fullBook.publicationPlaces?.[0]?.city ?? '',
      pubName: fullBook.publicationPlaces?.[0]?.publisher?.name ?? '',
      pubYear: fullBook.publicationPlaces?.[0]?.pubYear ?? undefined,
    });
    setAuthorsList(fullBook.authors ?? []);
    setBbkList((fullBook.bbks ?? []).map((b, i) => ({ id: b.id ?? i, code: b.bbkAbb })));
    setUdcList((fullBook.udcs ?? []).map((u, i) => ({ id: u.id ?? i, code: u.udcAbb })));
    setGrntiList((fullBook.grntis ?? []).map((g, i) => ({ id: g.id ?? i, code: g.code })));
    setPublisher(
      fullBook.publicationPlaces?.[0]?.publisher
        ? {
            id: fullBook.publicationPlaces[0].publisher.id,
            name: fullBook.publicationPlaces[0].publisher.name,
          }
        : null,
    );
  }, [fullBook, reset]);

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

  const submit = handleSubmit(async values => {
    if (!fullBook) return;
    const dto: Record<string, any> = {};

    (
      ['title', 'bookType', 'edit', 'editionStatement', 'series', 'physDesc', 'description'] as const
    ).forEach(k => {
      const v = values[k]?.trim?.() ?? '';
      if (v) dto[k] = v;
    });

    if (authorsList.length) dto.authorsIds = authorsList.map(a => a.id);
    if (bbkList.length) dto.bbkAbbs = bbkList.map(b => b.code);
    if (udcList.length) dto.udcAbbs = udcList.map(u => u.code);
    if (grntiList.length) dto.grntiCodes = grntiList.map(g => g.code);

    const city = values.pubCity?.trim();
    const publisherName = publisher?.name ?? values.pubName?.trim();
    const pubYear = values.pubYear;

    if (city || publisherName || pubYear) {
      dto.pubPlaces = [{ city, publisherName, pubYear }];
    }

    try {
      await httpClient.put(`/books/${fullBook.id}`, dto);
      toast.success(`Книга №${fullBook.id} сохранена`);
      onSaved();
    } catch {
      toast.error('Не удалось сохранить книгу');
    }
  });

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
        form="edit-book-form"
        className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Сохранение…' : 'Сохранить'}
      </button>
    </>
  );

  return (
    <BaseDialog
      open={!!book}
      onOpenChange={v => !v && onClose()}
      title={book ? `Редактировать книгу №${book.id}` : ''}
      widthClass="max-w-2xl"
      footer={footer}
    >
      {isLoading ? (
        <p className="p-4 text-center text-sm text-gray-500">Загрузка данных книги…</p>
      ) : (
        fullBook && (
          <form id="edit-book-form" onSubmit={submit} className="space-y-3">
            {(
              [
                { name: 'title', label: 'Название *' },
                { name: 'bookType', label: 'Тип' },
                { name: 'edit', label: 'Редактор' },
                { name: 'editionStatement', label: 'Сведения об изд.' },
                { name: 'series', label: 'Серия' },
                { name: 'physDesc', label: 'Характеристики (страницы, иллюстрации и т.д.)' },
                { name: 'description', label: 'Описание' },
              ] as const
            ).map(f => (
              <div key={f.name}>
                <label className="block text-sm mb-1">{f.label}</label>
                <input
                  {...register(f.name, f.name === 'title' ? { required: true } : undefined)}
                  className={`w-full ${inputBase}`}
                  required={f.name === 'title'}
                />
              </div>
            ))}

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
                <AddBtn onClick={() => setDlgAuthor(true)} ariaLabel="Добавить автора" />
              </div>
            </div>

            {[
              { list: bbkList, set: setBbkList, open: () => setDlgBbk(true), label: 'ББК' },
              { list: udcList, set: setUdcList, open: () => setDlgUdk(true), label: 'УДК' },
              { list: grntiList, set: setGrntiList, open: () => setDlgGrnti(true), label: 'ГРНТИ' },
            ].map(({ list, set, open, label }) => (
              <div key={label}>
                <label className="block text-sm mb-1">{label}</label>
                <input type="hidden" {...register(classifierFieldMap[label])} />
                <div className="flex flex-wrap gap-2">
                  {list.map(i => (
                    <Chip
                      key={i.id}
                      label={i.code}
                      onRemove={() => set(l => l.filter(x => x.id !== i.id))}
                    />
                  ))}
                  <AddBtn onClick={open} ariaLabel={`Добавить ${label}`} />
                </div>
              </div>
            ))}

            <div>
              <label className="block text-sm mb-1">Издательство "Город, Издатель, Год"</label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  placeholder="Город"
                  {...register('pubCity')}
                  className={inputBase}
                />
                <div className="flex items-center gap-1">
                  <input type="hidden" {...register('pubName')} />
                  <input
                    value={publisher?.name ?? ''}
                    onChange={e => {
                      setPublisher(p =>
                        p ? { ...p, name: e.target.value } : { id: 0, name: e.target.value },
                      );
                      setValue('pubName', e.target.value, { shouldValidate: true });
                    }}
                    onClick={() => setDlgPublisher(true)}
                    placeholder="Издатель"
                    className={`flex-1 ${inputBase}`}
                  />
                  {publisher && (
                    <button
                      type="button"
                      onClick={() => setPublisher(null)}
                      aria-label="Очистить издателя"
                      className="h-7 w-7 flex items-center justify-center rounded text-gray-500 hover:text-red-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  placeholder="Год"
                  {...register('pubYear', { setValueAs: v => (v === '' ? undefined : Number(v)) })}
                  className={inputBase}
                />
              </div>
            </div>
          </form>
        )
      )}

      <AddAuthorDialog
        open={dlgAuthor}
        onClose={() => setDlgAuthor(false)}
        onPick={a => setAuthorsList(list => (list.some(x => x.id === a.id) ? list : [...list, a]))}
      />
      <AddBbkDialog
        open={dlgBbk}
        onClose={() => setDlgBbk(false)}
        onPick={c => setBbkList(list => (list.some(x => x.id === c.id) ? list : [...list, c]))}
      />
      <AddUdkDialog
        open={dlgUdk}
        onClose={() => setDlgUdk(false)}
        onPick={c => setUdcList(list => (list.some(x => x.id === c.id) ? list : [...list, c]))}
      />
      <AddGrntiDialog
        open={dlgGrnti}
        onClose={() => setDlgGrnti(false)}
        onPick={c => setGrntiList(list => (list.some(x => x.id === c.id) ? list : [...list, c]))}
      />
      <AddPublisherDialog
        open={dlgPublisher}
        onClose={() => setDlgPublisher(false)}
        onPick={p => setPublisher(p)}
      />
    </BaseDialog>
  );
};

export default EditBookModal;