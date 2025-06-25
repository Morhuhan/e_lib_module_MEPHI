// src/library/controllers/publishers.controller.ts
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
import { PublishersService } from './publishers.service';
import { Publisher } from './publisher.entity';

@Controller('publishers')
@UseGuards(AuthGuard('jwt'))
export class PublishersController {
  constructor(private readonly svc: PublishersService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async search(
    @Query('q') q?: string,
    @Query('search') search?: string,
    @Query('searchField') searchField?: string,
  ): Promise<Publisher[]> {
    return this.svc.search(q ?? search, searchField);
  }

  @Post()
  async create(@Body() payload: Partial<Publisher>): Promise<Publisher> {
    return this.svc.create(payload);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: Partial<Publisher>,
  ): Promise<Publisher> {
    return this.svc.update(id, payload);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.svc.remove(id);
  }
}