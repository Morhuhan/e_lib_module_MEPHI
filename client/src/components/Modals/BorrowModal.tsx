import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

import httpClient from '../../utils/httpsClient.tsx';
import BaseDialog from '../BaseDialog.tsx';

import AddPersonDialog from './Dialogs/AddPersonDialog.tsx';
import IssueCopyDialog from './Dialogs/IssueCopyDialog.tsx';
import PrintBorrowSlip from '../../utils/print/PrintBorrowSlip.tsx';
import { Person } from '../../utils/interfaces.tsx';

export interface IssuedCopy {
  id: number | string;
  bookTitle: string;
  authors: string;
  inventoryNo: string;
  dueDate: string | null;
}

const TMP = 'tmp-';

const joinAuthors = (arr?: any[]) =>
  (arr ?? [])
    .map(
      (a) =>
        `${a.lastName ?? ''} ${a.firstName ?? ''}${
          a.patronymic ? ` ${a.patronymic}` : ''
        }`.trim(),
    )
    .filter(Boolean)
    .join(', ');

/* ─── API ─── */
const fetchActive = async (personId: number | null): Promise<IssuedCopy[]> => {
  if (!personId) return [];
  const { data } = await httpClient.get<any[]>(
    `/borrow-records/person/${personId}`,
    { params: { onlyActive: true } },
  );

  return data.map((r) => ({
    id: r.id,
    bookTitle: r.bookCopy?.book?.title ?? '-',
    authors: joinAuthors(r.bookCopy?.book?.authors) || '-',
    inventoryNo: r.bookCopy?.inventoryNo ?? '-',
    dueDate: r.dueDate || r.expectedReturnDate || '-',
  }));
};

/* ─── props ─── */
interface BorrowModalProps {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}

const BorrowModal: React.FC<BorrowModalProps> = ({ open, onClose, onDone }) => {
  /* выбранный читатель */
  const [person, setPerson] = useState<Person | null>(null);
  const [personName, setPersonName] = useState(''); // для поля ввода

  /* книги */
  const [issued, setIssued] = useState<IssuedCopy[]>([]);
  const [drafts, setDrafts] = useState<IssuedCopy[]>([]);

  /* ui-состояния */
  const [saving, setSaving] = useState(false);
  const [pDlg, setPDlg] = useState(false);
  const [iDlg, setIDlg] = useState(false);

  /* ─── подтягиваем активные книги при каждом открытии и смене читателя ─── */
  useEffect(() => {
    if (!open || !person?.id) return;
    (async () => {
      try {
        setIssued(await fetchActive(person.id));
      } catch {
        toast.error('Не удалось загрузить активные выдачи');
      }
    })();
  }, [open, person?.id]);

  /* ─── выбор читателя ─── */
  const handlePersonPick = (p: Person) => {
    setPerson(p);
    setPersonName(
      `${p.lastName} ${p.firstName}${p.patronymic ? ` ${p.patronymic}` : ''}`,
    );
    setDrafts([]);
    (async () => setIssued(await fetchActive(p.id)))();
  };

  /* ─── добавление черновика выдачи ─── */
  const handleDraft = (d: IssuedCopy) => {
    const isDuplicate = [...drafts, ...issued].some(
      (x) => x.inventoryNo === d.inventoryNo,
    );
    if (isDuplicate) {
      toast.error('Такой экземпляр уже есть в списке');
      return;
    }
    setDrafts((prev) => [d, ...prev]);
  };

  /* ─── приём возврата ─── */
  const acceptReturn = async (id: number) => {
    try {
      await httpClient.patch(`/borrow-records/${id}/return`);
      setIssued((prev) => prev.filter((x) => x.id !== id));
      toast.success('Книга принята');
    } catch {
      toast.error('Ошибка при приёме книги');
    }
  };

  /* ─── сохранение новых выдач ─── */
  const save = async () => {
    if (!person?.id || !drafts.length) return;
    setSaving(true);
    try {
      await Promise.all(
        drafts.map((d) =>
          httpClient.post('/borrow-records', {
            bookCopyId: Number(String(d.id).replace(TMP, '')),
            personId: person.id,
            dueDate: d.dueDate || undefined,
          }),
        ),
      );
      toast.success('Выдача оформлена');
      setIssued(await fetchActive(person.id));
      setDrafts([]);
      onDone();
      onClose();
    } catch {
      toast.error('Не удалось сохранить выдачу');
    } finally {
      setSaving(false);
    }
  };

  /* ─── объединённый список для таблицы ─── */
  const rows = useMemo(() => [...drafts, ...issued], [drafts, issued]);

  /* ─────────── UI ─────────── */
  return (
    <>
      <BaseDialog
        open={open}
        onOpenChange={(v) => !v && onClose()}
        title={
          <div className="flex items-center justify-between">
            <span>Выдача / Возврат</span>
            <PrintBorrowSlip person={person} rows={rows} />
          </div>
        }
        widthClass="max-w-3xl"
        footer={
          <>
            <button
              className="rounded bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300"
              disabled={saving}
              onClick={onClose}
            >
              Отмена
            </button>
            <button
              className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
              disabled={saving || !drafts.length || !person}
              onClick={save}
            >
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </>
        }
      >
        {/* читатель */}
        <div className="mb-4">
          <label className="block text-sm mb-1">Читатель *</label>
          <input
            readOnly
            value={personName}
            placeholder="Выберите читателя…"
            onClick={() => setPDlg(true)}
            className="w-full rounded border px-2 py-1 text-sm cursor-pointer"
          />
        </div>

        {/* действия */}
        <div className="flex gap-3 mb-4">
          <button
            disabled={!person}
            onClick={() => setIDlg(true)}
            className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
          >
            Выдать экземпляр
          </button>
        </div>

        {/* таблица */}
        <div className="overflow-auto max-h-[50vh]">
          <table className="min-w-full text-sm border">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="border px-2 py-1 w-1/3 text-left">Название</th>
                <th className="border px-2 py-1 text-left">Авторы</th>
                <th className="border px-2 py-1">Инв №</th>
                <th className="border px-2 py-1">Дата возврата</th>
                <th className="border px-2 py-1">Действия</th>
              </tr>
            </thead>

            {rows.length ? (
              <tbody>
                {rows.map((r) => {
                  const isNew = String(r.id).startsWith(TMP);
                  return (
                    <tr key={r.id} className={isNew ? 'bg-green-100/60' : undefined}>
                      <td className="border px-2 py-1">{r.bookTitle || '-'}</td>
                      <td className="border px-2 py-1">{r.authors || '-'}</td>
                      <td className="border px-2 py-1 text-center">
                        {r.inventoryNo || '-'}
                      </td>
                      <td className="border px-2 py-1 text-center">
                        {r.dueDate || '-'}
                      </td>
                      <td className="border px-2 py-1 text-center">
                        {isNew ? (
                          <span className="text-gray-500">Будет выдана</span>
                        ) : (
                          <button
                            onClick={() => acceptReturn(Number(r.id))}
                            className="rounded bg-blue-600 px-2 py-1 text-white hover:bg-blue-700"
                          >
                            Принять
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            ) : (
              <tbody>
                <tr>
                  <td
                    colSpan={5}
                    className="border px-2 py-3 text-center text-gray-500"
                  >
                    Нет активных выдач
                  </td>
                </tr>
              </tbody>
            )}
          </table>
        </div>
      </BaseDialog>

      {/* модалки выбора читателя и экземпляра */}
      <AddPersonDialog
        open={pDlg}
        onClose={() => setPDlg(false)}
        onPick={handlePersonPick}
      />

      <IssueCopyDialog
        open={iDlg}
        onClose={() => setIDlg(false)}
        onDraft={handleDraft}
      />
    </>
  );
};

export default BorrowModal;