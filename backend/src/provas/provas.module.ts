import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProvasController } from './provas.controller';
import { ProvasService } from './provas.service';
import { ProvasSemanaisService } from './provas-semanais.service';
import { Prova } from '../database/entities/prova.entity';
import { Resposta } from '../database/entities/resposta.entity';
import { Estatistica } from '../database/entities/estatistica.entity';
import { LeaderboardSemanal } from '../database/entities/leaderboard-semanal.entity';
import { QuestoesModule } from '../questoes/questoes.module';
import { CursosModule } from '../cursos/cursos.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Prova, Resposta, Estatistica, LeaderboardSemanal]),
    QuestoesModule,
    CursosModule,
    LeaderboardModule,
  ],
  controllers: [ProvasController],
  providers: [ProvasService, ProvasSemanaisService],
  exports: [ProvasService, ProvasSemanaisService],
})
export class ProvasModule {}
