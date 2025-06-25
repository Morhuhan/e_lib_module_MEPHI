import {
  Entity, JoinColumn, ManyToOne, PrimaryColumn,
} from 'typeorm';
import { Book } from 'src/books/book.entity';

@Entity('book_grnti_raw')
export class BookGrntiRaw {
  @PrimaryColumn({ name: 'book_id' })
  bookId: number;

  @PrimaryColumn({ name: 'grnti_code' })
  grntiCode: string;

  /* ─────────── связь ─────────── */
  @ManyToOne(() => Book, (book) => book.grntiRaws, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'book_id' })
  book: Book;
}