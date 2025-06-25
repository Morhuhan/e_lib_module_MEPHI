// src/components/CreateCopyModal.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-toastify';
import AddBookDialog, { BookPick } from './Dialogs/AddBookDialog.tsx';
import { CopyFormValues, copySchema } from '../../utils/interfaces.tsx';
import httpClient from '../../utils/httpsClient.tsx';
import BaseDialog from '../BaseDialog.tsx';


export interface CreateCopyModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const CreateCopyModal: React.FC<CreateCopyModalProps> = ({
  open,
  onClose,
  onCreated,
}) => {
  const [bookDlgOpen, setBookDlgOpen] = useState(false);
  const [pickedBook, setPickedBook]   = useState<BookPick | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm<CopyFormValues>({
    resolver: zodResolver(copySchema),
    mode: 'onBlur',
    defaultValues: {
      bookId      : undefined,
      inventoryNo : '',
      receiptDate : '',
      storagePlace: '',
      price       : undefined,
    },
  });

  useEffect(() => {
    if (!open) {
      reset();
      setPickedBook(null);
    }
  }, [open, reset]);

  const handleBookPick = (b: BookPick) => {
    setPickedBook(b);
    setValue('bookId', b.id, { shouldValidate: true });
  };

  const submit = handleSubmit(async values => {
    if (!pickedBook) {
      toast.error('Выберите книгу');
      return;
    }

    try {
      await httpClient.post('/book-copies', values);
      toast.success('Экземпляр создан');
      onCreated();
      reset();
      setPickedBook(null);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Не удалось создать экземпляр';
      console.error(err);
      toast.error(msg);
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
        form="create-copy-form"
        className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Создание…' : 'Создать'}
      </button>
    </>
  );

  return (
    <>
      <BaseDialog
        open={open}
        onOpenChange={v => !v && onClose()}
        title="Новый экземпляр"
        widthClass="max-w-md"
        footer={footer}
      >
        <form id="create-copy-form" onSubmit={submit} className="space-y-3">
          <input type="hidden" {...register('bookId', { valueAsNumber: true, required: true })} />

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
              {...register('inventoryNo', { required: true })}
              className="w-full rounded border px-2 py-1 text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm mb-1">Дата поступления</label>
              <input
                type="date"
                {...register('receiptDate', { setValueAs: v => (v === '' ? undefined : v) })}
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
                {...register('price', { setValueAs: v => (v === '' ? undefined : parseFloat(v)) })}
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
      </BaseDialog>

      <AddBookDialog
        open={bookDlgOpen}
        onClose={() => setBookDlgOpen(false)}
        onPick={handleBookPick}
      />
    </>
  );
};

export default CreateCopyModal;