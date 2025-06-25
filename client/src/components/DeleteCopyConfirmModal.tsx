import React from 'react';
import BaseDialog from './BaseDialog.tsx';
import httpClient from '../utils/httpsClient.tsx';
import { toast } from 'react-toastify';
import { BookCopy } from '../utils/interfaces.tsx';

export interface DeleteCopyConfirmModalProps {
  copy: BookCopy | null;
  onClose: () => void;
  onDeleted: () => void;
}

const DeleteCopyConfirmModal: React.FC<DeleteCopyConfirmModalProps> = ({
  copy,
  onClose,
  onDeleted,
}) => {
  const handleDelete = async () => {
    if (!copy) return;
    try {
      await httpClient.delete(`/book-copies/${copy.id}`);
      toast.success(`Экземпляр с инвентарным № ${copy.inventoryNo} удалён`);
      onDeleted();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Не удалось удалить экземпляр с инвентарным № ' + copy.inventoryNo);
    }
  };

  const footer = (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        className="rounded bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300"
        onClick={onClose}
      >
        Отмена
      </button>
      <button
        type="button"
        className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
        onClick={handleDelete}
      >
        Удалить
      </button>
    </div>
  );

  return (
    <BaseDialog
      open={!!copy}
      onOpenChange={(v) => !v && onClose()}
      title={copy ? `Удалить экземпляр с инвентарным № ${copy.inventoryNo}?` : ''}
      footer={footer}
    >
      <p className="text-sm mb-6 text-gray-700">Действие нельзя отменить.</p>
    </BaseDialog>
  );
};

export default DeleteCopyConfirmModal;