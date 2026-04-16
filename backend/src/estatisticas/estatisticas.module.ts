import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstatisticasController } from './estatisticas.controller';
import { EstatisticasService } from './estatisticas.service';
import { Estatistica } from '../database/entities/estatistica.entity';
import { Resposta } from '../database/entities/resposta.entity';
import { Prova } from '../database/entities/prova.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Estatistica, Resposta, Prova])],
  controllers: [EstatisticasController],
  providers: [EstatisticasService],
  exports: [EstatisticasService],
})
export class EstatisticasModule {}
