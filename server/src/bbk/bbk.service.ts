// src/library/services/bbk.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Bbk } from './bbk.entity';

@Injectable()
export class BbkService {
  constructor(
    @InjectRepository(Bbk)
    private readonly repo: Repository<Bbk>,
  ) {}

  async search(search?: string, searchField?: string): Promise<Bbk[]> {
    const term = (search ?? '').trim().toLowerCase();
    if (!term) return this.repo.find({ order: { bbkAbb: 'ASC' } });

    const like = `%${term}%`;

    if (searchField === 'description') {
      return this.repo.find({ where: { description: ILike(like) }, order: { bbkAbb: 'ASC' } });
    }
    if (searchField === 'bbkAbb') {
      return this.repo.find({ where: { bbkAbb: ILike(like) }, order: { bbkAbb: 'ASC' } });
    }
    return this.repo.find({
      where: [{ bbkAbb: ILike(like) }, { description: ILike(like) }],
      order: { bbkAbb: 'ASC' },
    });
  }

  async create(payload: Partial<Bbk>): Promise<Bbk> {
    return this.repo.save(this.repo.create(payload));
  }

  async update(id: number, payload: Partial<Bbk>): Promise<Bbk> {
    await this.repo.update(id, payload);
    return this.repo.findOneByOrFail({ id });
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}