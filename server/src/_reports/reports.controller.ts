import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';

export interface UdcProvisionDto {
  udcAbb: string;
  description: string | null;
  booksCount: number;
  copiesCount: number;
}

export interface NoCopiesDto {
  id: number;
  title: string;
  copiesCount: number;
  borrowedNow: number;
  reason: 'выданы' | 'списаны';
}

@Controller('reports')
@UseGuards(AuthGuard('jwt'))
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('unreturned')
  getUnreturned() {
    return this.reportsService.getUnreturned();
  }

  @Get('no-copies')
  getBooksWithoutCopies(): Promise<NoCopiesDto[]> {
    return this.reportsService.getBooksWithoutCopies();
  }

  @Get('udc-provision')
  getUdcProvision(): Promise<UdcProvisionDto[]> {
    return this.reportsService.getUdcProvision();
  }
}