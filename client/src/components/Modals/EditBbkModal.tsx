// src/components/EditBbkModal.tsx
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

import BaseDialog from '../BaseDialog.tsx';
import httpClient from '../../utils/httpsClient.tsx';

interface BbkDto {
  id: number;
  bbkAbb: string;
  description: string;
}

export interface EditBbkModalProps {
  bbk: BbkDto | null;
  onClose: () => void;
  onSaved: (b: BbkDto) => void;
}

const inputCls =
  'w-full rounded border px-2 py-1 text-sm transition-colors focus:outline-none focus:border-emerald-500';

const EditBbkModal: React.FC<EditBbkModalProps> = ({
  bbk,
  onClose,
  onSaved,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<BbkDto>();

  useEffect(() => {
    if (bbk) reset({ bbkAbb: bbk.bbkAbb, description: bbk.description });
  }, [bbk, reset]);

  const submit = handleSubmit(async (vals) => {
    if (!bbk) return;
    try {
      const { data } = await httpClient.put(`/bbk/${bbk.id}`, {
        bbkAbb: vals.bbkAbb.trim(),
        description: vals.description.trim(),
      });
      toast.success('ББК сохранена');
      onSaved(data);
      onClose();
    } catch {
      toast.error('Не удалось сохранить ББК');
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
        form="edit-bbk-form"
        className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Сохранение…' : 'Сохранить'}
      </button>
    </>
  );

  return (
    <BaseDialog
      open={!!bbk}
      onOpenChange={(v) => !v && onClose()}
      title={bbk ? `Изменить ББК "${bbk.bbkAbb}"` : ''}
      widthClass="max-w-sm"
      footer={footer}
    >
      {bbk && (
        <form
          id="edit-bbk-form"
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
      )}
    </BaseDialog>
  );
};

export default EditBbkModal;