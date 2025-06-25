// src/library/services/authors.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { Author } from './author.entity';

@Injectable()
export class AuthorsService {
  constructor(
    @InjectRepository(Author)
    private readonly repo: Repository<Author>,
  ) {}

  async search(search?: string, searchField?: string): Promise<Author[]> {
    const term = (search ?? '').trim().toLowerCase();
    const qb   = this.repo.createQueryBuilder('a');

    if (term) {
      const like = `%${term}%`;

      if (searchField === 'lastName') {
        qb.where('LOWER(a.last_name) LIKE :like', { like });
      } else if (searchField === 'firstName') {
        qb.where('LOWER(a.first_name) LIKE :like', { like });
      } else if (searchField === 'patronymic') {
        qb.where('LOWER(a.patronymic) LIKE :like', { like });
      } else if (searchField === 'birthYear') {
        qb.where("CAST(a.birth_year AS TEXT) LIKE :like", { like });
      } else {
        qb.where(
          new Brackets((sub) => {
            sub
              .where('LOWER(a.last_name) LIKE :like', { like })
              .orWhere('LOWER(a.first_name) LIKE :like', { like })
              .orWhere('LOWER(a.patronymic) LIKE :like', { like })
              .orWhere("CAST(a.birth_year AS TEXT) LIKE :like", { like });
          }),
        );
      }
    }

    return qb.orderBy('a.last_name', 'ASC').addOrderBy('a.first_name', 'ASC').getMany();
  }

  async create(payload: Partial<Author>): Promise<Author> {
    return this.repo.save(this.repo.create(payload));
  }

  async update(id: number, payload: Partial<Author>): Promise<Author> {
    await this.repo.update(id, payload);
    return this.repo.findOneByOrFail({ id });
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }

  async findByIds(ids: number[]): Promise<Author[]> {
    if (!ids?.length) return [];
    return this.repo.find({ where: { id: In(ids) } });
  }
}