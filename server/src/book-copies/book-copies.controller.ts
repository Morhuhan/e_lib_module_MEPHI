import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
  ValidationPipe,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BookCopy } from './book-copy.entity';
import { BookCopiesService } from './book-copies.service';

@Controller('book-copies')
@UseGuards(AuthGuard('jwt'))
export class BookCopiesController {
  constructor(private readonly copies: BookCopiesService) {}

  /* ---------- статические маршруты ---------- */
  @Get('paginated')
  getPaginated(
    @Query('search') search = '',
    @Query('searchColumn') searchColumn = '',
    @Query('onlyAvailable', new DefaultValuePipe(false), ParseBoolPipe)
    onlyAvailable: boolean,
    @Query('onlyIssued', new DefaultValuePipe(false), ParseBoolPipe)
    onlyIssued: boolean,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('sort') sort = '',
  ) {
    return this.copies.findPaginated(
      search,
      searchColumn,
      onlyAvailable,
      onlyIssued,
      page,
      limit,
      sort,
    );
  }

  @Get('find/by-inventory')
  async findByInventoryNo(@Query('number') number: string) {
    const copy = await this.copies.findByInventoryNo(number);
    if (!copy) throw new NotFoundException('Экземпляр не найден');
    return copy;
  }

  /* ---------- НОВЫЙ ЭНДПОИНТ: свободные/все копии книги ---------- */
  @Get('by-book/:bookId(\\d+)')
  findByBook(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Query('onlyFree', new DefaultValuePipe(false), ParseBoolPipe)
    onlyFree: boolean,
  ) {
    return this.copies.findByBook(bookId, onlyFree);
  }

  /* ---------- стандартные маршруты ---------- */
  @Get()
  findAll() {
    return this.copies.findAll();
  }

  @Get(':id(\\d+)')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.copies.findOne(id);
  }

  /* ---------- CRUD ---------- */
  @Post()
  create(
    @Body(new ValidationPipe({ whitelist: true }))
    dto: Partial<BookCopy> & { bookId?: number },
  ) {
    if (dto.bookId) {
      dto.book = { id: dto.bookId } as any;
      delete (dto as any).bookId;
    }
    return this.copies.create(dto);
  }

  @Put(':id(\\d+)')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ whitelist: true })) dto: Partial<BookCopy>,
  ) {
    const updated = await this.copies.update(id, dto);
    if (!updated) throw new NotFoundException('Экземпляр не найден');
    return updated;
  }

  @Delete(':id(\\d+)')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.copies.remove(id);
  }
}