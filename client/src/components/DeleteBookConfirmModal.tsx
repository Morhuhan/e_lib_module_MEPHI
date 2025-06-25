import React from 'react';
import BaseDialog from './BaseDialog.tsx';
import { Book } from '../utils/interfaces.tsx';
import httpClient from '../utils/httpsClient.tsx';
import { toast } from 'react-toastify';

export interface DeleteBookConfirmModal {
  book: Book | null;
  onClose: () => void;
  onDeleted: () => void;
}

const DeleteConfirmDialog: React.FC<DeleteBookConfirmModal> = ({ book, onClose, onDeleted }) => {
  const handleDelete = async () => {
    if (!book) return;
    try {
      await httpClient.delete(`/books/${book.title}`);
      toast.success(`Книга "${book.title}" удалена`);
      onDeleted();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Не удалось удалить книгу');
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
      open={!!book}
      onOpenChange={(v) => !v && onClose()}
      title={`Удалить книгу "${book?.title}"?`}
      footer={footer}
    >
      <p className="text-sm mb-6 text-gray-700">Действие нельзя отменить.</p>
    </BaseDialog>
  );
};

export default DeleteConfirmDialog;