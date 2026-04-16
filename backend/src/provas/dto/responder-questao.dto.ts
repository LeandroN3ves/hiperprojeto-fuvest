import { IsNumber, IsString, Length } from 'class-validator';

export class ResponderQuestaoDto {
  @IsNumber()
  questao_id: number;

  @IsString()
  @Length(1, 1)
  resposta: string; // 'A' | 'B' | 'C' | 'D' | 'E'
}
