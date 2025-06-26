// src/components/CreatePublisherModal.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

import BaseDialog from '../BaseDialog.tsx';
import httpClient from '../../utils/httpsClient.tsx';
import { Publisher } from '../../utils/interfaces.tsx';

export interface CreatePublisherModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (p: Publisher) => void;
}

const inputCls =
  'w-full rounded border px-2 py-1 text-sm transition-colors focus:outline-none focus:border-emerald-500';

const CreatePublisherModal: React.FC<CreatePublisherModalProps> = ({
  open,
  onClose,
  onCreated,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<Publisher>({
    defaultValues: { name: '' },
  });

  const submit = handleSubmit(async (vals) => {
    try {
      const { data } = await httpClient.post('/publishers', {
        name: vals.name.trim(),
      });
      toast.success('Издательство создано');
      onCreated(data);
      reset();
      onClose();
    } catch {
      toast.error('Не удалось создать издательство');
    }
  });

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        className="rounded bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300"
        disabled={isSubmitting}
      >
        Отмена
      </button>
      <button
        type="submit"
        form="create-pub-form"
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
      title="Новое издательство"
      widthClass="max-w-sm"
      footer={footer}
    >
      <form
        id="create-pub-form"
        onSubmit={submit}
        className="space-y-3"
      >
        <div>
          <label className="block text-sm mb-1">Название *</label>
          <input
            {...register('name', { required: true })}
            className={inputCls}
            required
          />
        </div>
      </form>
    </BaseDialog>
  );
};

export default CreatePublisherModal;