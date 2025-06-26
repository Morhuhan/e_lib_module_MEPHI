import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Printer } from 'lucide-react';
import httpClient from '../httpsClient.tsx';

interface Props {
  /** Заголовок отчёта — попадёт в title окна печати */
  title: string;
  /** backend-endpoint (например `/reports/unreturned`) */
  endpoint: string;
  /** Функция, которая готовит массив plain-объектов для печати  */
  mapper: (rows: any[]) => Record<string, unknown>[];
}

const PrintReportButton: React.FC<Props> = ({ title, endpoint, mapper }) => {
  const [loading, setLoading] = useState(false);

  /* --- экранирование, чтобы не сломать HTML --- */
  const esc = (v: unknown) =>
    String(v ?? '—')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const handlePrint = async () => {
    setLoading(true);
    try {
      const res = await httpClient.get(endpoint);
      const data = mapper ? mapper(res.data) : res.data;

      if (!data.length) {
        toast.info('Данных для печати нет');
        return;
      }

      /* ---------- формируем таблицу ---------- */
      const headers = Object.keys(data[0]);
      const headRow = headers.map((h) => `<th>${esc(h)}</th>`).join('');
      const bodyRows = data
        .map(
          (row) =>
            `<tr>${headers
              .map((h) => `<td>${esc(row[h])}</td>`)
              .join('')}</tr>`,
        )
        .join('');

      const html = `
<!doctype html><html lang="ru"><head><meta charset="utf-8" />
<title>${esc(title)}</title>
<style>
  body{font-family:sans-serif;font-size:10pt;margin:20px;}
  h2{margin:0 0 12px;}
  table{width:100%;border-collapse:collapse;font-size:9pt;}
  th,td{border:1px solid #000;padding:4px;vertical-align:top;}
  th{background:#f3f3f3;}
  @media print { thead {display: table-header-group;} }
</style></head><body>
  <h2>${esc(title)}</h2>
  <p>Всего записей: ${data.length}</p>
  <table>
    <thead><tr>${headRow}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body></html>`;

      const w = window.open('', '_blank', 'width=1000,height=700');
      if (!w) return;
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
    } catch (e) {
      console.error(e);
      toast.error('Не удалось подготовить данные для печати');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handlePrint}
      disabled={loading}
      className="inline-flex items-center bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium py-2 px-3 rounded-md disabled:opacity-60"
    >
      {loading ? (
        'Печать…'
      ) : (
        <>
          <Printer className="w-4 h-4 mr-1" /> Печать
        </>
      )}
    </button>
  );
};

export default PrintReportButton;