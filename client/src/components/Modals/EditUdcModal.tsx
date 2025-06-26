// src/components/EditUdcModal.tsx
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

import BaseDialog from '../BaseDialog.tsx';
import httpClient from '../../utils/httpsClient.tsx';

interface UdcDto {
  id: number;
  udcAbb: string;
  description: string;
}

export interface EditUdcModalProps {
  udc: UdcDto | null;
  onClose: () => void;
  onSaved: (u: UdcDto) => void;
}

const inputCls =
  'w-full rounded border px-2 py-1 text-sm transition-colors focus:outline-none focus:border-emerald-500';

const EditUdcModal: React.FC<EditUdcModalProps> = ({ udc, onClose, onSaved }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<UdcDto>();

  useEffect(() => {
    if (udc) reset({ udcAbb: udc.udcAbb, description: udc.description });
  }, [udc, reset]);

  const submit = handleSubmit(async (vals) => {
    if (!udc) return;
    try {
      const { data } = await httpClient.put(`/udc/${udc.id}`, {
        udcAbb: vals.udcAbb.trim(),
        description: vals.description.trim(),
      });
      toast.success('УДК сохранена');
      onSaved(data);
      onClose();
    } catch {
      toast.error('Не удалось сохранить УДК');
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
        form="edit-udc-form"
        className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Сохранение…' : 'Сохранить'}
      </button>
    </>
  );

  return (
    <BaseDialog
      open={!!udc}
      onOpenChange={(v) => !v && onClose()}
      title={udc ? `Изменить УДК "${udc.udcAbb}"` : ''}
      widthClass="max-w-sm"
      footer={footer}
    >
      {udc && (
        <form
          id="edit-udc-form"
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
      )}
    </BaseDialog>
  );
};

export default EditUdcModal;