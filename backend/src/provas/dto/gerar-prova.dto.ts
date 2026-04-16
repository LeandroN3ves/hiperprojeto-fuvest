import { IsNumber, IsOptional, IsArray, IsString, IsObject, Min, Max } from 'class-validator';

export class DistribuicaoDificuldade {
  @IsNumber() facil: number;   // percentual 0-100
  @IsNumber() medio: number;
  @IsNumber() dificil: number;
}

export class GerarProvaDto {
  @IsNumber()
  @Min(5)
  @Max(60)
  qtd_questoes: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  temas?: string[];

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsObject()
  distribuicao: DistribuicaoDificuldade;
}
