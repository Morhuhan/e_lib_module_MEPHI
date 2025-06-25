// src/library/services/publishers.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Publisher } from './publisher.entity';

@Injectable()
export class PublishersService {
  constructor(
    @InjectRepository(Publisher)
    private readonly repo: Repository<Publisher>,
  ) {}

  async search(search?: string, _field?: string): Promise<Publisher[]> {
    const term = (search ?? '').trim();
    if (!term) return this.repo.find({ order: { name: 'ASC' } });

    return this.repo.find({
      where: { name: ILike(`%${term}%`) },
      order: { name: 'ASC' },
    });
  }

  async create(payload: Partial<Publisher>): Promise<Publisher> {
    return this.repo.save(this.repo.create(payload));
  }

  async update(id: number, payload: Partial<Publisher>): Promise<Publisher> {
    await this.repo.update(id, payload);
    return this.repo.findOneByOrFail({ id });
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }

  async findByIds(ids: number[]): Promise<Publisher[]> {
    if (!ids?.length) return [];
    return this.repo.findBy({ id: ids as any });
  }
}