import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Book } from 'src/books/book.entity';

@Entity('grnti')
export class Grnti {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'grnti_code', unique: true })
  code: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  /* ─────────── связи ─────────── */
  @ManyToMany(() => Book, (book) => book.grntis)
  books: Book[];
}