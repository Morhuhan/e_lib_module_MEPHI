import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';

import httpClient from '../utils/httpsClient.tsx';
import PrintReportButton from '../utils/print/PrintReportButton.tsx';

/* ---------- SVG-иконка Excel ---------- */
const ExcelIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="20"
    height="20"
    viewBox="0 0 120 120"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="120" height="120" fill="#217346" rx="15" />
    <text
      x="30"
      y="45"
      fontFamily="Arial, sans-serif"
      fontSize="36"
      fill="white"
      fontWeight="bold"
    >
      X
    </text>
    <rect x="20" y="60" width="80" height="40" fill="white" rx="4" />
    <line x1="20" y1="70" x2="100" y2="70" stroke="#217346" strokeWidth="2" />
    <line x1="20" y1="80" x2="100" y2="80" stroke="#217346" strokeWidth="2" />
    <line x1="20" y1="60" x2="20" y2="100" stroke="#217346" strokeWidth="2" />
    <line x1="45" y1="60" x2="45" y2="100" stroke="#217346" strokeWidth="2" />
    <line x1="70" y1="60" x2="70" y2="100" stroke="#217346" strokeWidth="2" />
    <line x1="100" y1="60" x2="100" y2="100" stroke="#217346" strokeWidth="2" />
  </svg>
);

/* ---------- конфигурация отчётов ---------- */
interface Report {
  id: string;
  title: string;
  description: string;
  endpoint: string;
  sheet: string;
  file: string;
  mapper: (rows: any[]) => Record<string, unknown>[];
}

const reports: Report[] = [
  {
    id: 'unreturned',
    title: 'Невозвращённые книги',
    description:
      'Экземпляры, которые находятся на руках у читателей и ещё не возвращены.',
    endpoint: '/reports/unreturned',
    sheet: 'Unreturned',
    file: 'unreturned.xlsx',
    mapper: (rows) =>
      rows.map((r: any) => ({
        ID: r.id,
        'Инв. №': r.bookCopy?.inventoryNo,
        Название: r.bookCopy?.book?.title,
        Читатель: r.person
          ? `${r.person.lastName ?? ''} ${r.person.firstName ?? ''} ${
              r.person.patronymic ?? ''
            }`.trim()
          : '',
        'Дата выдачи': r.borrowDate,
        'Ожид. возврат': r.expectedReturnDate,
      })),
  },
  {
    id: 'no-copies',
    title: 'Книги без экземпляров',
    description:
      'Записи, у которых нет ни одного свободного экземпляра: либо все выданы, либо экземпляры списаны.',
    endpoint: '/reports/no-copies',
    sheet: 'NoCopies',
    file: 'no_copies.xlsx',
    mapper: (rows) =>
      rows.map((r: any) => ({
        'ID книги': r.id,
        Название: r.title,
        'Всего экз.': r.copiesCount,
        'Выдано сейчас': r.borrowedNow,
        Причина: r.reason,
      })),
  },
  {
    id: 'udc',
    title: 'Книгообеспеченность по УДК',
    description:
      'Сводка по количеству книг и экземпляров в разрезе индексов УДК.',
    endpoint: '/reports/udc-provision',
    sheet: 'UdcProvision',
    file: 'udc_provision.xlsx',
    mapper: (rows) =>
      rows.map((r: any) => ({
        УДК: r.udcAbb,
        Описание: r.description,
        'Кол-во книг': r.booksCount,
        'Кол-во экземпляров': r.copiesCount,
      })),
  },
];

const Reports: React.FC = () => {
  const [busy, setBusy] = useState<string | null>(null);

  /* ---------- Excel-экспорт ---------- */
  const exportToExcel = (data: any[], sheet: string, file: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheet);
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), file);
  };

  /* ---------- click-handler ---------- */
  const handleExport = async (r: Report) => {
    setBusy(r.id);
    try {
      const res = await httpClient.get(r.endpoint);
      const data = r.mapper(res.data);
      exportToExcel(data, r.sheet, r.file);
      toast.success(`Отчёт «${r.title}» сформирован`);
    } catch (e) {
      console.error(e);
      toast.error('Не удалось сформировать отчёт');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="w-full px-4 py-6">
      <h2 className="text-2xl font-semibold mb-6">Отчёты</h2>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((r) => (
          <div
            key={r.id}
            className="flex flex-col justify-between bg-white rounded-xl shadow p-5"
          >
            <div>
              <h3 className="text-lg font-semibold">{r.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{r.description}</p>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => handleExport(r)}
                disabled={busy === r.id}
                className="inline-flex items-center bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2 px-3 rounded-md transition disabled:opacity-60"
              >
                <ExcelIcon />
                <span className="ml-2">Excel</span>
              </button>

              <PrintReportButton
                title={r.title}
                endpoint={r.endpoint}
                mapper={r.mapper}
              />
            </div>
          </div>
        ))}
      </div>

      {busy && (
        <p className="mt-6 text-sm text-gray-700">
          Формируем отчёт. Пожалуйста, подождите…
        </p>
      )}
    </div>
  );
};

export default Reports;