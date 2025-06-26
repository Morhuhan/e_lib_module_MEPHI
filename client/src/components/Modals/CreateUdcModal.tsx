// src/components/CreateUdcModal.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

import BaseDialog from '../BaseDialog.tsx';
import httpClient from '../../utils/httpsClient.tsx';

interface UdcDto {
  udcAbb: string;
  description: string;
  id?: number;
}

export interface CreateUdcModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (u: UdcDto) => void;
}

const inputCls =
  'w-full rounded border px-2 py-1 text-sm transition-colors focus:outline-none focus:border-emerald-500';

const CreateUdcModal: React.FC<CreateUdcModalProps> = ({
  open,
  onClose,
  onCreated,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<UdcDto>({
    defaultValues: { udcAbb: '', description: '' },
  });

  const submit = handleSubmit(async (vals) => {
    try {
      const { data } = await httpClient.post('/udc', {
        udcAbb: vals.udcAbb.trim(),
        description: vals.description.trim(),
      });
      toast.success('УДК создана');
      onCreated(data);
      reset();
      onClose();
    } catch {
      toast.error('Не удалось создать УДК');
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
        form="create-udc-form"
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
      title="Новая УДК"
      widthClass="max-w-sm"
      footer={footer}
    >
      <form
        id="create-udc-form"
        onSubmit={submit}
        className="space-y-3"
      >
        {[
          { name: 'udcAbb', label: 'Аббревиатура *' },
          { name: 'description', label: 'Описание *' },
        ].map((f) => (
          <div key={f.name}>
            <label className="block text-sm mb-1">{f.label}</label>
            <input
              {...register(f.name as keyof UdcDto, { required: true })}
              className={inputCls}
              required
            />
          </div>
        ))}
      </form>
    </BaseDialog>
  );
};

export default CreateUdcModal;