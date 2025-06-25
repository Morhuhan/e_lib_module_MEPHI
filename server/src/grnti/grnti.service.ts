// src/library/services/grnti.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Grnti } from './grnti.entity';

@Injectable()
export class GrntiService {
  constructor(
    @InjectRepository(Grnti)
    private readonly repo: Repository<Grnti>,
  ) {}

  async search(search?: string, searchField?: string): Promise<Grnti[]> {
    const term = (search ?? '').trim().toLowerCase();
    if (!term) return this.repo.find({ order: { code: 'ASC' } });

    const like = `%${term}%`;

    if (searchField === 'description') {
      return this.repo.find({ where: { description: ILike(like) }, order: { code: 'ASC' } });
    }
    if (searchField === 'code') {
      return this.repo.find({ where: { code: ILike(like) }, order: { code: 'ASC' } });
    }
    return this.repo.find({
      where: [{ code: ILike(like) }, { description: ILike(like) }],
      order: { code: 'ASC' },
    });
  }

  async create(payload: Partial<Grnti>): Promise<Grnti> {
    return this.repo.save(this.repo.create(payload));
  }

  async update(id: number, payload: Partial<Grnti>): Promise<Grnti> {
    await this.repo.update(id, payload);
    return this.repo.findOneByOrFail({ id });
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}