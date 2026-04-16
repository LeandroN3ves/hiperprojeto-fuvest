import { IsEmail, IsNotEmpty, IsOptional, IsNumber, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterDto {
  @IsNotEmpty()
  nome: string;

  @IsEmail()
  email: string;

  @MinLength(6)
  senha: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  curso_id?: number;
}
