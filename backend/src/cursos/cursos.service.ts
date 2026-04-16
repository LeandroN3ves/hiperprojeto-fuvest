import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Curso } from '../database/entities/curso.entity';

@Injectable()
export class CursosService {
  constructor(
    @InjectRepository(Curso)
    private cursoRepo: Repository<Curso>,
  ) {}

  findAll(): Promise<Curso[]> {
    return this.cursoRepo.find({ relations: ['temas'] });
  }

  findById(id: number): Promise<Curso | null> {
    return this.cursoRepo.findOne({ where: { id }, relations: ['temas'] });
  }

  getTemasDoCurso(cursoId: number): Promise<string[]> {
    return this.cursoRepo
      .findOne({ where: { id: cursoId }, relations: ['temas'] })
      .then((c) => c?.temas.map((t) => t.tema) ?? []);
  }
}
