// src/library/controllers/bbk.controller.ts
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
import { BbkService } from './bbk.service';
import { Bbk } from './bbk.entity';

@Controller('bbk')
@UseGuards(AuthGuard('jwt'))
export class BbkController {
  constructor(private readonly svc: BbkService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async search(
    @Query('q') q?: string,
    @Query('search') search?: string,
    @Query('searchField') searchField?: string,
  ): Promise<Bbk[]> {
    return this.svc.search(q ?? search, searchField);
  }

  @Post()
  async create(@Body() payload: Partial<Bbk>): Promise<Bbk> {
    return this.svc.create(payload);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: Partial<Bbk>,
  ): Promise<Bbk> {
    return this.svc.update(id, payload);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.svc.remove(id);
  }
}