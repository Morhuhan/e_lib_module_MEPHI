// src/utils/interfaces.tsx
// Актуально на 22 июня 2025 г. — синхронизировано со схемой PostgreSQL
import { z, ZodType } from 'zod';
import { FieldConfig } from '../components/CRUDmodal.tsx';

/* ─────────────────────────── базовые ─────────────────────────── */

export interface User {
  id: number;
  username: string;
  /** Может отсутствовать в ответах API */
  pass?: string;
  roleId?: number;
}

export interface Person {
  id: number;
  firstName: string;
  lastName: string;
  patronymic?: string | null;
  sex: string;
  birthDate: string;
  inn?: number | null;
  snils?: string | null;
  email?: string | null;
  military?: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginationProps {
  page: number;
  totalPages: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  onLimitChange: (newLimit: number) => void;
}

export interface ErrorResponse {
  message?: string;
  error?: string;
}

/* ────────────────────────── доменные ────────────────────────── */

export interface Author {
  id: number;
  firstName?: string | null;
  patronymic?: string | null;
  lastName: string;
  birthYear?: number | null;
  fullName?: string;
}

export interface Bbk {
  id: number;
  bbkAbb: string;
  description?: string | null;
}

export interface Udc {
  id: number;
  udcAbb: string;
  description?: string | null;
}

export interface Grnti {
  id: number;
  /** Код ГРНТИ */
  code: string;
  description?: string | null;
}

/* ─────────────── RAW-связи (без ссылочной целостности) ─────────────── */

export interface BookBbkRaw {
  bookId: number;
  bbkCode: string;
}

export interface BookUdcRaw {
  bookId: number;
  udcCode: string;
}

export interface BookGrntiRaw {
  bookId: number;
  grntiCode: string;
}

/* ─────────────────────── публикационные данные ─────────────────────── */

export interface Publisher {
  id: number;
  name: string;
}

export interface BookPubPlace {
  id: number;
  bookId: number;
  publisher?: Publisher | null;
  city?: string | null;
  /** Год издания (NOT NULL в БД) */
  pubYear: number;
}

/* ──────────────────────── книги и экземпляры ──────────────────────── */

export interface Book {
  id: number;
  title: string;
  description?: string | null;
  bookType?: string | null;
  edit?: string | null;
  editionStatement?: string | null;
  physDesc?: string | null;
  series?: string | null;
  authors?: Author[] | null;
  bbks?: Bbk[] | null;
  udcs?: Udc[] | null;
  grntis?: Grnti[] | null;
  bbkRaws?: BookBbkRaw[] | null;
  udcRaws?: BookUdcRaw[] | null;
  grntiRaws?: BookGrntiRaw[] | null;
  grntiAbbs?: string | null;
  bookCopies?: BookCopy[] | null;
  publicationPlaces?: BookPubPlace[] | null;
}

export interface BookCopy {
  id: number;
  inventoryNo: string;
  receiptDate?: string | null;
  storagePlace?: string | null;
  price?: number | null;
  book?: {
    id: number;
    title: string;
    authors?: Author[];
    publicationPlaces?: {
      city?: string | null;
      pubYear: number;
      publisher?: { name?: string | null } | null;
    }[];
  } | null;

  borrowRecords?: BorrowRecord[];
}

/* ────────────────────────── учёт выдач ────────────────────────── */

export interface BorrowRecord {
  id: number;
  borrowDate: string;
  dueDate: string;
  expectedReturnDate: string;
  returnDate?: string | null;
  person?: Person | null;
  issuedByUser?: User;
  acceptedByUser?: User | null;
  bookCopy: BookCopy;
}

/* ======================================================================
   Zod-схемы для экранных форм
   ====================================================================== */

/* ───────────── схема формы книги ───────────── */

export const bookSchema = z.object({
  title: z.string().trim().min(1, { message: 'Название обязательно' }),
  bookType: z.string().optional(),
  edit: z.string().optional(),
  editionStatement: z.string().optional(),
  series: z.string().optional(),
  physDesc: z.string().optional(),
  description: z.string().optional(),
  authors: z.string().optional(),
  bbkAbbs: z.string().optional(),
  udcAbbs: z.string().optional(),
  grntiAbbs: z.string().optional(),
  bbkRaw: z.string().optional(),
  udcRaw: z.string().optional(),
  grntiRaw: z.string().optional(),
  pubCity: z.string().optional(),
  pubName: z.string().optional(),
  pubYear: z.number().int().nullable().optional(),
});

export const bookFields: FieldConfig[] = [
  { name: 'title',            label: 'Название *', required: true },
  { name: 'bookType',         label: 'Тип' },
  { name: 'edit',             label: 'Редакция' },
  { name: 'editionStatement', label: 'Сведения об изд.' },
  { name: 'series',           label: 'Серия' },
  { name: 'physDesc',         label: 'Характеристики', kind: 'textarea' },
  { name: 'description',      label: 'Описание',       kind: 'textarea' },
  { name: 'pubCity', label: 'Город' },
  { name: 'pubName', label: 'Издатель' },
  { name: 'pubYear', label: 'Год', kind: 'number', inputProps: { min: 1000, max: 3000, step: 1 } },
  { name: 'authors',   kind: 'hidden' },
  { name: 'bbkAbbs',   kind: 'hidden' },
  { name: 'udcAbbs',   kind: 'hidden' },
  { name: 'grntiAbbs', kind: 'hidden' },
];

export type BookFormValues = z.infer<typeof bookSchema>;
export type FormValues = BookFormValues;

/* ───────────── схема формы экземпляра ───────────── */

export type CopyFormValues = {
  bookId: number;
  inventoryNo: string;
  receiptDate?: string;
  storagePlace?: string;
  price?: number;
};

export const copySchema: ZodType<CopyFormValues> = z.object({
  bookId: z.number().int().positive({ message: 'Книга обязательна' }),
  inventoryNo: z.string().trim().min(1, { message: 'Инвентарный № обязателен' }),
  receiptDate: z.string().trim().optional(),
  storagePlace: z.string().trim().optional(),
  pubYear: z.number().int().optional(),
  price: z.number().nonnegative({ message: 'Цена не может быть отрицательной' }).optional(),
});

/* ───────────── схема формы выдачи ───────────── */

export const borrowRecordSchema = z.object({
  bookCopyId: z.number({ required_error: 'Экземпляр обязателен' }).int().positive(),
  personId: z.number({ required_error: 'Читатель обязателен' }).int().positive(),
  dueDate: z
    .string({ required_error: 'Дата возврата обязательна' })
    .trim()
    .min(1, { message: 'Дата возврата обязательна' }),
});

export type BorrowRecordFormValues = z.infer<typeof borrowRecordSchema>;