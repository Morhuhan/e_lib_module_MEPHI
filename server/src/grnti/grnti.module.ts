import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GrntiService } from './grnti.service';
import { Grnti } from './grnti.entity';
import { GrntiController } from './grnti.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Grnti])],
  controllers: [GrntiController],
  providers: [GrntiService],
})
export class GrntiModule {}