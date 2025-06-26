// src/components/EditGrntiModal.tsx
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

import BaseDialog from '../BaseDialog.tsx';
import httpClient from '../../utils/httpsClient.tsx';

interface GrntiDto {
  id: number;
  code: string;
  description: string;
}

export interface EditGrntiModalProps {
  grnti: GrntiDto | null;
  onClose: () => void;
  onSaved: (g: GrntiDto) => void;
}

const inputCls =
  'w-full rounded border px-2 py-1 text-sm transition-colors focus:outline-none focus:border-emerald-500';

const EditGrntiModal: React.FC<EditGrntiModalProps> = ({
  grnti,
  onClose,
  onSaved,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<GrntiDto>();

  useEffect(() => {
    if (grnti) reset({ code: grnti.code, description: grnti.description });
  }, [grnti, reset]);

  const submit = handleSubmit(async (vals) => {
    if (!grnti) return;
    try {
      const { data } = await httpClient.put(`/grnti/${grnti.id}`, {
        code: vals.code.trim(),
        description: vals.description.trim(),
      });
      toast.success('ГРНТИ сохранён');
      onSaved(data);
      onClose();
    } catch {
      toast.error('Не удалось сохранить ГРНТИ');
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
        form="edit-grnti-form"
        className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Сохранение…' : 'Сохранить'}
      </button>
    </>
  );

  return (
    <BaseDialog
      open={!!grnti}
      onOpenChange={(v) => !v && onClose()}
      title={grnti ? `Изменить ГРНТИ "${grnti.code}"` : ''}
      widthClass="max-w-sm"
      footer={footer}
    >
      {grnti && (
        <form
          id="edit-grnti-form"
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
      )}
    </BaseDialog>
  );
};

export default EditGrntiModal;