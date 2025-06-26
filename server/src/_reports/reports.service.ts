import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BorrowRecord } from '../borrow-records/borrow-record.entity';
import { Book }          from '../books/book.entity';
import { BookCopy }      from '../book-copies/book-copy.entity';
import { Udc }           from '../udc/udc.entity';
import { NoCopiesDto, UdcProvisionDto } from './reports.controller';



@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(BorrowRecord) private readonly borrowRepo: Repository<BorrowRecord>,
    @InjectRepository(Book)         private readonly bookRepo  : Repository<Book>,
    @InjectRepository(BookCopy)     private readonly copyRepo  : Repository<BookCopy>,
    @InjectRepository(Udc)          private readonly udcRepo   : Repository<Udc>,
  ) {}

  /* ───────────── 1. Невозвращённые ───────────── */
  async getUnreturned() {
    return this.borrowRepo.find({
      where:  { returnDate: null },
      relations: [
        'bookCopy', 'bookCopy.book',
        'person', 'issuedByUser', 'acceptedByUser',
      ],
      order: { borrowDate: 'ASC', id: 'ASC' },
    });
  }

  /* ───────────── 2. Книги без экземпляров ───────────── */
  async getBooksWithoutCopies(): Promise<NoCopiesDto[]> {
    const rows = await this.bookRepo
      .createQueryBuilder('b')
      /* экземпляры */
      .leftJoin('book_copy', 'bc', 'bc.book_id = b.id')
      /* активные выдачи */
      .leftJoin(
        'borrow_record',
        'br',
        'br.book_copy_id = bc.id AND br.return_date IS NULL',
      )
      .select('b.id', 'id')
      .addSelect('b.title', 'title')
      .addSelect('COUNT(DISTINCT bc.id)', 'copiesCount')
      .addSelect('COUNT(br.id)',          'borrowedNow')
      .groupBy('b.id')
      /* нужны книги, у которых нет свободных экземпляров */
      .having(
        '(COUNT(DISTINCT bc.id) = 0) OR (COUNT(DISTINCT bc.id) = COUNT(br.id))',
      )
      .orderBy('LOWER(b.title)', 'ASC')
      .getRawMany();

    return rows.map((r) => ({
      id:           Number(r.id),
      title:        r.title,
      copiesCount:  Number(r.copiesCount),
      borrowedNow:  Number(r.borrowedNow),
      reason:       Number(r.copiesCount) === 0 ? 'списаны' : 'выданы',
    }));
  }

  /* ───────────── 3. Книгообеспеченность по УДК ─────────────
     Из-за бага TypeORM заменили «relation-path» join’ы на
     явные соединения через таблицы. */
  async getUdcProvision(): Promise<UdcProvisionDto[]> {
    const rows = await this.udcRepo
      .createQueryBuilder('u')
      .innerJoin('book_udc', 'bu', 'bu.udc_id = u.id')
      .innerJoin('book',     'b',  'b.id = bu.book_id')
      .leftJoin('book_copy', 'bc', 'bc.book_id = b.id')
      .select('u.udc_abb',      'udcAbb')
      .addSelect('u.description','description')
      .addSelect('COUNT(DISTINCT b.id)', 'booksCount')
      .addSelect('COUNT(bc.id)',         'copiesCount')
      .groupBy('u.id')
      .addGroupBy('u.udc_abb')
      .addGroupBy('u.description')
      .orderBy('u.udc_abb', 'ASC')
      .getRawMany();

    return rows.map((r) => ({
      udcAbb:      r.udcAbb,
      description: r.description,
      booksCount:  Number(r.booksCount),
      copiesCount: Number(r.copiesCount),
    }));
  }
}