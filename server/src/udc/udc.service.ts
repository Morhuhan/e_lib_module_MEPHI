// src/library/services/udc.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Udc } from './udc.entity';

@Injectable()
export class UdcService {
  constructor(
    @InjectRepository(Udc)
    private readonly repo: Repository<Udc>,
  ) {}

  async search(search?: string, searchField?: string): Promise<Udc[]> {
    const term = (search ?? '').trim().toLowerCase();
    if (!term) return this.repo.find({ order: { udcAbb: 'ASC' } });

    const like = `%${term}%`;

    if (searchField === 'description') {
      return this.repo.find({ where: { description: ILike(like) }, order: { udcAbb: 'ASC' } });
    }
    if (searchField === 'udcAbb') {
      return this.repo.find({ where: { udcAbb: ILike(like) }, order: { udcAbb: 'ASC' } });
    }
    return this.repo.find({
      where: [{ udcAbb: ILike(like) }, { description: ILike(like) }],
      order: { udcAbb: 'ASC' },
    });
  }

  async create(payload: Partial<Udc>): Promise<Udc> {
    return this.repo.save(this.repo.create(payload));
  }

  async update(id: number, payload: Partial<Udc>): Promise<Udc> {
    await this.repo.update(id, payload);
    return this.repo.findOneByOrFail({ id });
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}