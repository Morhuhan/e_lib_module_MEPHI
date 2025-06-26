// src/components/CreateAuthorModal.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

import BaseDialog from '../BaseDialog.tsx';
import httpClient from '../../utils/httpsClient.tsx';
import { Author } from '../../utils/interfaces.tsx';

export interface CreateAuthorModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (a: Author) => void;
}

const inputCls =
  'w-full rounded border px-2 py-1 text-sm transition-colors focus:outline-none focus:border-emerald-500';

const CreateAuthorModal: React.FC<CreateAuthorModalProps> = ({
  open,
  onClose,
  onCreated,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<Author>({
    defaultValues: {
      lastName: '',
      firstName: '',
      patronymic: '',
      birthYear: undefined,
    },
  });

  const submit = handleSubmit(async (vals) => {
    try {
      const { data } = await httpClient.post('/authors', {
        lastName: vals.lastName?.trim(),
        firstName: vals.firstName?.trim(),
        patronymic: vals.patronymic?.trim(),
        birthYear: vals.birthYear || undefined,
      });
      toast.success('Автор создан');
      onCreated(data);
      reset();
      onClose();
    } catch {
      toast.error('Не удалось создать автора');
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
        form="create-author-form"
        className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Создание…' : 'Сохранить'}
      </button>
    </>
  );

  return (
    <BaseDialog
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title="Новый автор"
      widthClass="max-w-sm"
      footer={footer}
    >
      <form
        id="create-author-form"
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
    </BaseDialog>
  );
};

export default CreateAuthorModal;