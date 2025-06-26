// src/components/EditAuthorModal.tsx
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

import BaseDialog from '../BaseDialog.tsx';
import httpClient from '../../utils/httpsClient.tsx';
import { Author } from '../../utils/interfaces.tsx';

export interface EditAuthorModalProps {
  author: Author | null;
  onClose: () => void;
  onSaved: (a: Author) => void;
}

const inputCls =
  'w-full rounded border px-2 py-1 text-sm transition-colors focus:outline-none focus:border-emerald-500';

const EditAuthorModal: React.FC<EditAuthorModalProps> = ({
  author,
  onClose,
  onSaved,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<Author>();

  useEffect(() => {
    if (author) {
      reset({
        lastName: author.lastName ?? '',
        firstName: author.firstName ?? '',
        patronymic: author.patronymic ?? '',
        birthYear: author.birthYear ?? undefined,
      });
    }
  }, [author, reset]);

  const submit = handleSubmit(async (vals) => {
    if (!author) return;
    try {
      const { data } = await httpClient.put(`/authors/${author.id}`, {
        lastName: vals.lastName?.trim(),
        firstName: vals.firstName?.trim(),
        patronymic: vals.patronymic?.trim(),
        birthYear: vals.birthYear || undefined,
      });
      toast.success('Автор сохранён');
      onSaved(data);
      onClose();
    } catch {
      toast.error('Не удалось сохранить автора');
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
        form="edit-author-form"
        className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Сохранение…' : 'Сохранить'}
      </button>
    </>
  );

  return (
    <BaseDialog
      open={!!author}
      onOpenChange={(v) => !v && onClose()}
      title={author ? `Изменить автора №${author.id}` : ''}
      widthClass="max-w-sm"
      footer={footer}
    >
      {author && (
        <form
          id="edit-author-form"
          onSubmit={submit}
          className="space-y-3"
        >
          {[
            { name: 'lastName', label: 'Фамилия *' },
            { name: 'firstName', label: 'Имя' },
            { name: 'patronymic', label: 'Отчество' },
            { name: 'birthYear', label: 'Год рождения', type: 'number' },
          ].map((f) => (
            <div key={f.name}>
              <label className="block text-sm mb-1">{f.label}</label>
              <input
                {...register(f.name as keyof Author, f.name === 'lastName' ? { required: true } : {})}
                type={f.type ?? 'text'}
                className={inputCls}
                required={f.name === 'lastName'}
              />
            </div>
          ))}
        </form>
      )}
    </BaseDialog>
  );
};

export default EditAuthorModal;