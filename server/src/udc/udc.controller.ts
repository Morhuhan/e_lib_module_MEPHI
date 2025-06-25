// src/library/controllers/udc.controller.ts
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
import { UdcService } from './udc.service';
import { Udc } from './udc.entity';

@Controller('udc')
@UseGuards(AuthGuard('jwt'))
export class UdcController {
  constructor(private readonly svc: UdcService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async search(
    @Query('q') q?: string,
    @Query('search') search?: string,
    @Query('searchField') searchField?: string,
  ): Promise<Udc[]> {
    return this.svc.search(q ?? search, searchField);
  }

  @Post()
  async create(@Body() payload: Partial<Udc>): Promise<Udc> {
    return this.svc.create(payload);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: Partial<Udc>,
  ): Promise<Udc> {
    return this.svc.update(id, payload);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.svc.remove(id);
  }
}