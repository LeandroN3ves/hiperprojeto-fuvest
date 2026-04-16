import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Usuario } from './usuario.entity';

@Entity('estatisticas')
export class Estatistica {
  @PrimaryColumn()
  usuario_id: string;

  @PrimaryColumn({ length: 150 })
  tema: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ default: 0 })
  acertos: number;

  @Column({ default: 0 })
  erros: number;
}
