import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardGateway } from './leaderboard.gateway';
import { LeaderboardSemanal } from '../database/entities/leaderboard-semanal.entity';
import { Prova } from '../database/entities/prova.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LeaderboardSemanal, Prova])],
  controllers: [LeaderboardController],
  providers: [LeaderboardService, LeaderboardGateway],
  exports: [LeaderboardGateway],   // exportar para uso no ProvasModule
})
export class LeaderboardModule {}
