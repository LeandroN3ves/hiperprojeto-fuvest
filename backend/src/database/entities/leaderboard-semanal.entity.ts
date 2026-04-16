import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Usuario } from './usuario.entity';
import { Curso } from './curso.entity';
import { Prova } from './prova.entity';

@Entity('leaderboard_semanal')
@Unique(['usuario_id', 'curso_id', 'semana'])
export class LeaderboardSemanal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  usuario_id: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column()
  curso_id: number;

  @ManyToOne(() => Curso)
  @JoinColumn({ name: 'curso_id' })
  curso: Curso;

  @Column({ type: 'date' })
  semana: string; // 'YYYY-MM-DD' — sempre segunda-feira da semana

  @Column({ default: 0 })
  acertos: number;

  @Column({ nullable: true })
  prova_id: string;

  @ManyToOne(() => Prova, { nullable: true })
  @JoinColumn({ name: 'prova_id' })
  prova: Prova;
}
