import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { CursoTema } from './curso-tema.entity';

@Entity('cursos')
export class Curso {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 100 })
  nome: string;

  @Column({ nullable: true, type: 'text' })
  descricao: string;

  @OneToMany(() => CursoTema, (ct) => ct.curso, { eager: true })
  temas: CursoTema[];
}
