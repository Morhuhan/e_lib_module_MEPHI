// src/components/CreateBbkModal.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

import BaseDialog from '../BaseDialog.tsx';
import httpClient from '../../utils/httpsClient.tsx';

interface BbkDto {
  bbkAbb: string;
  description: string;
  id?: number;
}

export interface CreateBbkModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (b: BbkDto) => void;
}

const inputCls =
  'w-full rounded border px-2 py-1 text-sm transition-colors focus:outline-none focus:border-emerald-500';

const CreateBbkModal: React.FC<CreateBbkModalProps> = ({
  open,
  onClose,
  onCreated,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<BbkDto>({
    defaultValues: { bbkAbb: '', description: '' },
  });

  const submit = handleSubmit(async (vals) => {
    try {
      const { data } = await httpClient.post('/bbk', {
        bbkAbb: vals.bbkAbb.trim(),
        description: vals.description.trim(),
      });
      toast.success('ББК создана');
      onCreated(data);
      reset();
      onClose();
    } catch {
      toast.error('Не удалось создать ББК');
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
        form="create-bbk-form"
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
      title="Новая ББК"
      widthClass="max-w-sm"
      footer={footer}
    >
      <form
        id="create-bbk-form"
        onSubmit={submit}
        className="space-y-3"
      >
        {[
          { name: 'bbkAbb', label: 'Аббревиатура *' },
          { name: 'description', label: 'Описание *' },
        ].map((f) => (
          <div key={f.name}>
            <label className="block text-sm mb-1">{f.label}</label>
            <input
              {...register(f.name as keyof BbkDto, { required: true })}
              className={inputCls}
              required
            />
          </div>
        ))}
      </form>
    </BaseDialog>
  );
};

export default CreateBbkModal;