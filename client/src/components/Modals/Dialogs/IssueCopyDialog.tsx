// src/components/IssueCopyDialog.tsx
import React, { useEffect, useState } from 'react';
import BaseDialog from '../../BaseDialog.tsx';
import { toast } from 'react-toastify';

import AddBookDialog, { BookPick } from './AddBookDialog.tsx';
import AddBookCopyDialog, { CopySearchItem } from './AddBookCopyDialog.tsx';
import { IssuedCopy } from '../BorrowModal.tsx';

const TMP_ID_PREFIX = 'tmp-';

interface IssueCopyDialogProps {
  open: boolean;
  onClose: () => void;
  onDraft: (draft: IssuedCopy) => void;
}

const IssueCopyDialog: React.FC<IssueCopyDialogProps> = ({
  open,
  onClose,
  onDraft,
}) => {
  const [book, setBook]   = useState<BookPick | null>(null);
  const [copy, setCopy]   = useState<CopySearchItem | null>(null);
  const [dueDate, setDueDate] = useState('');

  const [bookDlg, setBookDlg] = useState(false);
  const [copyDlg, setCopyDlg] = useState(false);

  useEffect(() => {
    if (!open) return;
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    setDueDate(d.toISOString().split('T')[0]);
    setBook(null);
    setCopy(null);
  }, [open]);

  const addDraft = () => {
    if (!book || !copy) return;

    const draft: IssuedCopy = {
      id: TMP_ID_PREFIX + copy.id,
      bookTitle: book.title,
      authors: book.author ?? '-',
      inventoryNo: copy.inventoryNo ?? '-',
      dueDate,
    };

    onDraft(draft);
    toast.success('Экземпляр добавлен');
    onClose();
  };

  const copyDisabled = !book;
  const dateDisabled = !copy;

  return (
    <>
      <BaseDialog
        open={open}
        onOpenChange={v => !v && onClose()}
        title="Добавление экземпляра"
        widthClass="max-w-lg"
        footer={
          <>
            <button
              className="rounded bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300"
              onClick={onClose}
            >
              Отмена
            </button>
            <button
              className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
              disabled={!book || !copy}
              onClick={addDraft}
            >
              Добавить
            </button>
          </>
        }
      >
        <div className="mb-3">
          <label className="block text-sm mb-1">Книга *</label>
          <input
            readOnly
            value={book ? book.title : ''}
            placeholder="Выберите книгу…"
            onClick={() => setBookDlg(true)}
            className="w-full rounded border px-2 py-1 text-sm cursor-pointer"
          />
        </div>

        <div className="mb-3">
          <label className="block text-sm mb-1">Экземпляр *</label>
          <input
            readOnly
            disabled={copyDisabled}
            value={
              copy
                ? `${copy.inventoryNo ?? ''}${
                    copy.storagePlace ? ` (${copy.storagePlace})` : ''
                  }`
                : ''
            }
            placeholder="Выберите экземпляр…"
            onClick={() => !copyDisabled && setCopyDlg(true)}
            className={
              `w-full rounded border px-2 py-1 text-sm ` +
              (copyDisabled
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'cursor-pointer')
            }
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm mb-1">Срок возврата</label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            disabled={dateDisabled}
            className={
              `rounded border px-2 py-1 text-sm ` +
              (dateDisabled
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : '')
            }
          />
        </div>
      </BaseDialog>

      <AddBookDialog
        open={bookDlg}
        onClose={() => setBookDlg(false)}
        onPick={b => {
          setBook(b);
          setCopy(null);
        }}
      />

      <AddBookCopyDialog
        open={copyDlg}
        onClose={() => setCopyDlg(false)}
        onPick={c => {
          setCopy(c);
          setCopyDlg(false);
        }}
        bookId={book?.id ?? null}
      />
    </>
  );
};

export default IssueCopyDialog;