/* reports.service.ts */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  IsNull,               // ← добавили
} from 'typeorm';

import { BorrowRecord } from '../borrow-records/borrow-record.entity';
import { Book }          from '../books/book.entity';
import { BookCopy }      from '../book-copies/book-copy.entity';
import { Udc }           from '../udc/udc.entity';
import {
  NoCopiesDto,
  UdcProvisionDto,
} from './reports.controller';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(BorrowRecord)
    private readonly borrowRepo: Repository<BorrowRecord>,
    @InjectRepository(Book)
    private readonly bookRepo: Repository<Book>,
    @InjectRepository(BookCopy)
    private readonly copyRepo: Repository<BookCopy>,
    @InjectRepository(Udc)
    private readonly udcRepo: Repository<Udc>,
  ) {}

  /* ───────────── 1. Невозвращённые экземпляры ─────────────
     accepted_by_user_id IS NULL — книги ещё не принято обратно. */
  async getUnreturned(): Promise<BorrowRecord[]> {
    return this.borrowRepo.find({
      where: { acceptedByUser: IsNull() },            // ← главное исправление
      relations: [
        'bookCopy',
        'bookCopy.book',
        'person',
        'issuedByUser',
        'acceptedByUser',
      ],
      order: { borrowDate: 'ASC', id: 'ASC' },
    });
  }

  /* ───────────── 2. Книги без свободных экземпляров ─────────────
     Учитываем только активные (ещё не принятые) выдачи. */
  async getBooksWithoutCopies(): Promise<NoCopiesDto[]> {
    const rows = await this.bookRepo
      .createQueryBuilder('b')
      /* все экземпляры */
      .leftJoin('book_copy', 'bc', 'bc.book_id = b.id')
      /* выданные (ещё не принятые обратно) экземпляры */
      .leftJoin(
        'borrow_record',
        'br',
        'br.book_copy_id = bc.id AND br.accepted_by_user_id IS NULL',
      )
      .select('b.id', 'id')
      .addSelect('b.title', 'title')
      .addSelect('COUNT(DISTINCT bc.id)', 'copiesCount')
      .addSelect('COUNT(br.id)', 'borrowedNow')
      .groupBy('b.id')
      /* выводим книги, у которых экземпляров нет
         ИЛИ все имеющиеся сейчас выданы */
      .having(
        '(COUNT(DISTINCT bc.id) = 0) OR (COUNT(DISTINCT bc.id) = COUNT(br.id))',
      )
      .orderBy('LOWER(b.title)', 'ASC')
      .getRawMany();

    return rows.map((r) => ({
      id:          Number(r.id),
      title:       r.title,
      copiesCount: Number(r.copiesCount),
      borrowedNow: Number(r.borrowedNow),
      reason:      Number(r.copiesCount) === 0 ? 'списаны' : 'выданы',
    }));
  }

  /* ───────────── 3. Книгообеспеченность по УДК ─────────────
     Считаем все экземпляры, независимо от статуса. */
  async getUdcProvision(): Promise<UdcProvisionDto[]> {
    const rows = await this.udcRepo
      .createQueryBuilder('u')
      .innerJoin('book_udc', 'bu', 'bu.udc_id = u.id')
      .innerJoin('book', 'b', 'b.id = bu.book_id')
      .leftJoin('book_copy', 'bc', 'bc.book_id = b.id')
      .select('u.udc_abb', 'udcAbb')
      .addSelect('u.description', 'description')
      .addSelect('COUNT(DISTINCT b.id)', 'booksCount')
      .addSelect('COUNT(bc.id)', 'copiesCount')
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