// src/components/CreateGrntiModal.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

import BaseDialog from '../BaseDialog.tsx';
import httpClient from '../../utils/httpsClient.tsx';

interface GrntiDto {
  code: string;
  description: string;
  id?: number;
}

export interface CreateGrntiModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (g: GrntiDto) => void;
}

const inputCls =
  'w-full rounded border px-2 py-1 text-sm transition-colors focus:outline-none focus:border-emerald-500';

const CreateGrntiModal: React.FC<CreateGrntiModalProps> = ({
  open,
  onClose,
  onCreated,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<GrntiDto>({
    defaultValues: { code: '', description: '' },
  });

  const submit = handleSubmit(async (vals) => {
    try {
      const { data } = await httpClient.post('/grnti', {
        code: vals.code.trim(),
        description: vals.description.trim(),
      });
      toast.success('ГРНТИ создан');
      onCreated(data);
      reset();
      onClose();
    } catch {
      toast.error('Не удалось создать ГРНТИ');
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
        form="create-grnti-form"
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
      title="Новый ГРНТИ"
      widthClass="max-w-sm"
      footer={footer}
    >
      <form
        id="create-grnti-form"
        onSubmit={submit}
        className="space-y-3"
      >
        {[
          { name: 'code', label: 'Код *' },
          { name: 'description', label: 'Описание *' },
        ].map((f) => (
          <div key={f.name}>
            <label className="block text-sm mb-1">{f.label}</label>
            <input
              {...register(f.name as keyof GrntiDto, { required: true })}
              className={inputCls}
              required
            />
          </div>
        ))}
      </form>
    </BaseDialog>
  );
};

export default CreateGrntiModal;