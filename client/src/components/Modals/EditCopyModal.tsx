// src/components/EditCopyModal.tsx
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-toastify';
import { BookCopy, CopyFormValues, copySchema } from '../../utils/interfaces.tsx';
import AddBookDialog, { BookPick } from './Dialogs/AddBookDialog.tsx';
import httpClient from '../../utils/httpsClient.tsx';
import BaseDialog from '../BaseDialog.tsx';


export interface EditCopyModalProps {
  copy: BookCopy | null;
  onClose: () => void;
  onSaved: () => void;
}

const EditCopyModal: React.FC<EditCopyModalProps> = ({ copy, onClose, onSaved }) => {
  const [fullCopy, setFullCopy] = useState<BookCopy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bookDlgOpen, setBookDlgOpen] = useState(false);
  const [pickedBook, setPickedBook] = useState<BookPick | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm<CopyFormValues>({
    resolver: zodResolver(copySchema),
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!copy) return;
    (async () => {
      setIsLoading(true);
      try {
        const { data } = await httpClient.get(`/book-copies/${copy.id}`);
        setFullCopy(data as BookCopy);
      } catch (err) {
        console.error(err);
        toast.error('Не удалось загрузить экземпляр');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [copy]);

  useEffect(() => {
    if (!fullCopy) return;
    reset({
      bookId: fullCopy.book?.id,
      inventoryNo: fullCopy.inventoryNo ?? '',
      receiptDate: fullCopy.receiptDate?.slice(0, 10),
      storagePlace: fullCopy.storagePlace ?? '',
      price: fullCopy.price ?? undefined,
    });
    if (fullCopy.book) {
      setPickedBook({
        id: fullCopy.book.id,
        title: fullCopy.book.title ?? 'Без названия',
        author: fullCopy.book.authors?.[0]
          ? `${fullCopy.book.authors[0].lastName} ${fullCopy.book.authors[0].firstName}${
              fullCopy.book.authors[0].patronymic ? ` ${fullCopy.book.authors[0].patronymic}` : ''
            }`
          : null,
        publisher: fullCopy.book.publicationPlaces?.[0]?.publisher?.name ?? null,
      });
    }
  }, [fullCopy, reset]);

  const handleBookPick = (b: BookPick) => {
    setPickedBook(b);
    setValue('bookId', b.id, { shouldValidate: true });
  };

  const submit = handleSubmit(async values => {
    if (!fullCopy) return;
    const payload = {
      inventoryNo: values.inventoryNo,
      receiptDate: values.receiptDate,
      storagePlace: values.storagePlace || null,
      price: values.price ?? null,
      ...(values.bookId ? { book: { id: values.bookId } } : {}),
    };
    try {
      await httpClient.put(`/book-copies/${fullCopy.id}`, payload);
      toast.success('Изменения сохранены');
      onSaved();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Не удалось сохранить экземпляр';
      console.error(err);
      toast.error(msg);
    }
  });

  const titleInvNo = fullCopy?.inventoryNo || copy?.inventoryNo || '…';
  const dialogTitle = copy ? `Редактировать экземпляр ${titleInvNo}` : '';

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
        form="edit-copy-form"
        className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Сохранение…' : 'Сохранить'}
      </button>
    </>
  );

  return (
    <>
      <BaseDialog
        open={!!copy}
        onOpenChange={v => !v && onClose()}
        title={dialogTitle}
        widthClass="max-w-md"
        footer={footer}
      >
        {isLoading ? (
          <p className="p-4 text-center text-sm text-gray-500">Загрузка данных…</p>
        ) : (
          fullCopy && (
            <form id="edit-copy-form" onSubmit={submit} className="space-y-3">
              <input
                type="hidden"
                {...register('bookId', { valueAsNumber: true })}
                required
              />

              <div>
                <label className="block text-sm mb-1">Книга *</label>
                {pickedBook ? (
                  <div className="flex items-start justify-between rounded border p-2 text-sm">
                    <div>
                      <strong>{pickedBook.title}</strong><br />
                      {pickedBook.author && pickedBook.author}<br />
                      {pickedBook.publisher && pickedBook.publisher}
                    </div>
                    <button
                      type="button"
                      onClick={() => setBookDlgOpen(true)}
                      className="ml-2 rounded bg-gray-200 px-2 py-1 hover:bg-gray-300"
                    >
                      Изменить
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setBookDlgOpen(true)}
                    className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                  >
                    Выбрать книгу
                  </button>
                )}
                {errors.bookId && (
                  <p className="mt-1 text-sm text-red-600">Необходимо выбрать книгу</p>
                )}
              </div>

              <div>
                <label className="block text-sm mb-1">Инвентарный № *</label>
                <input
                  {...register('inventoryNo')}
                  className="w-full rounded border px-2 py-1 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm mb-1">Дата поступления</label>
                  <input
                    type="date"
                    {...register('receiptDate')}
                    className="w-full rounded border px-2 py-1 text-sm"
                  />
                  {errors.receiptDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.receiptDate.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm mb-1">Цена</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('price', { valueAsNumber: true })}
                    className="w-full rounded border px-2 py-1 text-sm"
                  />
                  {errors.price && (
                    <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1">Место хранения</label>
                <input
                  {...register('storagePlace')}
                  className="w-full rounded border px-2 py-1 text-sm"
                />
                {errors.storagePlace && (
                  <p className="mt-1 text-sm text-red-600">{errors.storagePlace.message}</p>
                )}
              </div>
            </form>
          )
        )}
      </BaseDialog>

      <AddBookDialog
        open={bookDlgOpen}
        onClose={() => setBookDlgOpen(false)}
        onPick={handleBookPick}
      />
    </>
  );
};

export default EditCopyModal;