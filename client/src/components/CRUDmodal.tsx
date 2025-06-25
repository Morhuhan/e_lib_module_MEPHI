import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z, ZodSchema } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-toastify';

import BaseDialog from './BaseDialog.tsx';
import httpClient from '../utils/httpsClient.tsx';

/* ------------------------------------------------------------------ */
/*  TYPES & CONFIG                                                    */
/* ------------------------------------------------------------------ */

export type FieldKind = 'text' | 'number' | 'textarea' | 'hidden';

export interface FieldConfig {
  name: string;
  label?: string;
  kind?: FieldKind;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  required?: boolean;
  order?: number;
  render?: (ctx: RenderCtx) => React.ReactNode;
}

export interface RenderCtx {
  register: ReturnType<typeof useForm>['register'];
  value: any;
  setValue: (val: any) => void;
}

export type CrudMode = 'create' | 'update' | 'delete';

export interface CRUDmodalProps<T extends ZodSchema<any>> {
  open: boolean;
  onClose: () => void;

  /** Заголовок окна */
  title: React.ReactNode;

  /** REST-endpoint (без финального слеша) */
  endpoint: string;

  /** Zod-схема для create/update */
  schema: T;

  /** Конфигурация полей (не используется в режиме delete) */
  fields: FieldConfig[];

  /** DTO при update|delete */
  initialData?: z.infer<T>;

  /** Принудительный режим (по умолчанию определяется автоматически) */
  mode?: CrudMode;

  /** Коллбэки */
  onSaved?: () => void;     // create | update
  onDeleted?: () => void;   // delete
}

function CRUDmodal<T extends ZodSchema<any>>({
  open,
  onClose,
  title,
  endpoint,
  schema,
  fields,
  initialData,
  mode: extMode,
  onSaved,
  onDeleted,
}: CRUDmodalProps<T>) {
  const deducedMode: CrudMode =
    extMode ??
    (initialData ? 'update' : 'create');

  /* ---------- form (только для create/update) ---------- */
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<z.infer<T>>({
    resolver:
      deducedMode === 'delete' ? undefined : zodResolver(schema),
    mode: 'onBlur',
    defaultValues: initialData ?? ({} as any),
  });

  /* сброс при открытии/закрытии */
  useEffect(() => {
    if (deducedMode !== 'delete') {
      reset(initialData ?? ({} as any));
    }
  }, [initialData, reset, open, deducedMode]);

  /* ---------- actions ---------- */
  const submit = handleSubmit(async values => {
    try {
      let url = endpoint;
      let method: 'post' | 'put' | 'delete' = 'post';

      if (deducedMode === 'update' || deducedMode === 'delete') {
        url += `/${(initialData as any).id}`;
        method = deducedMode === 'delete' ? 'delete' : 'put';
      }

      const payload =
        deducedMode === 'delete' ? undefined : values;

      const { data } =
        method === 'delete'
          ? await httpClient.delete(url)
          : await httpClient[method](url, payload);

      toast.success(
        {
          create:  `Создано (id ${data.id})`,
          update:  `Обновлено (id ${data.id})`,
          delete:  `Удалено (id ${(initialData as any).id})`,
        }[deducedMode],
      );

      deducedMode === 'delete' ? onDeleted?.() : onSaved?.();
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        {
          create: 'Не удалось создать (см. консоль)',
          update: 'Не удалось обновить (см. консоль)',
          delete: 'Не удалось удалить (см. консоль)',
        }[deducedMode];
      console.error(err);
      toast.error(msg);
    }
  });

  /* ---------- helpers ---------- */
  const orderedFields = [...fields].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );

  /* ---------- footer ---------- */
  const footer =
    deducedMode === 'delete' ? (
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
          type="button"
          onClick={submit}
          className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Удаление…' : 'Удалить'}
        </button>
      </>
    ) : (
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
          form="crud-form"
          className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Сохранение…' : 'Сохранить'}
        </button>
      </>
    );

  /* ---------- UI ---------- */
  return (
    <BaseDialog
      open={open}
      onOpenChange={v => !v && onClose()}
      title={title}
      footer={footer}
      widthClass="max-w-2xl"
    >
      {deducedMode === 'delete' ? (
        <p className="text-sm">
          Вы уверены, что хотите удалить элемент с id&nbsp;
          {(initialData as any)?.id}?
        </p>
      ) : (
        <form
          id="crud-form"
          onSubmit={submit}
          className="space-y-3"
        >
          {orderedFields.map(f => {
            if (f.render) {
              return (
                <div key={f.name}>
                  {f.label && (
                    <label className="block text-sm mb-1">
                      {f.label}
                    </label>
                  )}
                  {f.render({
                    register,
                    value: watch(f.name as any),
                    setValue: val =>
                      setValue(f.name as any, val, {
                        shouldValidate: true,
                      }),
                  })}
                </div>
              );
            }

            const kind = f.kind ?? 'text';
            const common = {
              ...(register(f.name as any) as any),
              className:
                'w-full rounded border px-2 py-1 text-sm',
              required: f.required,
              ...f.inputProps,
            };

            return (
              <div key={f.name}>
                {f.label && (
                  <label className="block text-sm mb-1">
                    {f.label}
                  </label>
                )}
                {kind === 'textarea' ? (
                  <textarea {...common} rows={3} />
                ) : (
                  <input
                    {...common}
                    type={
                      kind === 'number'
                        ? 'number'
                        : kind === 'hidden'
                        ? 'hidden'
                        : 'text'
                    }
                  />
                )}
              </div>
            );
          })}
        </form>
      )}
    </BaseDialog>
  );
}

export default CRUDmodal;