import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Curso } from './curso.entity';

@Entity('cursos_temas')
export class CursoTema {
  @PrimaryColumn()
  curso_id: number;

  @PrimaryColumn({ length: 150 })
  tema: string;

  @ManyToOne(() => Curso, (curso) => curso.temas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'curso_id' })
  curso: Curso;
}
