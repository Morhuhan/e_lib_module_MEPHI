// src/book-copies/book-copies.service.ts
import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { BookCopy } from './book-copy.entity';

@Injectable()
export class BookCopiesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(BookCopy)
    private readonly copyRepo: Repository<BookCopy>,
  ) {}

  /* ---------- базовый QueryBuilder ---------- */
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
  findAll() {
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

  findOne(id: number) {
    return this.copyRepo.findOne({
      where: { id },
      relations: ['book', 'book.authors', 'borrowRecords'],
    });
  }

  async create(data: Partial<BookCopy>) {
    const copy = this.copyRepo.create(data);
    return this.copyRepo.save(copy);
  }

  async update(id: number, data: Partial<BookCopy>) {
    await this.copyRepo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.copyRepo.delete(id);
  }

  /* ---------- поиск по инвентарному номеру ---------- */
  findByInventoryNo(inventoryNo: string) {
    return this.copyRepo.findOne({
      where: { inventoryNo },
      relations: ['book', 'book.authors', 'borrowRecords'],
    });
  }

  /* ---------- копии конкретной книги ---------- */
  async findByBook(bookId: number, onlyFree = false) {
    const qb = this.baseIdsQuery()
      .select('copy.id', 'id')
      .where('book.id = :bookId', { bookId });

    if (onlyFree) {
      qb.andWhere(`
        NOT EXISTS (
          SELECT 1
          FROM borrow_record br2
          WHERE br2.book_copy_id = copy.id
            AND br2.return_date   IS NULL
        )
      `);
    }

    const ids = await qb.getRawMany<{ id: number }>().then(r => r.map(x => x.id));
    if (!ids.length) return [];

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

    const byId = new Map(copies.map(c => [c.id, c]));
    return ids.map(id => byId.get(id)!);
  }

  /* ---------- пагинация с поиском / фильтрами ---------- */
  async findPaginated(
    search = '',
    searchColumn = '',
    onlyAvailable = false,
    onlyIssued   = false,
    page  = 1,
    limit = 10,
    sort  = '',
  ) {
    if (onlyAvailable && onlyIssued) {
      throw new BadRequestException(
        'Параметры onlyAvailable и onlyIssued не могут быть одновременно true',
      );
    }

    /* 1. база */
    const qb = this.baseIdsQuery()
      .select('copy.id', 'id')
      .groupBy('copy.id');

    /* 2. поиск --------------------------------------------------------- */
    if (search) {
      const statusExpr = `
        CASE
          WHEN MAX(
                 CASE
                   WHEN br.id IS NOT NULL
                    AND br.return_date IS NULL THEN 1
                   ELSE 0
                 END
               ) = 1
            THEN 'выдан'
          ELSE 'в наличии'
        END
      `;

      const colMap: Record<string, string> = {
        inventoryNo : 'copy.inventoryNo',
        bookTitle   : 'book.title',
        title       : 'book.title',
        authors     : "concat_ws(' ', a.last_name, a.first_name, a.patronymic)",
        receiptDate : "to_char(copy.receipt_date,'YYYY-MM-DD')",
        storagePlace: 'copy.storage_place',
        price       : "to_char(copy.price,'999999999D99')",
        status      : statusExpr,
      };

      const param = { s: `%${search}%` };

      if (searchColumn && colMap[searchColumn]) {
        const expr    = colMap[searchColumn];
        const usesAgg = /max|min|sum|avg|string_agg|concat_ws|count/i.test(expr);

        /* --- ключевое исправление: вызываем нужный метод напрямую --- */
        if (usesAgg) {
          qb.having(`${expr} ILIKE :s`, param);   // ← контекст сохранён
        } else {
          qb.where(`${expr} ILIKE :s`, param);
        }
      } else {
        qb.where(
          `(copy.inventoryNo ILIKE :s
            OR book.title    ILIKE :s
            OR a.last_name   ILIKE :s
            OR a.first_name  ILIKE :s
            OR a.patronymic  ILIKE :s
            OR copy.storage_place ILIKE :s
            OR to_char(copy.receipt_date,'YYYY-MM-DD') ILIKE :s
            OR to_char(copy.price,'999999999D99') ILIKE :s)`,
          param,
        );
        /* статус остаётся только в HAVING, т.к. использует агрегат */
      }
    }

    /* 3. фильтры доступности ----------------------------------------- */
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

    /* 4. сортировка --------------------------------------------------- */
    const statusFlag = `
      MAX(
        CASE
          WHEN br.id IS NOT NULL
           AND br.return_date IS NULL THEN 1
          ELSE 0
        END
      )
    `;

    const allowed: Record<string, { col: string; type: 'text' | 'number' | 'date' }> = {
      inventoryNo : { col: 'MIN(copy.inventoryNo)', type: 'text' },
      bookTitle   : { col: 'MIN(book.title)',       type: 'text' },
      title       : { col: 'MIN(book.title)',       type: 'text' },
      authors     : { col: "string_agg(DISTINCT a.last_name, ',')", type: 'text' },
      receiptDate : { col: 'MIN(copy.receipt_date)', type: 'date' },
      storagePlace: { col: 'MIN(copy.storage_place)', type: 'text' },
      price       : { col: 'MIN(copy.price)',          type: 'number' },
      status      : { col: statusFlag,                 type: 'number' }, // 0/1
      id          : { col: 'copy.id',                  type: 'number' },
    };

    const [field, dirRaw] = sort.split('.');
    const rule = allowed[field];
    if (rule) {
      const dir: 'ASC' | 'DESC' = dirRaw === 'desc' ? 'DESC' : 'ASC';
      if (rule.type === 'text') {
        qb.orderBy(`CASE WHEN ${rule.col} ~ '^[A-ZА-Я]' THEN 0 ELSE 1 END`, 'ASC')
          .addOrderBy(`LOWER(${rule.col})`, dir);
      } else {
        qb.orderBy(rule.col, dir);
      }
    } else {
      qb.orderBy('copy.id', 'ASC');
    }

    /* 5. общее количество -------------------------------------------- */
    const total = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'cnt')
      .from('(' + qb.getQuery() + ')', 'sub')
      .setParameters(qb.getParameters())
      .getRawOne<{ cnt: string }>()
      .then(r => Number(r.cnt));

    /* 6. id выбранной страницы --------------------------------------- */
    const ids = await qb.clone()
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<{ id: number }>()
      .then(r => r.map(x => x.id));

    if (!ids.length) return { data: [], total, page, limit };

    /* 7. финальная выборка ------------------------------------------- */
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

    const byId = new Map(copies.map(c => [c.id, c]));
    return {
      data : ids.map(id => byId.get(id)!),
      total,
      page,
      limit,
    };
  }
}