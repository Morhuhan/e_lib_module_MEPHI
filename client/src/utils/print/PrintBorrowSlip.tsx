import React from 'react';
import { toast } from 'react-toastify';
import { Printer } from 'lucide-react';
import { IssuedCopy } from '../../components/Modals/BorrowModal';
import { Person } from '../interfaces';


/* ─────────── типы ─────────── */

interface PrintBorrowSlipProps {
  person: Person | null;     // все данные читателя
  rows: IssuedCopy[];        // список активных + новых выдач
}

const TMP = 'tmp-'; // id временных черновиков

/* ─────────── helpers ─────────── */
const fullName = (p: Person) =>
  `${p.lastName} ${p.firstName}${p.patronymic ? ` ${p.patronymic}` : ''}`.trim();

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('ru-RU') : '-';

/* ─────────── компонент ─────────── */
const PrintBorrowSlip: React.FC<PrintBorrowSlipProps> = ({ person, rows }) => {
  /** Генерирует HTML-документ для печати */
  const buildHtml = () => {
    if (!person) return '';

    const booksHtml = rows
      .filter((r) => !String(r.id).startsWith(TMP)) // печатаем только активные
      .map(
        (r) => `
        <tr>
          <td>${r.bookTitle}</td>
          <td>${r.authors}</td>
          <td style="text-align:center;">${r.inventoryNo}</td>
          <td style="text-align:center;">${r.dueDate ?? '-'}</td>
        </tr>`,
      )
      .join('');

    return `
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<title>Выдача — ${fullName(person)}</title>
<style>
  body{font-family:sans-serif;font-size:12pt;margin:20px;}
  h2{margin:0 0 12px;}
  table{width:100%;border-collapse:collapse;margin-top:8px;}
  th,td{border:1px solid #000;padding:4px;}
  th{background:#f3f3f3;}
  .signatures{margin-top:60px;display:flex;justify-content:space-between;}
  .sign-line{width:46%;border-top:1px solid #000;text-align:center;padding-top:4px;}
  .info{margin-bottom:12px;}
  .info p{margin:2px 0;}
</style>
</head>
<body>
  <h2>Сведения о читателе</h2>
  <div class="info">
    <p><strong>ФИО:</strong> ${fullName(person)}</p>
    <p><strong>ID:</strong> ${person.id}</p>
    <p><strong>Пол:</strong> ${person.sex ?? '-'}</p>
    <p><strong>Дата рождения:</strong> ${fmtDate(person.birthDate)}</p>
    <p><strong>ИНН:</strong> ${person.inn ?? '-'}</p>
    <p><strong>СНИЛС:</strong> ${person.snils ?? '-'}</p>
    <p><strong>E-mail:</strong> ${person.email ?? '-'}</p>
  </div>

  <h2>Выданные книги</h2>
  <table>
    <thead>
      <tr>
        <th>Название</th>
        <th>Авторы</th>
        <th>Инв №</th>
        <th>Дата возврата</th>
      </tr>
    </thead>
    <tbody>
      ${
        booksHtml ||
        '<tr><td colspan="4" style="text-align:center;">Нет активных выдач</td></tr>'
      }
    </tbody>
  </table>

  <div class="signatures">
    <div class="sign-line">Подпись сотрудника</div>
    <div class="sign-line">Подпись клиента</div>
  </div>
</body>
</html>`;
  };

  /** Открывает окно и отправляет на печать */
  const handlePrint = () => {
    if (!person) {
      toast.error('Сначала выберите читателя');
      return;
    }
    const html = buildHtml();
    const w = window.open('', '_blank', 'width=850,height=600');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <button
      onClick={handlePrint}
      disabled={!person}
      className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
      title="Распечатать"
      type="button"
    >
      <Printer className="w-5 h-5" />
    </button>
  );
};

export default PrintBorrowSlip;