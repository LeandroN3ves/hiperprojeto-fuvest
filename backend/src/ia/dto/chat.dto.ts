import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class MensagemHistoricoDto {
  @IsString()
  role: 'user' | 'assistant';

  @IsString()
  content: string;
}

export class ChatDto {
  @IsString()
  mensagem: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MensagemHistoricoDto)
  historico?: MensagemHistoricoDto[];
}
