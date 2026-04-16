import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Curso } from './curso.entity';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  nome: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ nullable: true, length: 255, select: false })
  senha: string; // nullable para usuários OAuth

  @Column({ default: 'local', length: 20 })
  provider: string; // 'local' | 'google'

  @Column({ nullable: true })
  curso_id: number;

  @ManyToOne(() => Curso, { nullable: true, eager: true })
  @JoinColumn({ name: 'curso_id' })
  curso: Curso;

  @CreateDateColumn()
  created_at: Date;
}
