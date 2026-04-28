import { IsNumber, IsArray, IsString, Min, Max, IsOptional } from 'class-validator';

export class GerarProvaIaDto {
  @IsArray()
  @IsString({ each: true })
  temas: string[];

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(20)
  qtd_questoes?: number = 10;
}
