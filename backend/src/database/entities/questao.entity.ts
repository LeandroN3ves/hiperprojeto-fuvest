import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('questoes')
export class Questao {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  enunciado: string;

  // Estrutura: [{ "letra": "A", "texto": "..." }, ...]
  @Column({ type: 'jsonb' })
  alternativas: { letra: string; texto: string }[];

  @Column({ length: 1 })
  resposta_correta: string; // 'A' | 'B' | 'C' | 'D' | 'E'

  @Column({ nullable: true, length: 150 })
  tema: string;

  @Column({ nullable: true, length: 50 })
  categoria: string; // 'Exatas' | 'Humanas' | 'Biologicas'

  @Column({ nullable: true })
  ano_fuvest: number;

  @Column({ nullable: true, type: 'text' })
  imagem_url: string;

  @Column({ nullable: true, type: 'text' })
  explicacao: string;

  @Column({ default: false })
  classificado: boolean;

  @Column({ default: false })
  gerada_por_ia: boolean;

  @Column({ nullable: true })
  usuario_id_gerador: string;
}
