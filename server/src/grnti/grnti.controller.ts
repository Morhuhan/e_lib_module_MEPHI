// src/library/controllers/grnti.controller.ts
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
import { GrntiService } from './grnti.service';
import { Grnti } from './grnti.entity';

@Controller('grnti')
@UseGuards(AuthGuard('jwt'))
export class GrntiController {
  constructor(private readonly svc: GrntiService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async search(
    @Query('q') q?: string,
    @Query('search') search?: string,
    @Query('searchField') searchField?: string,
  ): Promise<Grnti[]> {
    return this.svc.search(q ?? search, searchField);
  }

  @Post()
  async create(@Body() payload: Partial<Grnti>): Promise<Grnti> {
    return this.svc.create(payload);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: Partial<Grnti>,
  ): Promise<Grnti> {
    return this.svc.update(id, payload);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.svc.remove(id);
  }
}