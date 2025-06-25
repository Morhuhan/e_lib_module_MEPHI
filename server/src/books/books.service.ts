import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  Repository,
  SelectQueryBuilder,
  QueryRunner,
} from 'typeorm';

import { Book }            from './book.entity';
import { Author }          from 'src/authors/author.entity';
import { Bbk }             from 'src/bbk/bbk.entity';
import { Udc }             from 'src/udc/udc.entity';
import { Grnti }           from 'src/grnti/grnti.entity';
import { Publisher }       from 'src/publisher/publisher.entity';
import { BookPubPlace }    from 'src/book_pub_place/book-pub-place.entity';
import { BookBbkRaw }      from 'src/bbk_raw/book-bbk-raw.entity';
import { BookUdcRaw }      from 'src/udc_raw/book-udc-raw.entity';
import { BookGrntiRaw }    from 'src/grnti_raw/book-grnti-raw.entity';
import { BorrowRecord }    from 'src/borrow-records/borrow-record.entity';


@Injectable()
export class BooksService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Book)         private readonly bookRepo:     Repository<Book>,
    @InjectRepository(Author)       private readonly authorRepo:   Repository<Author>,
    @InjectRepository(Bbk)          private readonly bbkRepo:      Repository<Bbk>,
    @InjectRepository(Udc)          private readonly udcRepo:      Repository<Udc>,
    @InjectRepository(Grnti)        private readonly grntiRepo:    Repository<Grnti>,
    @InjectRepository(BookBbkRaw)   private readonly bbkRawRepo:   Repository<BookBbkRaw>,
    @InjectRepository(BookUdcRaw)   private readonly udcRawRepo:   Repository<BookUdcRaw>,
    @InjectRepository(BookGrntiRaw) private readonly grntiRawRepo: Repository<BookGrntiRaw>,
    @InjectRepository(Publisher)    private readonly pubRepo:      Repository<Publisher>,
    @InjectRepository(BookPubPlace) private readonly pubPlaceRepo: Repository<BookPubPlace>,
    @InjectRepository(BorrowRecord) private readonly borrowRepo:   Repository<BorrowRecord>,
  ) {}

  private baseIdsQuery(): SelectQueryBuilder<Book> {
    return this.bookRepo
      .createQueryBuilder('book')
      .leftJoin('book.authors',           'a')
      .leftJoin('book.bbks',              'bbk')
      .leftJoin('book.udcs',              'udc')
      .leftJoin('book.grntis',            'grnti')
      .leftJoin('book.bbkRaws',           'bbr')
      .leftJoin('book.udcRaws',           'udr')
      .leftJoin('book.grntiRaws',         'grr')
      .leftJoin('book.publicationPlaces', 'pp')
      .leftJoin('pp.publisher',           'pub')
      .leftJoin('book.bookCopies',        'bc')
      .leftJoin('bc.borrowRecords',       'br');
  }

  async findPaginated(
    search = '',
    searchColumn = '',
    onlyAvailable = false,
    onlyIssued = false,
    page = 1,
    limit = 10,
    sort = '',
  ): Promise<{ data: Book[]; total: number; page: number; limit: number }> {
    if (onlyAvailable && onlyIssued) {
      throw new BadRequestException(
        'Параметры onlyAvailable и onlyIssued не могут быть одновременно true',
      );
    }

    const qb = this.baseIdsQuery()
      .select('book.id', 'id')
      .groupBy('book.id');

    if (search) {
      const colMap: Record<string, string> = {
        title:      'book.title',
        description:'book.description',
        authors:    "concat_ws(' ', a.last_name, a.first_name, a.patronymic)",
        bookType:   'book.type',
        edit:       'book.edit',
        series:     'book.series',
        physDesc:   'book.phys_desc',
        bbks:       "string_agg(distinct bbk.bbk_abb, ',')",
        udcs:       "string_agg(distinct udc.udc_abb, ',')",
        grntis:     "string_agg(distinct grnti.grnti_code, ',')",
        grntiAbbs:  "string_agg(distinct grnti.grnti_code, ',')",
        bbkRaws:    "string_agg(distinct bbr.bbk_code, ',')",
        udcRaws:    "string_agg(distinct udr.udc_code, ',')",
        grntiRaws:  "string_agg(distinct grr.grnti_code, ',')",
        publicationPlaces:
          "string_agg(distinct concat_ws(' ', pp.city, pub.name, pp.pub_year), ',')",
      };

      if (searchColumn && colMap[searchColumn]) {
        const expr   = colMap[searchColumn];
        const param  = { s: `%${search}%` };
        const usesAgg = /string_agg|count|sum|min|max|avg/i.test(expr);

        if (usesAgg) qb.having(`${expr} ILIKE :s`, param);
        else         qb.where (`${expr} ILIKE :s`, param);
      } else {
        qb.where(
          `(book.title ILIKE :s
            OR book.description ILIKE :s
            OR book.phys_desc ILIKE :s
            OR book.series    ILIKE :s
            OR book.edit      ILIKE :s
            OR a.last_name    ILIKE :s
            OR a.first_name   ILIKE :s
            OR a.patronymic   ILIKE :s)`,
          { s: `%${search}%` },
        );
      }
    }

    if (onlyIssued) {
      qb.andWhere(`
        EXISTS (
          SELECT 1
          FROM book_copy bc2
          JOIN borrow_record br2
            ON br2.book_copy_id = bc2.id
           AND br2.return_date IS NULL
          WHERE bc2.book_id = book.id
        )
      `);
    }

    if (onlyAvailable) {
      qb.andWhere(`
        NOT EXISTS (
          SELECT 1
          FROM book_copy bc2
          JOIN borrow_record br2
            ON br2.book_copy_id = bc2.id
           AND br2.return_date IS NULL
          WHERE bc2.book_id = book.id
        )
      `);
    }

    const allowed: Record<string, { col: string; type: 'text' | 'number' }> = {
      title:             { col: 'MIN(book.title)',       type: 'text' },
      description:       { col: 'MIN(book.description)',  type: 'text' },
      authors:           { col: "string_agg(DISTINCT a.last_name, ',')", type: 'text' },
      bookType:          { col: 'MIN(book.type)',        type: 'text' },
      edit:              { col: 'MIN(book.edit)',        type: 'text' },
      series:            { col: 'MIN(book.series)',      type: 'text' },
      physDesc:          { col: 'MIN(book.phys_desc)',   type: 'text' },
      bbks:              { col: "string_agg(DISTINCT bbk.bbk_abb, ',')",  type: 'text' },
      udcs:              { col: "string_agg(DISTINCT udc.udc_abb, ',')",  type: 'text' },
      grntis:            { col: "string_agg(DISTINCT grnti.grnti_code, ',')", type: 'text' },
      bbkRaws:           { col: "string_agg(DISTINCT bbr.bbk_code, ',')", type: 'text' },
      udcRaws:           { col: "string_agg(DISTINCT udr.udc_code, ',')", type: 'text' },
      grntiRaws:         { col: "string_agg(DISTINCT grr.grnti_code, ',')", type: 'text' },
      grntiAbbs:  { col: "string_agg(DISTINCT grnti.grnti_code, ',')", type: 'text' },
      publicationPlaces: { col: "string_agg(DISTINCT concat_ws(' ', pp.city, pub.name, pp.pub_year), ',')", type: 'text' },
      id:                { col: 'book.id', type: 'number' },
    };

    const [field, dirRaw] = sort.split('.');
    if (allowed[field]) {
      const { col, type } = allowed[field];
      const dir: 'ASC' | 'DESC' = dirRaw === 'desc' ? 'DESC' : 'ASC';
      if (type === 'text') {
        qb.orderBy(`CASE WHEN ${col} ~ '^[A-ZА-Я]' THEN 0 ELSE 1 END`, 'ASC')
          .addOrderBy(`LOWER(${col})`, dir);
      } else qb.orderBy(col, dir);
    } else qb.orderBy('book.id', 'ASC');

    const total = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'cnt')
      .from('(' + qb.getQuery() + ')', 'sub')
      .setParameters(qb.getParameters())
      .getRawOne<{ cnt: string }>()
      .then(r => Number(r.cnt));

    const ids = await qb.clone()
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<{ id: number }>()
      .then(rows => rows.map(r => r.id));

    if (!ids.length) {
      return { data: [], total, page, limit };
    }

    const books = await this.bookRepo.find({
      where: { id: In(ids) },
      relations: [
        'bookCopies', 'bookCopies.borrowRecords',
        'authors', 'bbks', 'udcs', 'grntis',
        'bbkRaws', 'udcRaws', 'grntiRaws',
        'publicationPlaces', 'publicationPlaces.publisher',
      ],
    });

    const byId = new Map<number, Book>(books.map(b => [b.id, b]));
    return {
      data : ids.map(id => byId.get(id)!),
      total,
      page,
      limit,
    };
  }

  async findOneWithRelations(id: number) {
    const book = await this.bookRepo.findOne({
      where: { id },
      relations: [
        'bookCopies', 'bookCopies.borrowRecords',
        'authors', 'bbks', 'udcs', 'grntis',
        'bbkRaws', 'udcRaws', 'grntiRaws',
        'publicationPlaces', 'publicationPlaces.publisher',
      ],
    });
    if (!book) throw new NotFoundException('Книга не найдена');
    return book;
  }

  create(data: Partial<Book>) {
    return this.bookRepo.save(this.bookRepo.create(data));
  }

  async update(
    id: number,
    dto: Partial<Book> & {
      authorsIds?:    number[];
      bbkAbbs?:       string[];
      udcAbbs?:       string[];
      grntiCodes?:    string[];
      bbkRawCodes?:   string[];
      udcRawCodes?:   string[];
      grntiRawCodes?: string[];
      pubPlaces?:     { city?: string; publisherName?: string; pubYear?: number }[];
    },
  ) {
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const book = await qr.manager.findOne(Book, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!book) throw new NotFoundException('Книга не найдена');

      const bookWithRelations = await qr.manager.findOne(Book, {
        where: { id },
        relations: [
          'authors', 'bbks', 'udcs', 'grntis',
          'bbkRaws', 'udcRaws', 'grntiRaws',
          'publicationPlaces', 'publicationPlaces.publisher',
        ],
      });
      if (!bookWithRelations) throw new NotFoundException('Книга не найдена');

      const scalarFields = [
        'title', 'bookType', 'edit', 'editionStatement',
        'series', 'physDesc', 'description',
      ] as const;
      scalarFields.forEach(key => {
        if (key in dto) (bookWithRelations as any)[key] = (dto as any)[key] ?? null;
      });

      if (dto.authorsIds && dto.authorsIds.length) {
        const authors = await qr.manager.find(Author, {
          where: { id: In(dto.authorsIds) },
        });
        if (authors.length !== dto.authorsIds.length) {
          throw new BadRequestException(`Найдено ${authors.length} авторов из ${dto.authorsIds.length}. Проверьте ID авторов.`);
        }
        bookWithRelations.authors = authors;
      }

      const syncCodes = async <T>(
        repo: Repository<T>,
        field: string,
        codes?: string[],
      ): Promise<T[] | undefined> => {
        if (!codes?.length) return undefined;
        const unique = [...new Set(codes.filter(Boolean))];
        const existed = await repo.find({ where: { [field]: In(unique) } as any });
        const toCreate = unique.filter(c => !existed.find((e: any) => e[field] === c));
        const created = await repo.save(toCreate.map(code => ({ [field]: code } as any)));
        return [...existed, ...created];
      };

      if (dto.bbkAbbs)   bookWithRelations.bbks   = await syncCodes(this.bbkRepo,   'bbkAbb', dto.bbkAbbs)    ?? bookWithRelations.bbks;
      if (dto.udcAbbs)   bookWithRelations.udcs   = await syncCodes(this.udcRepo,   'udcAbb', dto.udcAbbs)    ?? bookWithRelations.udcs;
      if (dto.grntiCodes)bookWithRelations.grntis = await syncCodes(this.grntiRepo, 'code',   dto.grntiCodes) ?? bookWithRelations.grntis;

      const removeRawCodes = async <RawEnt>(
        raws: RawEnt[] | undefined,
        repo: Repository<RawEnt>,
      ) => {
        if (raws?.length) {
          await qr.manager.remove(repo.target as any, raws);
        }
      };

      if (dto.bbkRawCodes) {
        await removeRawCodes(bookWithRelations.bbkRaws, this.bbkRawRepo);
        bookWithRelations.bbkRaws = dto.bbkRawCodes
          .filter(Boolean)
          .map(code => qr.manager.create(BookBbkRaw, { book: bookWithRelations, bbkCode: code }));
      }

      if (dto.udcRawCodes) {
        await removeRawCodes(bookWithRelations.udcRaws, this.udcRawRepo);
        bookWithRelations.udcRaws = dto.udcRawCodes
          .filter(Boolean)
          .map(code => qr.manager.create(BookUdcRaw, { book: bookWithRelations, udcCode: code }));
      }

      if (dto.grntiRawCodes) {
        await removeRawCodes(bookWithRelations.grntiRaws, this.grntiRawRepo);
        bookWithRelations.grntiRaws = dto.grntiRawCodes
          .filter(Boolean)
          .map(code => qr.manager.create(BookGrntiRaw, { book: bookWithRelations, grntiCode: code }));
      }

      if (dto.pubPlaces?.length) {
        const { city, publisherName, pubYear } = dto.pubPlaces[0];

        if (bookWithRelations.publicationPlaces?.length) {
          await qr.manager.remove(BookPubPlace, bookWithRelations.publicationPlaces);
          bookWithRelations.publicationPlaces = [];
        }

        let publisher: Publisher | null = null;
        if (publisherName) {
          publisher = await qr.manager.findOne(Publisher, { where: { name: publisherName } });
          if (!publisher) publisher = await qr.manager.save(Publisher, { name: publisherName });
        }

        const newPlace = qr.manager.create(BookPubPlace, {
          book: bookWithRelations,
          city:    city    || null,
          pubYear: pubYear || null,
          publisher,
        });
        bookWithRelations.publicationPlaces = [newPlace];
      }

      await qr.manager.save(Book, bookWithRelations);
      await qr.commitTransaction();
      return this.findOneWithRelations(id);
    } catch (err) {
      await qr.rollbackTransaction();
      throw err instanceof NotFoundException || err instanceof BadRequestException
        ? err
        : new BadRequestException('Ошибка при обновлении книги');
    } finally {
      await qr.release();
    }
  }

  async remove(id: number) {
    const exists = await this.bookRepo.exist({ where: { id } });
    if (!exists) throw new NotFoundException('Книга не найдена');
    await this.bookRepo.delete(id);
  }
}