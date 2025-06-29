// borrow-records.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BorrowRecord } from './borrow-record.entity';

@Injectable()
export class BorrowRecordsService {
  constructor(
    @InjectRepository(BorrowRecord)
    private readonly borrowRecordRepository: Repository<BorrowRecord>,
  ) {}

  /* ---------- общие SQL-выражения ---------- */
  /** активная (не возвращённая) запись */
  private static readonly activeExpr = 'record.returnDate IS NULL';

  /** просрочка — не возвращена и истёк due/expectedReturn */
  private static readonly overdueExpr = `
    record.returnDate IS NULL
    AND COALESCE(record.dueDate, record.expectedReturnDate) < CURRENT_DATE
  `;

  /* ------------------------------------------------------------------ */
  /*                     СОЗДАНИЕ / ВОЗВРАТ КНИГ                         */
  /* ------------------------------------------------------------------ */
  async createBorrowRecord(
    bookCopyId: number,
    personId: number,
    issuedByUserId: number,
    dueDate: string,
  ): Promise<BorrowRecord> {
    const today = new Date();
    const expectedReturn = new Date(today);
    expectedReturn.setFullYear(expectedReturn.getFullYear() + 1);

    const record = this.borrowRecordRepository.create({
      bookCopy: { id: bookCopyId } as any,
      person: { id: personId } as any,
      issuedByUser: { id: issuedByUserId } as any,
      borrowDate: today.toISOString().split('T')[0],
      dueDate: dueDate,
      expectedReturnDate: expectedReturn.toISOString().split('T')[0],
      returnDate: null,
    });

    return this.borrowRecordRepository.save(record);
  }

  async returnBook(
    recordId: number,
    acceptedByUserId: number,
  ): Promise<BorrowRecord> {
    const record = await this.borrowRecordRepository.findOne({
      where: { id: recordId },
      relations: ['bookCopy', 'person', 'issuedByUser', 'acceptedByUser'],
    });
    if (!record) throw new Error('Запись о выдаче не найдена');

    record.returnDate     = new Date().toISOString().split('T')[0];
    record.acceptedByUser = { id: acceptedByUserId } as any;
    return this.borrowRecordRepository.save(record);
  }

  /* ------------------------------------------------------------------ */
  /*                             ГЕТТЕРЫ                                 */
  /* ------------------------------------------------------------------ */

  findAll(): Promise<BorrowRecord[]> {
    return this.borrowRecordRepository.find({
      relations: [
        'bookCopy',
        'bookCopy.book',
        'person',
        'issuedByUser',
        'acceptedByUser',
      ],
    });
  }

  findOne(id: number): Promise<BorrowRecord | null> {
    return this.borrowRecordRepository.findOne({
      where: { id },
      relations: [
        'bookCopy',
        'bookCopy.book',
        'person',
        'issuedByUser',
        'acceptedByUser',
      ],
    });
  }

  /** записи конкретного читателя */
  async findByPerson(
    personId: number,
    opts: { onlyActive?: boolean; onlyDebts?: boolean } = {},
  ): Promise<BorrowRecord[]> {
    const { onlyActive = false, onlyDebts = false } = opts;

    const qb = this.borrowRecordRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.bookCopy', 'bookCopy')
      .leftJoinAndSelect('bookCopy.book', 'book')
      .leftJoinAndSelect('book.authors', 'author')
      .leftJoinAndSelect('record.person', 'person')
      .leftJoinAndSelect('record.issuedByUser', 'issuedByUser')
      .leftJoinAndSelect('record.acceptedByUser', 'acceptedByUser')
      .where('person.id = :personId', { personId });

    if (onlyActive) qb.andWhere(BorrowRecordsService.activeExpr);
    if (onlyDebts)  qb.andWhere(BorrowRecordsService.overdueExpr);

    qb.orderBy('record.borrowDate', 'ASC').addOrderBy('record.id', 'ASC');
    return qb.getMany();
  }

  /* ------------------------------------------------------------------ */
  /*             ПАГИНАЦИЯ / ПОИСК / СОРТИРОВКА                          */
  /* ------------------------------------------------------------------ */

  async findAllPaginated(
    search: string,
    searchColumn: string,
    onlyDebts: boolean,
    page: number,
    limit: number,
    sort: string,
  ): Promise<{ data: BorrowRecord[]; total: number; page: number; limit: number }> {
    const qb = this.borrowRecordRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.bookCopy', 'bookCopy')
      .leftJoinAndSelect('bookCopy.book', 'book')
      .leftJoinAndSelect('record.person', 'person')
      .leftJoinAndSelect('record.issuedByUser', 'issuedByUser')
      .leftJoinAndSelect('record.acceptedByUser', 'acceptedByUser');

    if (onlyDebts) qb.andWhere(BorrowRecordsService.overdueExpr);

    /* ---------- поиск ---------- */
    const colMap: Record<string, string> = {
      title:              'book.title',
      inventoryNo:        'bookCopy.inventoryNo',
      person:             "concat_ws(' ', person.lastName, person.firstName, person.patronymic)",
      borrowDate:         'record.borrowDate::text',
      expectedReturnDate: 'record.expectedReturnDate::text',
      returnDate:         'record.returnDate::text',
      issuedByUser:       'issuedByUser.username',
      acceptedByUser:     'acceptedByUser.username',
    };

    if (search) {
      if (searchColumn && colMap[searchColumn]) {
        qb.andWhere(`${colMap[searchColumn]} ILIKE :searchExact`, {
          searchExact: `%${search}%`,
        });
      } else {
        qb.andWhere(
          `(book.title ILIKE :s
          OR bookCopy.inventoryNo ILIKE :s
          OR concat_ws(' ', person.lastName, person.firstName, person.patronymic) ILIKE :s
          OR record.borrowDate::text ILIKE :s
          OR record.expectedReturnDate::text ILIKE :s
          OR record.returnDate::text ILIKE :s
          OR issuedByUser.username ILIKE :s
          OR acceptedByUser.username ILIKE :s)`,
          { s: `%${search}%` },
        );
      }
    }

    /* ---------- сортировка ---------- */
    const allowedSorts: Record<
      string,
      { expr: string; type: 'text' | 'date' }
    > = {
      title:              { expr: 'book.title',                                    type: 'text' },
      inventoryNo:        { expr: 'bookCopy.inventoryNo',                          type: 'text' },
      person:             { expr: "concat_ws(' ', person.lastName, person.firstName, person.patronymic)", type: 'text' },
      borrowDate:         { expr: 'record.borrowDate',                             type: 'date' },
      expectedReturnDate: { expr: 'record.expectedReturnDate',                     type: 'date' },
      returnDate:         { expr: 'record.returnDate',                             type: 'date' },
      issuedByUser:       { expr: 'issuedByUser.username',                         type: 'text' },
      acceptedByUser:     { expr: 'acceptedByUser.username',                       type: 'text' },
    };

    if (sort) {
      const [field, orderRaw] = sort.split('.');
      const direction = orderRaw === 'desc' ? 'DESC' : 'ASC';

      if (allowedSorts[field]) {
        const { expr, type } = allowedSorts[field];

        if (type === 'text') {
          const orderAlias = `${field}_order`.toLowerCase();
          qb.addSelect(`LOWER(${expr})`, orderAlias);
          qb.addOrderBy(orderAlias, direction, 'NULLS LAST');
        } else {
          qb.addOrderBy(expr, direction, 'NULLS LAST');
        }
      } else {
        qb.addOrderBy('record.id', 'ASC', 'NULLS LAST');
      }
    } else {
      qb.addOrderBy('record.id', 'ASC', 'NULLS LAST');
    }

    /* ---------- пагинация ---------- */
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }
}