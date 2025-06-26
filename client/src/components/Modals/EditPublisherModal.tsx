// src/components/EditPublisherModal.tsx
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

import BaseDialog from '../BaseDialog.tsx';
import httpClient from '../../utils/httpsClient.tsx';
import { Publisher } from '../../utils/interfaces.tsx';

export interface EditPublisherModalProps {
  publisher: Publisher | null;
  onClose: () => void;
  onSaved: (p: Publisher) => void;
}

const inputCls =
  'w-full rounded border px-2 py-1 text-sm transition-colors focus:outline-none focus:border-emerald-500';

const EditPublisherModal: React.FC<EditPublisherModalProps> = ({
  publisher,
  onClose,
  onSaved,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<Publisher>();

  useEffect(() => {
    if (publisher) reset({ name: publisher.name });
  }, [publisher, reset]);

  const submit = handleSubmit(async (vals) => {
    if (!publisher) return;
    try {
      const { data } = await httpClient.put(`/publishers/${publisher.id}`, {
        name: vals.name.trim(),
      });
      toast.success('Издательство сохранено');
      onSaved(data);
      onClose();
    } catch {
      toast.error('Не удалось сохранить издательство');
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
        form="edit-pub-form"
        className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Сохранение…' : 'Сохранить'}
      </button>
    </>
  );

  return (
    <BaseDialog
      open={!!publisher}
      onOpenChange={(v) => !v && onClose()}
      title={publisher ? `Изменить издательство "${publisher.name}"` : ''}
      widthClass="max-w-sm"
      footer={footer}
    >
      {publisher && (
        <form
          id="edit-pub-form"
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
      )}
    </BaseDialog>
  );
};

export default EditPublisherModal;