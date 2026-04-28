import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IaController } from './ia.controller';
import { IaService } from './ia.service';
import { FallbackRegrasService } from './fallback/regras.service';
import { Estatistica } from '../database/entities/estatistica.entity';
import { Questao } from '../database/entities/questao.entity';
import { Prova } from '../database/entities/prova.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Estatistica, Questao, Prova])],
  controllers: [IaController],
  providers: [IaService, FallbackRegrasService],
  exports: [IaService],
})
export class IaModule {}

