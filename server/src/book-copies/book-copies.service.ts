// book-copies.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';

import { BookCopy }  from './book-copy.entity';

@Injectable()
export class BookCopiesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(BookCopy)
    private readonly copyRepo: Repository<BookCopy>,
  ) {}

  /* ---------- базовый запрос ---------- */
private baseIdsQuery(): SelectQueryBuilder<BookCopy> {
  return this.copyRepo
    .createQueryBuilder('copy')
    .leftJoin('copy.book', 'book')
    .leftJoin('book.authors', 'a')
    .leftJoin('book.publicationPlaces', 'pp')
    .leftJoin('pp.publisher', 'pub')
    .leftJoin('copy.borrowRecords', 'br');
}

  /* ---------- CRUD ---------- */
  findAll(): Promise<BookCopy[]> {
    return this.copyRepo.find({
      relations: [
        'book',
        'book.authors',
        'book.publicationPlaces',
        'book.publicationPlaces.publisher',
        'borrowRecords',
      ],
    });
  }

  findOne(id: number): Promise<BookCopy | null> {
    return this.copyRepo.findOne({
      where: { id },
      relations: ['book', 'book.authors', 'borrowRecords'],
    });
  }

  async create(data: Partial<BookCopy>): Promise<BookCopy> {
    const copy = this.copyRepo.create(data);
    return this.copyRepo.save(copy);
  }

  async update(id: number, data: Partial<BookCopy>): Promise<BookCopy | null> {
    await this.copyRepo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.copyRepo.delete(id);
  }

  /* ---------- поиск по инвентарному номеру ---------- */
  findByInventoryNo(inventoryNo: string): Promise<BookCopy | null> {
    return this.copyRepo.findOne({
      where: { inventoryNo },
      relations: ['book', 'book.authors', 'borrowRecords'],
    });
  }

/* ---------- НОВЫЙ МЕТОД ДЛЯ ВЫБОРА КОПИЙ КОНКРЕТНОЙ КНИГИ ---------- */
async findByBook(bookId: number, onlyFree = false): Promise<BookCopy[]> {
  /* --- собрать id нужных экземпляров --- */
  const qb = this.baseIdsQuery()
    .select('copy.id', 'id')
    // уже есть   .leftJoin('copy.book', 'book')  в baseIdsQuery()
    .where('book.id = :bookId', { bookId });   // <-- исправлено

  if (onlyFree) {
    qb.andWhere(`
      NOT EXISTS (
        SELECT 1
        FROM borrow_record br2
        WHERE br2.book_copy_id = copy.id
          AND br2.return_date IS NULL
      )
    `);
  }

  const ids = await qb.getRawMany<{ id: number }>().then(r => r.map(x => x.id));
  if (!ids.length) return [];

  /* --- получить сами экземпляры, сохранив порядок --- */
  const copies = await this.copyRepo.find({
    where: { id: In(ids) },
    relations: [
      'book',
      'book.authors',
      'book.publicationPlaces',
      'book.publicationPlaces.publisher',
      'borrowRecords',
    ],
  });

  const byId = new Map<number, BookCopy>(copies.map(c => [c.id, c]));
  return ids.map(id => byId.get(id)!);
}

  /* ---------- расширенная пагинация ---------- */
  async findPaginated(
    search = '',
    searchColumn = '',
    onlyAvailable = false,
    onlyIssued   = false,
    page  = 1,
    limit = 10,
    sort  = '',
  ): Promise<{ data: BookCopy[]; total: number; page: number; limit: number }> {
    if (onlyAvailable && onlyIssued) {
      throw new BadRequestException(
        'Параметры onlyAvailable и onlyIssued не могут быть одновременно true',
      );
    }

    /* --- собрать id подходящих экземпляров --- */
    const qb = this.baseIdsQuery()
      .select('copy.id', 'id')
      .groupBy('copy.id');

    /* --- поиск --- */
    if (search) {
      const colMap: Record<string, string> = {
        inventoryNo: 'copy.inventoryNo',
        title:       'book.title',
        authors:     "concat_ws(' ', a.last_name, a.first_name, a.patronymic)",
      };

      if (searchColumn && colMap[searchColumn]) {
        const expr   = colMap[searchColumn];
        const param  = { s: `%${search}%` };
        const usesAgg = /string_agg|count|sum|min|max|avg/i.test(expr);

        if (usesAgg) qb.having(`${expr} ILIKE :s`, param);
        else         qb.where (`${expr} ILIKE :s`, param);
      } else {
        qb.where(
          `(copy.inventoryNo ILIKE :s
            OR book.title     ILIKE :s
            OR a.last_name    ILIKE :s
            OR a.first_name   ILIKE :s
            OR a.patronymic   ILIKE :s)`,
          { s: `%${search}%` },
        );
      }
    }

    /* --- фильтры доступности / выдачи --- */
    if (onlyIssued) {
      qb.andWhere(`
        EXISTS (
          SELECT 1
          FROM borrow_record br2
          WHERE br2.book_copy_id = copy.id
            AND br2.return_date  IS NULL
        )
      `);
    }

    if (onlyAvailable) {
      qb.andWhere(`
        NOT EXISTS (
          SELECT 1
          FROM borrow_record br2
          WHERE br2.book_copy_id = copy.id
            AND br2.return_date  IS NULL
        )
      `);
    }

    /* --- сортировка --- */
    const allowed: Record<string, { col: string; type: 'text' | 'number' }> = {
      inventoryNo: { col: 'MIN(copy.inventoryNo)', type: 'text' },
      title:       { col: 'MIN(book.title)',       type: 'text' },
      authors:     { col: "string_agg(DISTINCT a.last_name, ',')", type: 'text' },
      id:          { col: 'copy.id', type: 'number' },
    };

    const [field, dirRaw] = sort.split('.');
    if (allowed[field]) {
      const { col, type } = allowed[field];
      const dir: 'ASC' | 'DESC' = dirRaw === 'desc' ? 'DESC' : 'ASC';
      if (type === 'text') {
        qb.orderBy(`CASE WHEN ${col} ~ '^[A-ZА-Я]' THEN 0 ELSE 1 END`, 'ASC')
          .addOrderBy(`LOWER(${col})`, dir);
      } else qb.orderBy(col, dir);
    } else qb.orderBy('copy.id', 'ASC');

    /* --- общее количество --- */
    const total = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'cnt')
      .from('(' + qb.getQuery() + ')', 'sub')
      .setParameters(qb.getParameters())
      .getRawOne<{ cnt: string }>()
      .then(r => Number(r.cnt));

    /* --- ids текущей страницы --- */
    const ids = await qb.clone()
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<{ id: number }>()
      .then(rows => rows.map(r => r.id));

    if (!ids.length) return { data: [], total, page, limit };

    /* --- окончательная выборка экземпляров --- */
    const copies = await this.copyRepo.find({
      where: { id: In(ids) },
      relations: [
        'book',
        'book.authors',
        'book.publicationPlaces',
        'book.publicationPlaces.publisher',
        'borrowRecords',
      ],
    });

    /* сохранить порядок согласно ids */
    const byId = new Map<number, BookCopy>(copies.map(c => [c.id, c]));
    return {
      data : ids.map(id => byId.get(id)!),
      total,
      page,
      limit,
    };
  }

  
}