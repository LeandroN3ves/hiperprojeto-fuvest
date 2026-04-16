import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestoesService } from './questoes.service';
import { QuestoesController } from './questoes.controller';
import { Questao } from '../database/entities/questao.entity';
import { FuvestImporterService } from './fuvest-importer.service';
import { IaModule } from '../ia/ia.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Questao]),
    IaModule,
  ],
  controllers: [QuestoesController],
  providers: [QuestoesService, FuvestImporterService],
  exports: [QuestoesService, FuvestImporterService],
})
export class QuestoesModule {}
