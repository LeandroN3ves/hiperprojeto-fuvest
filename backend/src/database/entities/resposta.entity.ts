import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Usuario } from './usuario.entity';
import { Questao } from './questao.entity';
import { Prova } from './prova.entity';

@Entity('respostas')
export class Resposta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  usuario_id: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column()
  questao_id: number;

  @ManyToOne(() => Questao)
  @JoinColumn({ name: 'questao_id' })
  questao: Questao;

  @Column()
  prova_id: string;

  @ManyToOne(() => Prova, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'prova_id' })
  prova: Prova;

  @Column({ length: 1 })
  resposta: string;

  @Column()
  correta: boolean;

  @CreateDateColumn()
  respondida_em: Date;
}
