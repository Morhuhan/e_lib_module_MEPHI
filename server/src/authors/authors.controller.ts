// src/library/controllers/authors.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthorsService } from './authors.service';
import { Author } from './author.entity';

@Controller('authors')
@UseGuards(AuthGuard('jwt'))
export class AuthorsController {
  constructor(private readonly svc: AuthorsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async search(
    @Query('q') q?: string,
    @Query('search') search?: string,
    @Query('searchField') searchField?: string,
  ): Promise<Author[]> {
    return this.svc.search(q ?? search, searchField);
  }

  @Post()
  async create(@Body() payload: Partial<Author>): Promise<Author> {
    return this.svc.create(payload);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: Partial<Author>,
  ): Promise<Author> {
    return this.svc.update(id, payload);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.svc.remove(id);
  }
}