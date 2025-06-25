// BorrowDetailsModal.tsx
import React, { useEffect, useState } from 'react';
import BaseDialog from './BaseDialog.tsx';
import httpClient from '../utils/httpsClient.tsx';
import { Book, Person, BookCopy } from '../utils/interfaces.tsx';
import { toast } from 'react-toastify';
import AddPersonDialog from '../components/Modals/Dialogs/AddPersonDialog.tsx';
import AddBookCopyDialog, { CopySearchItem } from '../components/Modals/Dialogs/AddBookCopyDialog.tsx';


/* ───────── типы ───────── */
interface Props {
  bookId: number | null;
  actionType: 'borrow' | 'return';
  onClose: () => void;
  onDone: () => void;
}

/* ───────── helpers ───────── */
const dash = '—';

const fmtAuthors = (l?: any[]) =>
  l?.length
    ? l
        .map(a =>
          [a.lastName, a.firstName, a.patronymic].filter(Boolean).join(' ')
        )
        .join('; ')
    : dash;

const fmtBbks = (l?: any[]) => (l?.length ? l.map(b => b.bbkAbb).join(', ') : dash);
const fmtUdcs = (l?: any[]) => (l?.length ? l.map(u => u.udcAbb).join(', ') : dash);

const fmtRaw = (
  raw: { bbkCode?: string; udcCode?: string }[] | undefined,
  key: 'bbkCode' | 'udcCode'
) => (raw?.length ? raw.map(r => r[key]).join(', ') : dash);

const fmtGrnti = (b: Book | null) => {
  if (!b) return dash;
  if (b.grntiAbbs?.trim()) return b.grntiAbbs;
  if (b.grntis?.length) return b.grntis.map(g => g.code).join(', ');
  if (b.grntiRaws?.length) return b.grntiRaws.map(r => r.grntiCode).join(', ');
  return dash;
};

const copyLabel = (c: BookCopy | null | undefined) =>
  c?.inventoryNo
    ? `${c.inventoryNo}${c.storagePlace ? ` — ${c.storagePlace}` : ''}`
    : c
    ? `Экземпляр #${c.id}`
    : '';

/* ───────── компонент ───────── */
const BorrowDetailsModal: React.FC<Props> = ({
  bookId,
  actionType,
  onClose,
  onDone,
}) => {
  /* ---- state ---- */
  const [book, setBook] = useState<Book | null>(null);
  const [copyId, setCopyId] = useState<number | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [addPersonDlgOpen, setAddPersonDlgOpen] = useState(false);
  const [addCopyDlgOpen, setAddCopyDlgOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(!!bookId);
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });

  /* ---- загрузка книги ---- */
  useEffect(() => {
    if (!bookId) return;
    const fetchBook = async () => {
      setIsLoading(true);
      try {
        const { data } = await httpClient.get<Book>(`/books/${bookId}`);
        setBook(data);

        // сразу выбираем первый подходящий экземпляр
        const available =
          data.bookCopies?.filter(c => {
            const borrowed = c.borrowRecords?.some(r => !r.returnDate);
            return actionType === 'borrow' ? !borrowed : borrowed;
          }) ?? [];
        setCopyId(available.length ? available[0].id : null);
      } catch (e) {
        console.error(e);
        toast.error('Не удалось загрузить книгу');
      } finally {
        setIsLoading(false);
      }
    };
    fetchBook();
  }, [bookId, actionType]);

  /* ---- открытие / закрытие ---- */
  useEffect(() => setIsOpen(!!bookId), [bookId]);

  if (!bookId) return null;

  /* ---- список подходящих экземпляров ---- */
  const copies: BookCopy[] =
    book?.bookCopies?.filter(c => {
      const borrowed = c.borrowRecords?.some(r => !r.returnDate);
      return actionType === 'borrow' ? !borrowed : borrowed;
    }) ?? [];

  /* ---- действие (выдать / принять) ---- */
  const handleAction = async () => {
    if (!copyId) return;
    try {
      if (actionType === 'borrow') {
        if (!person) return;
        await httpClient.post('/borrow-records', {
          bookCopyId: copyId,
          personId: person.id,
          expectedReturnDate,
        });
        toast.success('Экземпляр выдан');
      } else {
        const rec = book!.bookCopies!
          .find(c => c.id === copyId)!
          .borrowRecords!.find(r => !r.returnDate)!;
        await httpClient.patch(`/borrow-records/${rec.id}/return`, {});
        toast.success('Экземпляр принят');
      }
      onDone();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Не удалось выполнить действие');
    }
  };

  /* ---- footer (кнопки) ---- */
  const footer = (
    <>
      <button
        type="button"
        className="rounded bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300"
        onClick={onClose}
      >
        Отмена
      </button>
      <button
        onClick={handleAction}
        disabled={
          !copyId || (actionType === 'borrow' && (!person || !expectedReturnDate))
        }
        className={`
          rounded px-4 py-1 text-sm text-white disabled:opacity-50
          transition-colors duration-200
          ${
            actionType === 'borrow'
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-red-500 hover:bg-red-600'
          }
        `}
      >
        {actionType === 'borrow' ? 'Выдать' : 'Принять'}
      </button>
    </>
  );

  /* ---- UI ---- */
  return (
    <>
      <BaseDialog
        open={isOpen}
        onOpenChange={v => {
          if (!v) {
            setIsOpen(false);
            setTimeout(onClose, 300);
          }
        }}
        title={
          book ? `Книга №${book.id}: ${book.title || '(без названия)'}` : 'Данные книги'
        }
        widthClass="max-w-lg"
        footer={footer}
      >
        {/* !!! ВАЖНО: убрали внутренний overflow-y, чтобы не было второй прокрутки */}
        <div
          className="transition-opacity duration-300 ease-in-out"
          style={{ opacity: isOpen ? 1 : 0 }}
        >
          {isLoading && (
            <p className="p-4 text-center text-sm text-gray-500">Загрузка данных…</p>
          )}

          {!isLoading && book && (
            <div className="space-y-4 pr-2 text-sm">
              {/* ---- метаданные ---- */}
              <dl className="grid grid-cols-[max-content_1fr] gap-x-2 gap-y-1">
                <dt className="font-medium">Название:</dt>
                <dd>{book.title || dash}</dd>

                <dt className="font-medium">Тип:</dt>
                <dd>{book.bookType || dash}</dd>

                <dt className="font-medium">Редактор:</dt>
                <dd>{book.edit || dash}</dd>

                <dt className="font-medium">Сведения об изд.:</dt>
                <dd>{book.editionStatement || dash}</dd>

                <dt className="font-medium">Серия:</dt>
                <dd>{book.series || dash}</dd>

                <dt className="font-medium">Описание:</dt>
                <dd>{(book as any).description || dash}</dd>

                <dt className="font-medium">Авторы:</dt>
                <dd>{fmtAuthors(book.authors ?? undefined)}</dd>

                <dt className="font-medium">ББК:</dt>
                <dd>{fmtBbks(book.bbks ?? undefined)}</dd>

                <dt className="font-medium">УДК:</dt>
                <dd>{fmtUdcs(book.udcs ?? undefined)}</dd>

                <dt className="font-medium">ББК*:</dt>
                <dd>{fmtRaw(book.bbkRaws ?? undefined, 'bbkCode')}</dd>

                <dt className="font-medium">УДК*:</dt>
                <dd>{fmtRaw(book.udcRaws ?? undefined, 'udcCode')}</dd>

                <dt className="font-medium">ГРНТИ:</dt>
                <dd>{fmtGrnti(book)}</dd>

                <dt className="font-medium">Издательство:</dt>
                <dd>
                  {book.publicationPlaces?.length ? (
                    <>
                      {book.publicationPlaces[0].city || dash},{' '}
                      {book.publicationPlaces[0].publisher?.name || dash},{' '}
                      {book.publicationPlaces[0].pubYear || dash}
                    </>
                  ) : (
                    dash
                  )}
                </dd>
              </dl>

              {/* ---- поля действий ---- */}
              <div className="space-y-3 pt-2 border-t">
                {/* экземпляр */}
                <div>
                  <label className="block mb-1 text-sm font-medium">
                    Экземпляр:
                  </label>

                  {actionType === 'borrow' ? (
                    <input
                      type="text"
                      readOnly
                      onClick={() => setAddCopyDlgOpen(true)}
                      value={
                        copyId ? copyLabel(copies.find(c => c.id === copyId)) : ''
                      }
                      placeholder="Нажмите, чтобы выбрать экземпляр"
                      className="w-full rounded border px-2 py-1 text-sm bg-gray-50 cursor-pointer hover:bg-gray-100 hover:border-blue-500 transition-colors duration-200"
                    />
                  ) : (
                    <select
                      value={copyId ?? ''}
                      onChange={e => setCopyId(Number(e.target.value) || null)}
                      className="w-full rounded border px-2 py-1 text-sm bg-gray-50"
                    >
                      <option value="" disabled>
                        Выберите экземпляр…
                      </option>
                      {copies.map(c => (
                        <option key={c.id} value={c.id}>
                          {copyLabel(c)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* читатель и срок (только при выдаче) */}
                {actionType === 'borrow' && (
                  <>
                    <div>
                      <label className="block mb-1 text-sm font-medium">
                        Читатель:
                      </label>
                      <input
                        type="text"
                        readOnly
                        onClick={() => setAddPersonDlgOpen(true)}
                        value={
                          person
                            ? `${person.lastName || ''} ${person.firstName || ''}${
                                person.patronymic ? ` ${person.patronymic}` : ''
                              }`.trim()
                            : ''
                        }
                        placeholder="Нажмите, чтобы выбрать читателя"
                        className="w-full rounded border px-2 py-1 text-sm bg-gray-50 cursor-pointer hover:bg-gray-100 hover:border-blue-500 transition-colors duration-200"
                      />
                    </div>

                    <div>
                      <label className="block mb-1 text-sm font-medium">
                        Срок возврата:
                      </label>
                      <input
                        type="date"
                        value={expectedReturnDate}
                        onChange={e => setExpectedReturnDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full rounded border px-2 py-1 text-sm bg-gray-50"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </BaseDialog>

<<<<<<< HEAD
      {/* dialogs */}
      {/* <AddPersonDialog
=======
      {/* ---- диалоги выбора ---- */}
      <AddPersonDialog
>>>>>>> temp-branch
        open={addPersonDlgOpen}
        onClose={() => setAddPersonDlgOpen(false)}
        onPick={setPerson}
      />

      <AddBookCopyDialog
        open={addCopyDlgOpen}
        copies={copies as CopySearchItem[]}
        onClose={() => setAddCopyDlgOpen(false)}
        onPick={c => {
          setCopyId(c.id);
          setAddCopyDlgOpen(false);
        }}
      /> */}
    </>
  );
};

export default BorrowDetailsModal;