import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

import { BorrowRecord } from '../borrow-records/borrow-record.entity';
import { Book } from '../books/book.entity';
import { BookCopy } from '../book-copies/book-copy.entity';
import { Udc } from '../udc/udc.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BorrowRecord, Book, BookCopy, Udc]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}