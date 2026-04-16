import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Usuario } from './usuario.entity';
import { Curso } from './curso.entity';

export interface ConfiguracaoProva {
  qtd_questoes: number;
  temas?: string[];
  categoria?: string;
  distribuicao: { facil: number; medio: number; dificil: number };
  questoes_ids: number[]; // IDs na ordem de apresentação
}

@Entity('provas')
export class Prova {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  usuario_id?: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ length: 10, default: 'normal' })
  tipo: string; // 'normal' | 'semanal'

  @Column({ nullable: true })
  curso_id: number;

  @ManyToOne(() => Curso, { nullable: true })
  @JoinColumn({ name: 'curso_id' })
  curso: Curso;

  @Column({ type: 'jsonb', nullable: true })
  configuracao: ConfiguracaoProva;

  @Column({ default: false })
  finalizada: boolean;

  @CreateDateColumn()
  created_at: Date;
}
